import React, { useEffect, useMemo, useRef, useState } from 'react'
import { SurfaceBackdrop, useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
import {
  NAZEV_POHLEDU,
  NAZVY_MESICU,
  POHLEDY_KALENDARE,
  naFormatDatumu,
  rozlozeniMesice,
  useKalendar,
} from './useKalendar'
import {
  BARVY_DNE,
  BarvaDne,
  IcsNavrh,
  MOZNOSTI_OPAKOVANI,
  NAZEV_OPAKOVANI,
  Opakovani,
  Udalost,
  VOLBY_PRIPOMINKY,
  jeIcsDuplicitni,
  jeVicedenni,
  naparsujIcs,
  sestavIcsKalendare,
  zacatekVyskytuPokryvajiciDen,
} from './types'
import { useRozvrh } from '@/miniapps/rozvrh/useRozvrh'
import { denVTydnuZDatumu } from '@/miniapps/rozvrh/types'
import { useStudyPlanner } from '@/miniapps/study-planner/useStudyPlanner'
import { useAppStore } from '@/core/store/useAppStore'
import { stahnoutBlob } from '@/core/utils/download'
import './Kalendar.css'

const DNY_V_TYDNU = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']

// Popisky pro čtečky obrazovky/aria-label — pevná paleta, viz types.ts's
// vlastní komentář u BARVY_DNE.
const NAZEV_BARVY: Record<BarvaDne, string> = {
  cyan: 'Tyrkysová',
  violet: 'Fialová',
  magenta: 'Purpurová',
  green: 'Zelená',
  orange: 'Oranžová',
  red: 'Červená',
}

// 'YYYY-MM-DD' -> "15. května 2025" — parsováno ručně na místní datum
// (ne new Date('2025-05-15'), co by ho v UTC prohlížeči posunulo o den).
const zobrazitDatum = (datum: string): string => {
  const [rok, mesic, den] = datum.split('-').map(Number)
  return new Date(rok, mesic - 1, den).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// Kratší forma (jen den.měsíc) — appka ji používá pro rozpětí vícedenní
// události a pro náhled .ics importu, kde by plné "15. května 2025 –
// 17. května 2025" bylo zbytečně dlouhé.
const zobrazitDatumKratce = (datum: string): string => {
  const [rok, mesic, den] = datum.split('-').map(Number)
  return new Date(rok, mesic - 1, den).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })
}

