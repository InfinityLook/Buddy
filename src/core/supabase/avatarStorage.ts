import { supabase } from './client'
import { fileToResizedBlob } from '@/utils/image'

// ==========================================
// Skutečná fotka profilu a cover fotka (banner), viditelné i ostatním
// v Social — na rozdíl od profile.avatar v core/store (ProfilModule.tsx),
// což je jen lokální data URI v secureStorage a nikdy nikam neopouští
// zařízení (viz core/supabase/types.ts's komentář u CloudSnapshot).
//
// Cesta v bucketu je vždycky "<user_id>/avatar.jpg" nebo "<user_id>/banner.jpg" —
// pevné jméno, ne jméno souboru + timestamp, takže nová fotka starou
// v Storage přepíše (upsert: true), a v bucketu se nehromadí staré
// verze bez využití.
//
// Bucket "avatary" je veřejný (viz migrace social_faze2_avatar_storage_a_bio) —
// stejná úroveň citlivosti jako jméno+foto, co appka už ukazuje přes
// hledání podle jména. Nahrát/přepsat/smazat smí jen vlastník, to hlídá
// RLS na storage.objects, ne tenhle soubor.
// ==========================================

const BUCKET = 'avatary'

const mojeId = async (): Promise<string | null> => {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

/**
 * Zmenší vybraný soubor, nahraje ho do Storage pod danou cestou a zapíše
 * veřejnou URL do zadaného sloupce profiles (self-row UPDATE, RLS to už
 * pouští). Sdílený krok pro avatar i banner — liší se jen cílovou cestou,
 * cílovým sloupcem a maximální šířkou (banner je širší formát).
 */
const nahrajDoStorage = async (
  file: File,
  soubor: 'avatar.jpg' | 'banner.jpg',
  sloupec: 'avatar_url' | 'banner_url',
  maxSize: number
): Promise<string | null> => {
  if (!supabase) return null

  const ja = await mojeId()
  if (!ja) return null

  try {
    const blob = await fileToResizedBlob(file, maxSize)
    const cesta = `${ja}/${soubor}`

    const { error: nahraniError } = await supabase.storage
      .from(BUCKET)
      .upload(cesta, blob, { contentType: 'image/jpeg', upsert: true })
    if (nahraniError) throw nahraniError

    const { data: verejna } = supabase.storage.from(BUCKET).getPublicUrl(cesta)
    // Cache-buster v query stringu — stejná cesta jako u předchozí fotky
    // by jinak zůstala v prohlížečově/CDN cache i po přepsání souboru.
    const url = `${verejna.publicUrl}?v=${Date.now()}`

    const { error: profilError } = await supabase.from('profiles').update({ [sloupec]: url }).eq('id', ja)
    if (profilError) throw profilError

    return url
  } catch (error) {
    console.warn(`Nahrání do cloudu (${soubor}) se nepovedlo:`, error)
    return null
  }
}

/** Vrací výslednou URL, nebo null při jakémkoli selhání — appka bez
 *  cloudové fotky funguje dál stejně jako dřív, jen s lokálním avatarem. */
export const nahrajAvatarDoCloudu = (file: File): Promise<string | null> =>
  nahrajDoStorage(file, 'avatar.jpg', 'avatar_url', 512)

/** Banner nemá lokální obdobu jako avatar — appka žádnou coverfotku
 *  offline nikdy neukazovala, takže bez cloudu prostě zůstane prázdný. */
export const nahrajBannerDoCloudu = (file: File): Promise<string | null> =>
  nahrajDoStorage(file, 'banner.jpg', 'banner_url', 1200)
