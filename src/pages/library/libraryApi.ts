import { supabase } from '@/core/supabase/client'
import { foilPodleId, type DruhDila, type KatalogDilo, type VekovaHranice } from './libraryTypes'

// ==========================================
// Library — čtení katalogu z Supabase. Smí se číst jen zveřejněná díla
// (RLS to hlídá v databázi, tohle je jen filtr navíc). Cokoli selže, vrací
// se prázdný seznam — appka pak ukáže ukázkové tituly; cloud je doplněk,
// ne podmínka běhu.
// ==========================================

interface RadekDila {
  id: string
  kind: DruhDila
  title: string
  summary: string
  author_name: string
  cover_path: string | null
  age_rating: VekovaHranice
  license: string
  genres: string[] | null
}

export const urlObalky = (cesta: string | null): string | null => {
  if (!cesta || !supabase) return null
  return supabase.storage.from('library-covers').getPublicUrl(cesta).data.publicUrl
}

export const dilaZRadku = (radky: readonly RadekDila[]): KatalogDilo[] =>
  radky.map((r) => ({
    id: r.id,
    zdroj: 'katalog' as const,
    druh: r.kind,
    title: r.title,
    summary: r.summary,
    autor: r.author_name,
    coverUrl: urlObalky(r.cover_path),
    foil: foilPodleId(r.id),
    vek: r.age_rating,
    licence: r.license,
    zanry: r.genres ?? [],
  }))

export async function nactiKatalog(): Promise<KatalogDilo[]> {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from('library_works')
      .select('id, kind, title, summary, author_name, cover_path, age_rating, license, genres')
      .eq('status', 'zverejneno')
      .order('featured_at', { ascending: false, nullsFirst: false })
      .order('published_at', { ascending: false })
      .limit(200)
    if (error || !data) return []
    return dilaZRadku(data as RadekDila[])
  } catch {
    return []
  }
}
