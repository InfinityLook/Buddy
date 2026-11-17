import { supabase } from '@/core/supabase/client'
import { ocistiBloky, type Kapitola } from './libraryTextTypes'
import { nactiTextOffline, ulozTextOffline } from './libraryOffline'

// ==========================================
// Library — načtení textu díla (zveřejněná verze → kapitoly). RLS pustí
// kapitoly jen k verzi, kterou smím číst. Pořadí: paměť → síť (a uložit
// offline kopii) → při selhání sítě offline kopie. Bez připojení se jde
// rovnou do offline kopie, ať otevření není pomalé ani čekající na timeout.
// ==========================================

export interface TextDilo {
  versionId: string
  kapitoly: Kapitola[]
  /** Text je z trvalé offline kopie (nepodařilo se ověřit aktuální verzi). */
  zOffline?: boolean
}

const cache = new Map<string, TextDilo>()

const jeOnline = (): boolean => typeof navigator === 'undefined' || navigator.onLine !== false

async function zOfflineKopie(workId: string): Promise<TextDilo | null> {
  const kopie = await nactiTextOffline(workId)
  if (!kopie) return null
  const vysledek: TextDilo = { versionId: kopie.versionId, kapitoly: kopie.kapitoly, zOffline: true }
  cache.set(workId, vysledek)
  return vysledek
}

async function stahniZeSite(workId: string): Promise<TextDilo | null> {
  if (!supabase) return null
  try {
    const { data: dilo, error } = await supabase
      .from('library_works')
      .select('published_version_id')
      .eq('id', workId)
      .maybeSingle()
    const versionId = (dilo as { published_version_id: string | null } | null)?.published_version_id
    if (error || !versionId) return null

    const { data, error: errKap } = await supabase
      .from('library_chapters')
      .select('position, title, blocks')
      .eq('version_id', versionId)
      .order('position', { ascending: true })
    if (errKap || !data) return null

    const kapitoly: Kapitola[] = (data as { position: number; title: string; blocks: unknown }[]).map((r) => ({
      position: r.position,
      title: r.title,
      bloky: ocistiBloky(r.blocks),
    }))
    return { versionId, kapitoly }
  } catch {
    return null
  }
}

export async function nactiTextDila(workId: string): Promise<TextDilo | null> {
  const hotove = cache.get(workId)
  if (hotove) return hotove
  if (!jeOnline()) return zOfflineKopie(workId)

  const zeSite = await stahniZeSite(workId)
  if (zeSite) {
    cache.set(workId, zeSite)
    void ulozTextOffline(workId, zeSite.versionId, zeSite.kapitoly)
    return zeSite
  }
  return zOfflineKopie(workId)
}

/** Stáhne a uloží text pro čtení bez připojení. Vrací true, když je kopie připravená. */
export async function stahnoutOffline(workId: string): Promise<boolean> {
  const zeSite = await stahniZeSite(workId)
  if (!zeSite || zeSite.kapitoly.every((k) => k.bloky.length === 0)) return false
  cache.set(workId, zeSite)
  return ulozTextOffline(workId, zeSite.versionId, zeSite.kapitoly)
}

/** Jen pro testy: zahodí paměťovou cache. */
export const _vyprazdniCacheTextu = () => cache.clear()
