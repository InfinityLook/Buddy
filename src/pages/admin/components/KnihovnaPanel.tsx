import { BuddyConfirm, type BuddyConfirmation } from '@/components/buddy-ui/BuddyConfirm'
import { SurfaceThemeScope } from '@/features/appearance/SurfaceAppearance'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { EpubChyba, MAX_VELIKOST_EPUB, parsujEpub, type EpubVysledek } from '@/pages/library/epubImport'
import {
  nactiDilaAdmin,
  nastavDoporucene,
  nastavStavDila,
  smazDilo,
  ulozDilo,
} from '@/pages/library/libraryAdminApi'
import {
  DRUHY_DILA,
  LICENCE,
  POPIS_DRUHU,
  POPIS_LICENCE,
  POPIS_STAVU,
  POPIS_VEKU,
  PRAZDNE_DILO,
  STAVY_DILA,
  VEKOVE_HRANICE,
  prumerHodnoceni,
  rozdelZanry,
  type AdminDilo,
  type DiloVstup,
  type StavDila,
} from '@/pages/library/libraryAdminTypes'
import { urlObalky } from '@/pages/library/libraryApi'

// ==========================================
// Knihovna — správa katalogu pro správce: seznam všech děl (i konceptů a
// skrytých), zveřejnění/skrytí, doporučení, smazání a editor s importem
// EPUB. Zápisy jdou přímo do library_works (politika jsem_admin()), tahle
// obrazovka jen usnadňuje ruční vložení volných děl. Moderace děl od
// uživatelů přijde s publikováním z Writer's Room.
// ==========================================

const SOUBOR_OBRAZEK = 'image/jpeg,image/png,image/webp'

const vstupZDila = (d: AdminDilo): DiloVstup => ({
  kind: d.kind,
  title: d.title,
  summary: d.summary,
  language: d.language,
  genres: d.genres,
  ageRating: d.ageRating,
  license: d.license,
  licenseUrl: d.licenseUrl,
  sourceUrl: d.sourceUrl,
  attribution: d.attribution,
  translationFree: d.translationFree,
  authorName: d.authorName,
})

type Rezim = { typ: 'seznam' } | { typ: 'editor'; dilo: AdminDilo | null }

