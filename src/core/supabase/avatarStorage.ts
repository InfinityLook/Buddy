import { supabase } from './client'
import { fileToResizedBlob } from '@/utils/image'

// ==========================================
// Skutečná fotka profilu, viditelná i ostatním v Social — na rozdíl
// od profile.avatar v core/store (ProfilModule.tsx), což je jen lokální
// data URI v secureStorage a nikdy nikam neopouští zařízení (viz
// core/supabase/types.ts's komentář u CloudSnapshot).
//
// Cesta v bucketu je vždycky "<user_id>/avatar.jpg" — pevné jméno, ne
// jméno souboru + timestamp, takže nová fotka starou v Storage přepíše
// (upsert: true), a v bucketu se nehromadí staré verze bez využití.
//
// Bucket "avatary" je veřejný (viz migrace social_faze2_avatar_storage_a_bio) —
// stejná úroveň citlivosti jako jméno+foto, co appka už ukazuje přes
// hledání podle jména. Nahrát/přepsat/smazat smí jen vlastník, to hlídá
// RLS na storage.objects, ne tenhle soubor.
// ==========================================

const BUCKET = 'avatary'

/**
 * Zmenší vybraný soubor a nahraje ho do Storage, pak zapíše veřejnou
 * URL do profiles.avatar_url (self-row UPDATE, RLS to už pouští).
 * Vrací výslednou URL, nebo null při jakémkoli selhání — appka bez
 * cloudové fotky funguje dál stejně jako dřív, jen s lokálním avatarem.
 */
export const nahrajAvatarDoCloudu = async (file: File): Promise<string | null> => {
  if (!supabase) return null

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return null

  try {
    const blob = await fileToResizedBlob(file)
    const cesta = `${ja}/avatar.jpg`

    const { error: nahraniError } = await supabase.storage
      .from(BUCKET)
      .upload(cesta, blob, { contentType: 'image/jpeg', upsert: true })
    if (nahraniError) throw nahraniError

    const { data: verejna } = supabase.storage.from(BUCKET).getPublicUrl(cesta)
    // Cache-buster v query stringu — stejná cesta jako u předchozí fotky
    // by jinak zůstala v prohlížečově/CDN cache i po přepsání souboru.
    const url = `${verejna.publicUrl}?v=${Date.now()}`

    const { error: profilError } = await supabase
      .from('profiles')
      .update({ avatar_url: url })
      .eq('id', ja)
    if (profilError) throw profilError

    return url
  } catch (error) {
    console.warn('Nahrání fotky profilu do cloudu se nepovedlo:', error)
    return null
  }
}