export const Kalendar: React.FC = () => {
  const { rootAttributes } = useSurfaceAppearance('kalendar')
  const { setActiveAppId, returnPath } = useAppStore()
  const { tasks: planerTasks } = useStudyPlanner()

  const {
    rok,
    mesic,
    dnes,
    vybranyDen,
    setVybranyDen,
    jitMesicem,
    pohled,
    setPohled,
    jitTydnem,
    jitDnem,
    tydenAktualni,
    dnySUdalosti,
    dnySUdalostiTyden,
    udalostiDne,
    barvyDni,
    nastavBarvuDne,
    udalosti,
    pridatUdalost,
    upravitUdalost,
    smazatUdalost,
    vynechatVyskyt,
    importovatUdalosti,
  } = useKalendar()

  const [formOtevreny, setFormOtevreny] = useState(false)
  // Rozepsaný formulář upravuje existující událost místo založení
  // nové, dokud je tohle nastavené — stejný add-vs-edit přepínač jako
  // Screenplay/Comic's upravovanaId jinde v appce.
  const [upravovanaId, setUpravovanaId] = useState<string | null>(null)
  const [nazev, setNazev] = useState('')
  const [popis, setPopis] = useState('')
  const [opakovani, setOpakovani] = useState<Opakovani>('zadne')
  const [celodenni, setCelodenni] = useState(true)
  const [casOd, setCasOd] = useState('09:00')
  const [casDo, setCasDo] = useState('10:00')
  const [datumDo, setDatumDo] = useState('')
  const [pripominkaMinut, setPripominkaMinut] = useState<number | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [icsNahled, setIcsNahled] = useState<IcsNavrh[] | null>(null)
  const [icsVybrane, setIcsVybrane] = useState<Set<number>>(new Set())
  const [icsChyba, setIcsChyba] = useState<string | null>(null)

  const zavritFormular = () => {
    setFormOtevreny(false)
    setUpravovanaId(null)
    setNazev('')
    setPopis('')
    setOpakovani('zadne')
    setCelodenni(true)
    setCasOd('09:00')
    setCasDo('10:00')
    setDatumDo('')
    setPripominkaMinut(null)
  }

  // Přepnutí na jiný den se schválně chová stejně jako appčino "spustit
  // znovu" jinde — rozepsaný formulář (ať add, nebo edit) se zavře a
  // smaže, ať se napůl napsaný název tiše nepřilepí k jinému dni, než
  // pro který byl psaný. Bez tohohle šlo otevřít formulář na 5., napsat
  // kus názvu, klepnout na 12. a odeslat by ho potichu uložilo tam.
  useEffect(() => {
    zavritFormular()
  }, [vybranyDen])

  const { posunOdPondeli, pocetDni } = rozlozeniMesice(rok, mesic)
  const dnesniStr = naFormatDatumu(dnes.getFullYear(), dnes.getMonth(), dnes.getDate())

  // Dnešní hodiny podle Rozvrhu — jen jak vybraný den, ne dnešek appky.
  // O víkendu (denVTydnu === null) nebo bez jediné hodiny se sekce
  // vůbec nevykreslí, ne prázdný nadpis navíc.
  const { hodiny: rozvrhHodiny } = useRozvrh()
  const hodinyVybraneho = useMemo(() => {
    if (!vybranyDen) return []
    const [rokD, mesicD, denD] = vybranyDen.split('-').map(Number)
    const denVTydnu = denVTydnuZDatumu(new Date(rokD, mesicD - 1, denD))
    if (denVTydnu === null) return []
    return rozvrhHodiny.filter((h) => h.den === denVTydnu)
  }, [vybranyDen, rozvrhHodiny])

  // Planerovy nesplněné termíny vybraného dne — čistě READ-ONLY
  // virtuální značky. Appka je sem nekopíruje jako vlastní Udalost
  // (appka by musela obě strany ručně držet synchronizované), jen
  // filtruje Planerovo vlastní tasks pole — přesně ten samý "appka nad
  // druhou appkou jen čte, nikdy nepíše" vzor, co má tahlle "📚 Podle
  // rozvrhu" sekce nad Rozvrhem už od svýho prvního dne.
  const planerTerminyVybraneho = useMemo(
    () => (vybranyDen ? planerTasks.filter((t) => !t.completed && t.dueDate === vybranyDen) : []),
    [vybranyDen, planerTasks]
  )

  const bunky: (number | null)[] = [
    ...Array(posunOdPondeli).fill(null),
    ...Array.from({ length: pocetDni }, (_, i) => i + 1),
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!vybranyDen || !nazev.trim()) return
    const udaje = {
      nazev,
      popis,
      opakovani,
      celodenni,
      casOd: celodenni ? undefined : casOd,
      casDo: celodenni ? undefined : casDo,
      datumDo: datumDo || undefined,
      pripominkaMinut,
    }
    if (upravovanaId) upravitUdalost(upravovanaId, udaje)
    else pridatUdalost(vybranyDen, udaje)
    zavritFormular()
  }

  const otevritEdit = (u: Udalost) => {
    setUpravovanaId(u.id)
    setNazev(u.nazev)
    setPopis(u.popis)
    setOpakovani(u.opakovani)
    setCelodenni(u.celodenni)
    setCasOd(u.casOd ?? '09:00')
    setCasDo(u.casDo ?? '10:00')
    setDatumDo(u.datumDo ?? '')
    setPripominkaMinut(u.pripominkaMinut)
    setFormOtevreny(true)
  }

  const otevritAdd = () => {
    zavritFormular()
    setFormOtevreny(true)
  }

  const prepnoutPohled = (p: (typeof POHLEDY_KALENDARE)[number]) => {
    // Týden/Den potřebuje vždycky NĚJAKÝ konkrétní vybraný den — appka
    // po jitMesicem() může mít vybranyDen prázdné (appka ho schválně
    // vynuluje při přechodu na jiný měsíc), proto si ho tady doplní.
    if (!vybranyDen && p !== 'mesic') setVybranyDen(dnesniStr)
    setPohled(p)
  }

  // --- Export/Import .ics ---

  const exportovatIcs = () => {
    if (udalosti.length === 0) return
    stahnoutBlob('kalendar.ics', new Blob([sestavIcsKalendare(udalosti)], { type: 'text/calendar;charset=utf-8' }))
  }

  const vybratSoubor = () => fileInputRef.current?.click()

  const naSoubor = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const soubor = e.target.files?.[0]
    e.target.value = ''
    if (!soubor) return
    setIcsChyba(null)
    try {
      const text = await soubor.text()
      const navrhy = naparsujIcs(text)
      if (navrhy.length === 0) {
        setIcsChyba('V souboru appka nenašla žádnou platnou událost.')
        return
      }
      setIcsNahled(navrhy)
      // Duplicity (shoda názvu a prvního data s už uloženou událostí)
      // appka nechá předvyplněné jako NEvybrané — uživatel vidí, že
      // tam jsou, ale musí je zaškrtnout schválně, ne že by appka
      // potichu vytvořila druhou kopii toho samého.
      setIcsVybrane(new Set(navrhy.map((_, i) => i).filter((i) => !jeIcsDuplicitni(navrhy[i], udalosti))))
    } catch {
      setIcsChyba('Soubor se nepovedlo přečíst — je to platný .ics?')
    }
  }

  const prepnoutVyberIcs = (i: number) => {
    setIcsVybrane((prev) => {
      const novy = new Set(prev)
      if (novy.has(i)) novy.delete(i)
      else novy.add(i)
      return novy
    })
  }

  const zrusitImport = () => {
    setIcsNahled(null)
    setIcsVybrane(new Set())
  }

  const potvrditImport = () => {
    if (!icsNahled) return
    importovatUdalosti(icsNahled.filter((_, i) => icsVybrane.has(i)))
    zrusitImport()
  }

  return (
    <div className="kalendar buddy-theme-scope" {...rootAttributes}>
      <SurfaceBackdrop surfaceId="kalendar" />

      <div className="kalendar-nastroje-radek">
        <div className="kalendar-pohled-radek" role="group" aria-label="Pohled kalendáře">
          {POHLEDY_KALENDARE.map((p) => (
            <button
              key={p}
              type="button"
              className={`kalendar-pohled-btn ${pohled === p ? 'je-aktivni' : ''}`}
              onClick={() => prepnoutPohled(p)}
            >
              {NAZEV_POHLEDU[p]}
            </button>
          ))}
        </div>
        <div className="kalendar-ics-akce">
          <button
            type="button"
            className="kalendar-ics-btn"
            onClick={exportovatIcs}
            disabled={udalosti.length === 0}
            aria-label="Exportovat kalendář jako .ics"
            title="Exportovat .ics"
          >
            ⬇
          </button>
          <button
            type="button"
            className="kalendar-ics-btn"
            onClick={vybratSoubor}
            aria-label="Importovat .ics soubor"
            title="Importovat .ics"
          >
            ⬆
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ics,text/calendar"
            className="kalendar-ics-input"
            onChange={naSoubor}
          />
        </div>
      </div>

      {icsChyba && <p className="kalendar-ics-chyba">{icsChyba}</p>}

      {icsNahled && (
        <div className="kalendar-ics-nahled">
          <h3>
            Náhled importu ({icsVybrane.size} z {icsNahled.length})
          </h3>
          <ul className="kalendar-ics-seznam">
            {icsNahled.map((navrh, i) => {
              const duplicitni = jeIcsDuplicitni(navrh, udalosti)
              return (
                <li key={i} className="kalendar-ics-polozka">
                  <label>
                    <input type="checkbox" checked={icsVybrane.has(i)} onChange={() => prepnoutVyberIcs(i)} />
                    <span className="kalendar-ics-polozka-nazev">{navrh.nazev}</span>
                    <span className="kalendar-ics-polozka-datum">{zobrazitDatumKratce(navrh.datum)}</span>
                  </label>
                  {duplicitni && <span className="kalendar-ics-duplicita">už existuje</span>}
                </li>
              )
            })}
          </ul>
          <div className="kalendar-form-akce">
            <button type="button" className="kalendar-form-zrusit" onClick={zrusitImport}>
              Zrušit
            </button>
            <button
              type="button"
              className="kalendar-form-ulozit"
              onClick={potvrditImport}
              disabled={icsVybrane.size === 0}
            >
              Importovat vybrané ({icsVybrane.size})
            </button>
          </div>
        </div>
      )}

      {pohled === 'mesic' && (
        <>
          <header className="kalendar-hlavicka">
            <button className="kalendar-sipka" onClick={() => jitMesicem(-1)} aria-label="Předchozí měsíc">
              ‹
            </button>
            <h2>
              {NAZVY_MESICU[mesic]} {rok}
            </h2>
            <button className="kalendar-sipka" onClick={() => jitMesicem(1)} aria-label="Další měsíc">
              ›
            </button>
          </header>

          <div className="kalendar-tydny" aria-hidden="true">
            {DNY_V_TYDNU.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="kalendar-mrizka">
            {bunky.map((den, i) => {
              if (den === null) return <span key={`prazdna-${i}`} className="kalendar-den kalendar-den--prazdny" />

              const datumStr = naFormatDatumu(rok, mesic, den)
              const maUdalost = dnySUdalosti.has(datumStr)
              const barvaDne = barvyDni[datumStr]

              return (
                <button
                  key={datumStr}
                  className={`kalendar-den ${datumStr === dnesniStr ? 'je-dnes' : ''} ${
                    datumStr === vybranyDen ? 'je-vybrany' : ''
                  } ${barvaDne ? `kalendar-den--barva-${barvaDne}` : ''}`}
                  onClick={() => setVybranyDen(datumStr)}
                >
                  {den}
                  {maUdalost && <span className="kalendar-den-tecka" aria-hidden="true" />}
                </button>
              )
            })}
          </div>
        </>
      )}

      {pohled === 'tyden' && (
        <>
          <header className="kalendar-hlavicka">
            <button className="kalendar-sipka" onClick={() => jitTydnem(-1)} aria-label="Předchozí týden">
              ‹
            </button>
            <h2>
              {zobrazitDatumKratce(tydenAktualni[0])} – {zobrazitDatumKratce(tydenAktualni[6])}
            </h2>
            <button className="kalendar-sipka" onClick={() => jitTydnem(1)} aria-label="Další týden">
              ›
            </button>
          </header>

          <div className="kalendar-tyden-mrizka">
            {tydenAktualni.map((datumStr, i) => {
              const maUdalost = dnySUdalostiTyden.has(datumStr)
              const barvaDne = barvyDni[datumStr]
              const den = Number(datumStr.split('-')[2])

              return (
                <button
                  key={datumStr}
                  className={`kalendar-tyden-den ${datumStr === dnesniStr ? 'je-dnes' : ''} ${
                    datumStr === vybranyDen ? 'je-vybrany' : ''
                  } ${barvaDne ? `kalendar-den--barva-${barvaDne}` : ''}`}
                  onClick={() => setVybranyDen(datumStr)}
                >
                  <span className="kalendar-tyden-den-nazev">{DNY_V_TYDNU[i]}</span>
                  <span className="kalendar-tyden-den-cislo">{den}</span>
                  {maUdalost && <span className="kalendar-den-tecka" aria-hidden="true" />}
                </button>
              )
            })}
          </div>
        </>
      )}

      {pohled === 'den' && (
        <header className="kalendar-hlavicka">
          <button className="kalendar-sipka" onClick={() => jitDnem(-1)} aria-label="Předchozí den">
            ‹
          </button>
          <h2>{zobrazitDatum(vybranyDen ?? dnesniStr)}</h2>
          <button className="kalendar-sipka" onClick={() => jitDnem(1)} aria-label="Další den">
            ›
          </button>
        </header>
      )}

      {vybranyDen && (
        <div className="kalendar-detail">
          <div className="kalendar-detail-hlavicka">
            <h3>{pohled === 'den' ? 'Události' : zobrazitDatum(vybranyDen)}</h3>
            {!formOtevreny && (
              <button className="kalendar-pridat-btn" onClick={otevritAdd}>
                + Přidat
              </button>
            )}
          </div>

          <div className="kalendar-barvy-radek" role="group" aria-label="Barva dne">
            <button
              className={`kalendar-barva-vzorek kalendar-barva-vzorek--bez ${
                !barvyDni[vybranyDen] ? 'je-vybrana' : ''
              }`}
              aria-label="Bez barvy"
              aria-pressed={!barvyDni[vybranyDen]}
              onClick={() => nastavBarvuDne(vybranyDen, null)}
            >
              ✕
            </button>
            {BARVY_DNE.map((barva) => (
              <button
                key={barva}
                className={`kalendar-barva-vzorek kalendar-barva-vzorek--${barva} ${
                  barvyDni[vybranyDen] === barva ? 'je-vybrana' : ''
                }`}
                aria-label={NAZEV_BARVY[barva]}
                aria-pressed={barvyDni[vybranyDen] === barva}
                onClick={() => nastavBarvuDne(vybranyDen, barva)}
              />
            ))}
          </div>

          {hodinyVybraneho.length > 0 && (
            <div className="kalendar-rozvrh-radek">
              <span className="kalendar-rozvrh-popisek">📚 Podle rozvrhu</span>
              <ul className="kalendar-rozvrh-seznam">
                {hodinyVybraneho.map((h) => (
                  <li key={h.id}>
                    <span className="kalendar-rozvrh-cas">
                      {h.casOd}–{h.casDo}
                    </span>
                    <span className="kalendar-rozvrh-predmet">{h.predmet}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {planerTerminyVybraneho.length > 0 && (
            <div className="kalendar-rozvrh-radek">
              <span className="kalendar-rozvrh-popisek">📋 Z Planeru</span>
              <ul className="kalendar-rozvrh-seznam kalendar-planer-seznam">
                {planerTerminyVybraneho.map((t) => (
                  <li key={t.id}>
                    <span className="kalendar-rozvrh-predmet">
                      {t.subject ? `${t.subject} — ` : ''}
                      {t.topic}
                    </span>
                    <button
                      type="button"
                      className="kalendar-planer-link"
                      onClick={() => setActiveAppId('study-planner', returnPath)}
                    >
                      Otevřít v Planeru ›
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {udalostiDne.length === 0 && !formOtevreny && (
            <p className="kalendar-prazdno">Žádné události — přidej první.</p>
          )}

          {udalostiDne.length > 0 && (
            <ul className="kalendar-seznam">
              {udalostiDne.map((u) => {
                const zacatekVyskytu = zacatekVyskytuPokryvajiciDen(u, vybranyDen)
                return (
                  <li key={u.id} className="kalendar-polozka">
                    <div className="kalendar-polozka-text">
                      <strong>{u.nazev}</strong>
                      {!u.celodenni && u.casOd && (
                        <span className="kalendar-polozka-cas">
                          {u.casOd}
                          {u.casDo ? `–${u.casDo}` : ''}
                        </span>
                      )}
                      {jeVicedenni(u) && u.datumDo && (
                        <span className="kalendar-polozka-rozsah">
                          📅 {zobrazitDatumKratce(u.datum)}–{zobrazitDatumKratce(u.datumDo)}
                        </span>
                      )}
                      {u.opakovani !== 'zadne' && (
                        <span className="kalendar-polozka-opakovani">🔁 {NAZEV_OPAKOVANI[u.opakovani]}</span>
                      )}
                      {u.pripominkaMinut != null && (
                        <span className="kalendar-polozka-pripominka">
                          🔔 {VOLBY_PRIPOMINKY.find((v) => v.hodnota === u.pripominkaMinut)?.nazev}
                        </span>
                      )}
                      {u.popis && <p>{u.popis}</p>}
                    </div>
                    <div className="kalendar-polozka-akce">
                      <button
                        type="button"
                        className="kalendar-upravit-btn"
                        onClick={() => otevritEdit(u)}
                        aria-label={`Upravit ${u.nazev}`}
                      >
                        ✏️
                      </button>
                      {u.opakovani !== 'zadne' && zacatekVyskytu && (
                        <button
                          type="button"
                          className="kalendar-vynechat-btn"
                          onClick={() => {
                            if (window.confirm(`Vynechat tenhle výskyt „${u.nazev}“?`)) {
                              vynechatVyskyt(u.id, zacatekVyskytu)
                            }
                          }}
                          aria-label={`Vynechat tenhle výskyt ${u.nazev}`}
                          title="Vynechat tenhle výskyt"
                        >
                          ⏭
                        </button>
                      )}
                      <button
                        className="kalendar-smazat-btn"
                        onClick={() => {
                          if (window.confirm(`Smazat událost „${u.nazev}“?`)) smazatUdalost(u.id)
                        }}
                        aria-label={`Smazat ${u.nazev}`}
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {formOtevreny && (
            <form className="kalendar-form" onSubmit={handleSubmit}>
              <input
                placeholder="Název události"
                value={nazev}
                onChange={(e) => setNazev(e.target.value)}
                autoFocus
                required
              />
              <textarea
                placeholder="Poznámka (nepovinné)"
                value={popis}
                onChange={(e) => setPopis(e.target.value)}
                rows={2}
              />

              <label className="kalendar-form-checkbox">
                <input type="checkbox" checked={celodenni} onChange={(e) => setCelodenni(e.target.checked)} />
                Celodenní
              </label>

              {!celodenni && (
                <div className="kalendar-form-cas-radek">
                  <label>
                    Od
                    <input type="time" value={casOd} onChange={(e) => setCasOd(e.target.value)} />
                  </label>
                  <label>
                    Do
                    <input type="time" value={casDo} onChange={(e) => setCasDo(e.target.value)} />
                  </label>
                </div>
              )}

              <label className="kalendar-form-pole">
                Vícedenní — poslední den (nepovinné)
                <input type="date" value={datumDo} onChange={(e) => setDatumDo(e.target.value)} min={vybranyDen} />
              </label>

              <select
                className="kalendar-form-opakovani"
                value={opakovani}
                onChange={(e) => setOpakovani(e.target.value as Opakovani)}
                aria-label="Opakování"
              >
                {MOZNOSTI_OPAKOVANI.map((o) => (
                  <option key={o} value={o}>
                    {NAZEV_OPAKOVANI[o]}
                  </option>
                ))}
              </select>

              <select
                className="kalendar-form-opakovani"
                value={pripominkaMinut === null ? 'null' : String(pripominkaMinut)}
                onChange={(e) => setPripominkaMinut(e.target.value === 'null' ? null : Number(e.target.value))}
                aria-label="Připomínka"
              >
                {VOLBY_PRIPOMINKY.map((v) => (
                  <option key={v.nazev} value={v.hodnota === null ? 'null' : String(v.hodnota)}>
                    {v.nazev}
                  </option>
                ))}
              </select>

              <div className="kalendar-form-akce">
                <button type="button" className="kalendar-form-zrusit" onClick={zavritFormular}>
                  Zrušit
                </button>
                <button type="submit" className="kalendar-form-ulozit">
                  {upravovanaId ? 'Uložit změny' : 'Uložit'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