export const KnihovnaPanel: React.FC = () => {
  const [dila, setDila] = useState<AdminDilo[]>([])
  const [nacita, setNacita] = useState(true)
  const [rezim, setRezim] = useState<Rezim>({ typ: 'seznam' })
  const [filtr, setFiltr] = useState<StavDila | 'vse'>('vse')
  const [hlaska, setHlaska] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<BuddyConfirmation | null>(null)

  const oznam = (t: string) => {
    setHlaska(t)
    window.setTimeout(() => setHlaska(null), 3200)
  }

  const nacti = async () => {
    setNacita(true)
    setDila(await nactiDilaAdmin())
    setNacita(false)
  }

  useEffect(() => {
    void nacti()
  }, [])

  const viditelna = useMemo(() => (filtr === 'vse' ? dila : dila.filter((d) => d.status === filtr)), [dila, filtr])

  const zmenitStav = async (d: AdminDilo, stav: StavDila) => {
    const v = await nastavStavDila(d, stav)
    oznam(v.ok ? `„${d.title}“ — ${POPIS_STAVU[stav].toLowerCase()}.` : v.chyba ?? 'Nepovedlo se to.')
    if (v.ok) await nacti()
  }

  const prepnoutDoporucene = async (d: AdminDilo) => {
    const v = await nastavDoporucene(d.id, !d.featuredAt)
    oznam(v.ok ? (d.featuredAt ? 'Doporučení zrušeno.' : `„${d.title}“ je teď doporučené.`) : v.chyba ?? 'Nepovedlo se to.')
    if (v.ok) await nacti()
  }

  const smazat = (d: AdminDilo) =>
    setConfirmation({
      title: `Smazat „${d.title}“?`,
      description:
        'Dílo zmizí z katalogu, uživatelům z polic a smažou se i jejich postup čtení a recenze. Nejde to vrátit.',
      confirmLabel: 'Smazat dílo',
      danger: true,
      action: async () => {
        const v = await smazDilo(d)
        oznam(v.ok ? 'Dílo smazáno.' : v.chyba ?? 'Nepovedlo se to.')
        if (v.ok) await nacti()
        else throw new Error(v.chyba)
      },
    })

  if (rezim.typ === 'editor') {
    return (
      <SurfaceThemeScope surfaceId="admin-system">
        <DiloEditor
          dilo={rezim.dilo}
          onZpet={() => setRezim({ typ: 'seznam' })}
          onUlozeno={async (zprava) => {
            oznam(zprava)
            setRezim({ typ: 'seznam' })
            await nacti()
          }}
        />
        {hlaska && <div className="admin-toast" role="status">{hlaska}</div>}
      </SurfaceThemeScope>
    )
  }

  return (
    <SurfaceThemeScope surfaceId="admin-system">
      <div className="admin-prehled">
        <section className="admin-card">
          <div className="admin-card-head">
            <span className="admin-card-title">Katalog ({dila.length})</span>
            <button className="admin-btn" onClick={() => setRezim({ typ: 'editor', dilo: null })}>
              + Nové dílo
            </button>
          </div>
          <div className="admin-role-toggle" role="group" aria-label="Filtr podle stavu">
            {(['vse', ...STAVY_DILA] as const).map((s) => (
              <button key={s} className={filtr === s ? 'active' : ''} onClick={() => setFiltr(s)}>
                {s === 'vse' ? 'Vše' : POPIS_STAVU[s]}
              </button>
            ))}
          </div>
          {nacita ? (
            <p className="admin-empty">Načítám…</p>
          ) : viditelna.length === 0 ? (
            <p className="admin-empty">
              {dila.length === 0 ? 'Katalog je zatím prázdný. Přidej první dílo.' : 'V tomhle stavu nic není.'}
            </p>
          ) : (
            <div className="admin-dilo-list">
              {viditelna.map((d) => (
                <DiloRadek
                  key={d.id}
                  dilo={d}
                  onUpravit={() => setRezim({ typ: 'editor', dilo: d })}
                  onStav={(s) => void zmenitStav(d, s)}
                  onDoporucit={() => void prepnoutDoporucene(d)}
                  onSmazat={() => smazat(d)}
                />
              ))}
            </div>
          )}
        </section>
        {hlaska && <div className="admin-toast" role="status">{hlaska}</div>}
      </div>
      {confirmation && (
        <BuddyConfirm surfaceId="admin-system" confirmation={confirmation} onClose={() => setConfirmation(null)} />
      )}
    </SurfaceThemeScope>
  )
}

