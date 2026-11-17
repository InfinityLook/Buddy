import { supabase } from '@/core/supabase/client'
import { ocistiBloky, type Kapitola } from './libraryTextTypes'

// ==========================================
// Library — načtení textu díla (zveřejněná verze → kapitoly). RLS pustí
// kapitoly jen k verzi, kterou smím číst. Hotové dílo se drží v paměti,
// ať se nestahuje při každém otevření (trvalá offline kopie je fáze 5).
// ==========================================

export interface TextDilo {
  versionId: string
  kapitoly: Kapitola[]
}

const cache = new Map<string, TextDilo>()

export async function nactiTextDila(workId: string): Promise<TextDilo | null> {
  const hotove = cache.get(workId)
  if (hotove) return hotove
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
    const vysledek = { versionId, kapitoly }
    cache.set(workId, vysledek)
    return vysledek
  } catch {
    return null
  }
}
