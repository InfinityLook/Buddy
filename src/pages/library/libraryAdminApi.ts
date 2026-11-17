import { supabase } from '@/core/supabase/client'
import { fileToResizedBlob } from '@/utils/image'
import type { EpubVysledek } from './epubImport'
import { spocitejSlova } from './epubImport'
import {
  adminDiloZRadku,
  lzeZverejnit,
  radekZVstupu,
  rozdelDoDavek,
  validujDilo,
  type AdminDilo,
  type DiloVstup,
  type RadekAdminDila,
  type StavDila,
} from './libraryAdminTypes'

// ==========================================
// Library — správa katalogu pro správce. Všechny zápisy jdou přímo do
// library_works/versions/chapters; povoluje je politika jsem_admin(),
// takže podvržená role v prohlížeči nic nezmůže. Změny stavu zapisuje do
// audit_logu trigger v databázi (migrace library_audit), ne tenhle kód.
//
// Pořadí při vytváření díla s obsahem: dílo (koncept) → obálka → verze →
// kapitoly → teprve nakonec zveřejnění. Selže-li cokoli uprostřed, nově
// vytvořené dílo se smaže (cascade odstraní verzi i kapitoly), ať v
// katalogu nezůstane rozdělaná polovina.
// ==========================================

export interface Vysledek<T = undefined> {
  ok: boolean
  chyba?: string
  data?: T
}

const chybaText = (e: unknown): string => {
  if (e && typeof e === 'object') {
    const o = e as { message?: unknown; hint?: unknown }
    if (typeof o.message === 'string' && o.message) return o.message
  }
  return e instanceof Error ? e.message : 'Nepovedlo se to.'
}

const SLOUPCE =
  'id, kind, title, summary, language, genres, age_rating, license, license_url, source_url, attribution, translation_free, author_name, cover_path, status, published_version_id, featured_at, published_at, owner_id, readers_count, rating_count, rating_sum, updated_at'

export async function nactiDilaAdmin(): Promise<AdminDilo[]> {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from('library_works')
      .select(SLOUPCE)
      .order('updated_at', { ascending: false })
      .limit(300)
    if (error || !data) return []
    return (data as RadekAdminDila[]).map(adminDiloZRadku)
  } catch {
    return []
  }
}