const DiloRadek: React.FC<{
  dilo: AdminDilo
  onUpravit: () => void
  onStav: (s: StavDila) => void
  onDoporucit: () => void
  onSmazat: () => void
}> = ({ dilo, onUpravit, onStav, onDoporucit, onSmazat }) => {
  const obalka = urlObalky(dilo.coverPath)
  const prumer = prumerHodnoceni(dilo)
  return (
    <article className="admin-dilo">
      <div className="admin-dilo-obalka" aria-hidden="true">
        {obalka ? <img src={obalka} alt="" loading="lazy" /> : <span>{dilo.kind === 'komiks' ? '💥' : dilo.kind === 'scenar' ? '🎬' : '📖'}</span>}
      </div>
      <div className="admin-dilo-text">
        <span className="admin-dilo-titul">{dilo.title}</span>
        <span className="admin-dilo-autor">
          {dilo.authorName} · {POPIS_DRUHU[dilo.kind]} · {POPIS_VEKU[dilo.ageRating]}
        </span>
        <span className="admin-dilo-meta">
          <span className={`admin-stav admin-stav--${dilo.status}`}>{POPIS_STAVU[dilo.status]}</span>
          {dilo.featuredAt && <span className="admin-stav admin-stav--doporucene">⭐ Doporučené</span>}
          {dilo.ownerId && <span className="admin-stav">Od uživatele</span>}
          {!dilo.publishedVersionId && <span className="admin-stav admin-stav--bez-obsahu">Bez obsahu</span>}
          <span>
            {dilo.readersCount} čt.{prumer !== null ? ` · ${prumer.toLocaleString('cs-CZ')} ★ (${dilo.ratingCount})` : ''}
          </span>
        </span>
        <span className="admin-dilo-akce">
          <button className="admin-btn admin-btn--tlumene" onClick={onUpravit}>Upravit</button>
          {dilo.status === 'zverejneno' ? (
            <button className="admin-btn admin-btn--ne" onClick={() => onStav('skryto')}>Skrýt</button>
          ) : (
            <button className="admin-btn admin-btn--ano" onClick={() => onStav('zverejneno')}>Zveřejnit</button>
          )}
          {dilo.status === 'zverejneno' && (
            <button className="admin-btn admin-btn--tlumene" onClick={onDoporucit}>
              {dilo.featuredAt ? 'Zrušit ⭐' : '⭐ Doporučit'}
            </button>
          )}
          <button className="admin-btn admin-btn--ne" onClick={onSmazat}>Smazat</button>
        </span>
      </div>
    </article>
  )
}

// ---------- Editor díla ----------

interface EditorProps {
  dilo: AdminDilo | null
  onZpet: () => void
  onUlozeno: (zprava: string) => void | Promise<void>
}