async function idPrihlaseneho(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

const priponaObalky = 'jpg'

/** Zmenší obálku (max 600 px) a nahraje ji do veřejného bucketu; vrací cestu k uložení do cover_path. */
async function nahrajObalku(workId: string, zdroj: Blob): Promise<string> {
  if (!supabase) throw new Error('Cloud není nastavený.')
  const soubor = new File([zdroj], 'obalka', { type: zdroj.type || 'image/jpeg' })
  const blob = await fileToResizedBlob(soubor, 600, 0.85)
  // Časová značka v názvu = nový soubor při každé změně, žádné staré obálky v CDN cache.
  const cesta = `katalog/${workId}/obalka-${Date.now()}.${priponaObalky}`
  const { error } = await supabase.storage.from('library-covers').upload(cesta, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (error) throw error
  return cesta
}

async function smazObalkuZeStorage(cesta: string | null): Promise<void> {
  if (!supabase || !cesta) return
  try {
    await supabase.storage.from('library-covers').remove([cesta])
  } catch {
    // zbylý soubor je jen nepoužitý bajt, ne chyba
  }
}

/**
 * Vloží novou verzi textu (schválenou správcem) včetně kapitol. Vrací id
 * verze. Při chybě verzi smaže (cascade odstraní i vložené kapitoly).
 */
async function vlozVerziTextu(workId: string, epub: EpubVysledek, uid: string): Promise<string> {
  if (!supabase) throw new Error('Cloud není nastavený.')
  const { data: posledni } = await supabase
    .from('library_versions')
    .select('version_no')
    .eq('work_id', workId)
    .order('version_no', { ascending: false })
    .limit(1)
    .maybeSingle()
  const cislo = ((posledni as { version_no: number } | null)?.version_no ?? 0) + 1
  const ted = new Date().toISOString()

  const { data: verze, error } = await supabase
    .from('library_versions')
    .insert({
      work_id: workId,
      version_no: cislo,
      format: 'text',
      status: 'schvaleno',
      reviewed_by: uid,
      reviewed_at: ted,
      chapter_count: epub.kapitoly.length,
      word_count: epub.pocetSlov,
      submitted_at: ted,
    })
    .select('id')
    .single()
  if (error || !verze) throw error ?? new Error('Verzi se nepodařilo vytvořit.')
  const versionId = (verze as { id: string }).id

  try {
    const radky = epub.kapitoly.map((k) => ({
      version_id: versionId,
      position: k.position,
      title: k.title,
      blocks: k.bloky,
      word_count: spocitejSlova(k.bloky),
    }))
    for (const davka of rozdelDoDavek(radky)) {
      const { error: errKap } = await supabase.from('library_chapters').insert(davka)
      if (errKap) throw errKap
    }
  } catch (e) {
    await supabase.from('library_versions').delete().eq('id', versionId)
    throw e
  }
  return versionId
}

export interface UlozeniVstup {
  /** Existující dílo k úpravě; chybí = nové dílo. */
  id?: string
  vstup: DiloVstup
  /** Obsah z EPUB → nová verze textu. */
  epub?: EpubVysledek | null
  /** Nová obálka (původní bajty, zmenší se při nahrání). */
  obalka?: Blob | null
  /** Po uložení rovnou zveřejnit (jen s obsahem). */
  zverejnit?: boolean
}

export async function ulozDilo(u: UlozeniVstup): Promise<Vysledek<{ id: string }>> {
  if (!supabase) return { ok: false, chyba: 'Cloud není nastavený.' }
  const chybaFormulare = validujDilo(u.vstup)
  if (chybaFormulare) return { ok: false, chyba: chybaFormulare }
  const uid = await idPrihlaseneho()
  if (!uid) return { ok: false, chyba: 'Nejsi přihlášený.' }

  const jeNove = !u.id
  let workId = u.id ?? ''
  let staraObalka: string | null = null
  let novaObalka: string | null = null

  try {
    if (jeNove) {
      const { data, error } = await supabase
        .from('library_works')
        .insert({ ...radekZVstupu(u.vstup), owner_id: null, created_by: uid, status: 'koncept' })
        .select('id')
        .single()
      if (error || !data) throw error ?? new Error('Dílo se nepodařilo vytvořit.')
      workId = (data as { id: string }).id
    } else {
      const { data: stare } = await supabase
        .from('library_works')
        .select('cover_path')
        .eq('id', workId)
        .maybeSingle()
      staraObalka = (stare as { cover_path: string | null } | null)?.cover_path ?? null
      const { error } = await supabase.from('library_works').update(radekZVstupu(u.vstup)).eq('id', workId)
      if (error) throw error
    }

    const zmeny: Record<string, unknown> = {}

    if (u.obalka) {
      novaObalka = await nahrajObalku(workId, u.obalka)
      zmeny.cover_path = novaObalka
    }

    let novaVerze: string | null = null
    if (u.epub) {
      novaVerze = await vlozVerziTextu(workId, u.epub, uid)
      zmeny.published_version_id = novaVerze
    }

    if (u.zverejnit) {
      const maVerzi = Boolean(novaVerze) || (!jeNove && (await maPublikovanouVerzi(workId)))
      const chyba = lzeZverejnit(maVerzi)
      if (chyba) throw new Error(chyba)
      zmeny.status = 'zverejneno'
      zmeny.published_at = new Date().toISOString()
    }

    if (Object.keys(zmeny).length > 0) {
      const { error } = await supabase.from('library_works').update(zmeny).eq('id', workId)
      if (error) throw error
    }

    if (novaObalka && staraObalka) await smazObalkuZeStorage(staraObalka)
    return { ok: true, data: { id: workId } }
  } catch (e) {
    await smazObalkuZeStorage(novaObalka)
    // Nově založené dílo se při selhání odstraní celé; u úpravy zůstane, co už uloženo je.
    if (jeNove && workId) await supabase.from('library_works').delete().eq('id', workId)
    return { ok: false, chyba: chybaText(e) }
  }
}

async function maPublikovanouVerzi(workId: string): Promise<boolean> {
  if (!supabase) return false
  const { data } = await supabase.from('library_works').select('published_version_id').eq('id', workId).maybeSingle()
  return Boolean((data as { published_version_id: string | null } | null)?.published_version_id)
}

export async function nastavStavDila(dilo: AdminDilo, stav: StavDila): Promise<Vysledek> {
  if (!supabase) return { ok: false, chyba: 'Cloud není nastavený.' }
  if (stav === 'zverejneno') {
    const chyba = lzeZverejnit(Boolean(dilo.publishedVersionId))
    if (chyba) return { ok: false, chyba }
  }
  const zmeny: Record<string, unknown> = { status: stav }
  if (stav === 'zverejneno' && !dilo.publishedAt) zmeny.published_at = new Date().toISOString()
  const { error } = await supabase.from('library_works').update(zmeny).eq('id', dilo.id)
  return error ? { ok: false, chyba: chybaText(error) } : { ok: true }
}

export async function nastavDoporucene(id: string, doporucene: boolean): Promise<Vysledek> {
  if (!supabase) return { ok: false, chyba: 'Cloud není nastavený.' }
  const { error } = await supabase
    .from('library_works')
    .update({ featured_at: doporucene ? new Date().toISOString() : null })
    .eq('id', id)
  return error ? { ok: false, chyba: chybaText(error) } : { ok: true }
}

export async function smazDilo(dilo: AdminDilo): Promise<Vysledek> {
  if (!supabase) return { ok: false, chyba: 'Cloud není nastavený.' }
  const { error } = await supabase.from('library_works').delete().eq('id', dilo.id)
  if (error) return { ok: false, chyba: chybaText(error) }
  await smazObalkuZeStorage(dilo.coverPath)
  return { ok: true }
}