const DiloEditor: React.FC<EditorProps> = ({ dilo, onZpet, onUlozeno }) => {
  const [v, setV] = useState<DiloVstup>(dilo ? vstupZDila(dilo) : PRAZDNE_DILO)
  const [zanryText, setZanryText] = useState((dilo?.genres ?? []).join(', '))
  const [epub, setEpub] = useState<EpubVysledek | null>(null)
  const [epubNazev, setEpubNazev] = useState('')
  const [epubChyba, setEpubChyba] = useState<string | null>(null)
  const [cteEpub, setCteEpub] = useState(false)
  const [vlastniObalka, setVlastniObalka] = useState<Blob | null>(null)
  const [zverejnit, setZverejnit] = useState(false)
  const [uklada, setUklada] = useState(false)
  const [chyba, setChyba] = useState<string | null>(null)
  const [nahledUrl, setNahledUrl] = useState<string | null>(null)
  const nahledRef = useRef<string | null>(null)

  const obalkaKUlozeni = vlastniObalka ?? epub?.obalka ?? null

  // Náhled nové obálky; object URL se vždy uvolní (stejná disciplína jako jinde v appce).
  useEffect(() => {
    if (nahledRef.current) URL.revokeObjectURL(nahledRef.current)
    nahledRef.current = obalkaKUlozeni ? URL.createObjectURL(obalkaKUlozeni) : null
    setNahledUrl(nahledRef.current)
    return () => {
      if (nahledRef.current) URL.revokeObjectURL(nahledRef.current)
      nahledRef.current = null
    }
  }, [obalkaKUlozeni])

  const nastav = <K extends keyof DiloVstup>(k: K, hodnota: DiloVstup[K]) => setV((s) => ({ ...s, [k]: hodnota }))

  const vyberEpub = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const soubor = e.target.files?.[0]
    e.target.value = ''
    if (!soubor) return
    setEpubChyba(null)
    if (soubor.size > MAX_VELIKOST_EPUB) {
      setEpubChyba(`Soubor je příliš velký (limit ${Math.round(MAX_VELIKOST_EPUB / 1024 / 1024)} MB).`)
      return
    }
    setCteEpub(true)
    try {
      const vysledek = await parsujEpub(await soubor.arrayBuffer())
      setEpub(vysledek)
      setEpubNazev(soubor.name)
      // Údaje z EPUBu doplní jen prázdná pole, nic ručně napsaného se nepřepíše.
      setV((s) => ({
        ...s,
        title: s.title.trim() || vysledek.meta.title,
        authorName: s.authorName.trim() || vysledek.meta.author,
        summary: s.summary.trim() || vysledek.meta.description,
        language: dilo || !vysledek.meta.language ? s.language : vysledek.meta.language,
      }))
    } catch (err) {
      setEpub(null)
      setEpubNazev('')
      setEpubChyba(err instanceof EpubChyba ? err.message : 'EPUB se nepodařilo přečíst.')
    } finally {
      setCteEpub(false)
    }
  }

  const ulozit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setChyba(null)
    setUklada(true)
    const vstup = { ...v, genres: rozdelZanry(zanryText) }
    const vysledek = await ulozDilo({
      id: dilo?.id,
      vstup,
      epub,
      obalka: obalkaKUlozeni,
      zverejnit,
    })
    setUklada(false)
    if (!vysledek.ok) {
      setChyba(vysledek.chyba ?? 'Nepovedlo se to.')
      return
    }
    await onUlozeno(dilo ? `„${vstup.title}“ uloženo.` : `Dílo „${vstup.title}“ přidáno.`)
  }

  const maObsah = Boolean(dilo?.publishedVersionId) || Boolean(epub)
  const nahledObalky = nahledUrl ?? urlObalky(dilo?.coverPath ?? null)

  return (
    <form className="admin-prehled" onSubmit={ulozit}>
      <section className="admin-card">
        <div className="admin-card-head">
          <span className="admin-card-title">{dilo ? 'Upravit dílo' : 'Nové dílo'}</span>
          <button type="button" className="admin-btn admin-btn--tlumene" onClick={onZpet}>
            ← Seznam
          </button>
        </div>

        <div className="admin-form-obsah">
          <div className="admin-form-obalka">
            {nahledObalky ? <img src={nahledObalky} alt="Obálka" /> : <span aria-hidden="true">📖</span>}
          </div>
          <div className="admin-form-nahrani">
            <label className="admin-btn admin-btn--tlumene admin-soubor">
              {epub ? 'Změnit EPUB' : dilo ? 'Nahrát novou verzi (EPUB)' : 'Importovat EPUB'}
              <input type="file" accept=".epub,application/epub+zip" onChange={vyberEpub} hidden />
            </label>
            <label className="admin-btn admin-btn--tlumene admin-soubor">
              {nahledObalky ? 'Změnit obálku' : 'Nahrát obálku'}
              <input
                type="file"
                accept={SOUBOR_OBRAZEK}
                onChange={(e) => {
                  setVlastniObalka(e.target.files?.[0] ?? null)
                  e.target.value = ''
                }}
                hidden
              />
            </label>
          </div>
        </div>

        {cteEpub && <p className="admin-empty">Čtu EPUB…</p>}
        {epubChyba && <p className="admin-formular-chyba" role="alert">{epubChyba}</p>}
        {epub && (
          <p className="admin-empty">
            ✅ {epubNazev}: {epub.kapitoly.length} kapitol, {epub.pocetSlov.toLocaleString('cs-CZ')} slov
            {epub.obalka ? ', obálka nalezena' : ', bez obálky'}.
            {epub.varovani.length > 0 && ` Upozornění: ${epub.varovani.slice(0, 3).join(' ')}`}
          </p>
        )}
        {dilo && !epub && (
          <p className="admin-empty">
            {dilo.publishedVersionId
              ? 'Dílo má obsah. Nový EPUB ho nahradí novou verzí.'
              : 'Dílo zatím nemá žádný obsah.'}
          </p>
        )}

        <label className="admin-pole">
          <span>Název</span>
          <input className="admin-hledat-input" value={v.title} maxLength={160} onChange={(e) => nastav('title', e.target.value)} required />
        </label>
        <label className="admin-pole">
          <span>Autor</span>
          <input className="admin-hledat-input" value={v.authorName} maxLength={120} onChange={(e) => nastav('authorName', e.target.value)} required />
        </label>
        <label className="admin-pole">
          <span>Anotace</span>
          <textarea className="admin-hledat-input admin-textarea" rows={4} value={v.summary} maxLength={2000} onChange={(e) => nastav('summary', e.target.value)} />
        </label>

        <div className="admin-pole-radek">
          <label className="admin-pole">
            <span>Druh</span>
            <select className="admin-hledat-input" value={v.kind} onChange={(e) => nastav('kind', e.target.value as DiloVstup['kind'])}>
              {DRUHY_DILA.map((k) => <option key={k} value={k}>{POPIS_DRUHU[k]}</option>)}
            </select>
          </label>
          <label className="admin-pole">
            <span>Věk</span>
            <select className="admin-hledat-input" value={v.ageRating} onChange={(e) => nastav('ageRating', e.target.value as DiloVstup['ageRating'])}>
              {VEKOVE_HRANICE.map((k) => <option key={k} value={k}>{POPIS_VEKU[k]}</option>)}
            </select>
          </label>
          <label className="admin-pole admin-pole--uzke">
            <span>Jazyk</span>
            <input className="admin-hledat-input" value={v.language} maxLength={3} onChange={(e) => nastav('language', e.target.value.toLowerCase())} />
          </label>
        </div>

        <label className="admin-pole">
          <span>Žánry (oddělené čárkou, max. 5)</span>
          <input className="admin-hledat-input" value={zanryText} onChange={(e) => setZanryText(e.target.value)} placeholder="dobrodružné, sci-fi" />
        </label>

        <label className="admin-pole">
          <span>Licence</span>
          <select className="admin-hledat-input" value={v.license} onChange={(e) => nastav('license', e.target.value as DiloVstup['license'])}>
            {LICENCE.map((l) => <option key={l} value={l}>{POPIS_LICENCE[l]}</option>)}
          </select>
        </label>
        {v.license === 'public-domain' && (
          <label className="admin-zaskrtnuti">
            <input
              type="checkbox"
              checked={v.translationFree === true}
              onChange={(e) => nastav('translationFree', e.target.checked ? true : false)}
            />
            <span>Je volný i překlad (autor překladu je 70+ let po smrti nebo ho uvolnil)</span>
          </label>
        )}
        <label className="admin-pole">
          <span>URL licence</span>
          <input className="admin-hledat-input" value={v.licenseUrl} onChange={(e) => nastav('licenseUrl', e.target.value)} placeholder="https://…" inputMode="url" />
        </label>
        <label className="admin-pole">
          <span>URL zdroje (kde dílo vzniklo, např. Project Gutenberg)</span>
          <input className="admin-hledat-input" value={v.sourceUrl} onChange={(e) => nastav('sourceUrl', e.target.value)} placeholder="https://…" inputMode="url" />
        </label>
        <label className="admin-pole">
          <span>Uvedení autorství / poděkování</span>
          <input className="admin-hledat-input" value={v.attribution} maxLength={500} onChange={(e) => nastav('attribution', e.target.value)} />
        </label>

        <label className="admin-zaskrtnuti">
          <input type="checkbox" checked={zverejnit} disabled={!maObsah} onChange={(e) => setZverejnit(e.target.checked)} />
          <span>{maObsah ? 'Po uložení rovnou zveřejnit' : 'Zveřejnit jde až po nahrání obsahu (EPUB)'}</span>
        </label>

        {chyba && <p className="admin-formular-chyba" role="alert">{chyba}</p>}

        <div className="admin-card-head">
          <button type="button" className="admin-btn admin-btn--tlumene" onClick={onZpet} disabled={uklada}>Zrušit</button>
          <button type="submit" className="admin-btn admin-btn--ano" disabled={uklada || cteEpub}>
            {uklada ? 'Ukládám…' : 'Uložit'}
          </button>
        </div>
      </section>
    </form>
  )
}
