import { BuddyDialog } from '@/components/buddy-ui/BuddyDialog'
import React, { useRef, useState } from 'react'
import { SurfaceBackdrop, useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
import { stahnoutBlob } from '@/core/utils/download'
import { requestNotificationPermission } from '@/core/utils/notify'
import { useRozvrh } from './useRozvrh'
import {
  DNY_V_TYDNU,
  DenVTydnu,
  HodinaRozvrhu,
  NAZEV_CYKLU,
  NavrhHodiny,
  PRAH_RIZIKA_DOCHAZKY,
  TydenCyklus,
  dnesniDatumIso,
  efektivniRozvrhProDatum,
  jeDenPrazdninovy,
  jeNavrhDuplicitni,
  klicDochazky,
  najdiKolize,
  naparsujIcsRozvrh,
  nazevDne,
  nejblizsiDatumProSParitou,
  serazenoPodleCasu,
  sestavIcsRozvrhu,
  spocitejDochazkuPodlePredmetu,
  tydenHodiny,
} from './types'
import { plural } from '@/core/utils/pluralCZ'
import './Rozvrh.css'

type Zalozka = 'rozvrh' | 'dochazka' | 'sprava'

const PRAZDNY_FORM = {
  den: 1 as DenVTydnu,
  casOd: '08:00',
  casDo: '09:40',
  predmet: '',
  mistnost: '',
  vyucujici: '',
  tyden: 'kazdy' as TydenCyklus,
}

const PRAZDNY_PRAZDNINY_FORM = { nazev: '', datumOd: '', datumDo: '' }
const PRAZDNY_SEMESTR_FORM = { nazev: '', datumOd: '', datumDo: '', vycistit: false }

/** Nejbližší datum, kdy se tahle hodina doopravdy koná (den v týdnu +
 *  parita) — výchozí hodnota pro datum výskytu, co se chystá uživatel
 *  zrušit/přesunout, ne vynucená jediná možnost (pole je dál volně
 *  editovatelné). */
const vychoziDatumVyskytu = (h: HodinaRozvrhu): string =>
  dnesniDatumIso(nejblizsiDatumProSParitou(h.den, tydenHodiny(h), new Date()))

export const Rozvrh: React.FC = () => {
  const { rootAttributes } = useSurfaceAppearance('rozvrh')

  const {
    hodiny,
    dochazka,
    prazdniny,
    zruseneHodiny,
    presuny,
    semestry,
    pridatHodinu,
    updateHodinu,
    smazatHodinu,
    oznacitDochazku,
    pridatPrazdniny,
    smazatPrazdniny,
    zrusitVyskyt,
    obnovitVyskyt,
    presunoutVyskyt,
    zrusitPresun,
    archivovatSemestr,
    smazatSemestr,
  } = useRozvrh()

  const [zalozka, setZalozka] = useState<Zalozka>('rozvrh')
  const [denFiltru, setDenFiltru] = useState('vse')
  const [formOtevreny, setFormOtevreny] = useState(false)
  const [upravovanaId, setUpravovanaId] = useState<string | null>(null)
  const [form, setForm] = useState(PRAZDNY_FORM)
  // Kopírovat den — id dne, u kterého je zrovna otevřená nabídka
  // cílových dnů (null = zavřená). Jen jedna může být otevřená
  // najednou, stejná "jedno id, ne pole otevřených" úspora jako
  // Znamkovo rozbalenyPredmet vedle.
  const [kopirovanyDen, setKopirovanyDen] = useState<DenVTydnu | null>(null)

  // Zrušit/přesunout konkrétní výskyt — id hodiny s otevřenou nabídkou
  // (jen jedna najednou, stejná úspora jako kopirovanyDen). presunForm
  // null, dokud uživatel nerozbalí "Přesunout" — appka pak nabídne
  // novy den/čas, výchozí z právě vybraného původního data/času.
  const [vyskytHodinaId, setVyskytHodinaId] = useState<string | null>(null)
  const [vyskytDatum, setVyskytDatum] = useState('')
  const [presunForm, setPresunForm] = useState<{ datum: string; casOd: string; casDo: string } | null>(null)

  const [prazdninyForm, setPrazdninyForm] = useState(PRAZDNY_PRAZDNINY_FORM)

  const [semestrFormOtevreny, setSemestrFormOtevreny] = useState(false)
  const [semestrForm, setSemestrForm] = useState(PRAZDNY_SEMESTR_FORM)
  const [rozbalenySemestrId, setRozbalenySemestrId] = useState<string | null>(null)

  const [navrhyImportu, setNavrhyImportu] = useState<NavrhHodiny[] | null>(null)
  const [vybraneNavrhy, setVybraneNavrhy] = useState<Set<number>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const dnesniIso = dnesniDatumIso()
  const dnesPrazdniny = jeDenPrazdninovy(prazdniny, dnesniIso)
  const dnesek = efektivniRozvrhProDatum(hodiny, prazdniny, zruseneHodiny, presuny, dnesniIso)
  const dochazkaPredmetu = spocitejDochazkuPodlePredmetu(hodiny, dochazka)

  const otevritPridani = () => {
    setUpravovanaId(null)
    setForm(PRAZDNY_FORM)
    setFormOtevreny(true)
  }

  const otevritUpravu = (h: HodinaRozvrhu) => {
    setUpravovanaId(h.id)
    setForm({
      den: h.den,
      casOd: h.casOd,
      casDo: h.casDo,
      predmet: h.predmet,
      mistnost: h.mistnost,
      vyucujici: h.vyucujici,
      tyden: tydenHodiny(h),
    })
    setFormOtevreny(true)
  }

  // Živě, ne jen při odeslání — uživatel vidí kolizi dřív, než se
  // vůbec rozhodne uložit. Vlastní hodina (při úpravě) se sama proti
  // sobě nikdy nepočítá.
  const kolize = najdiKolize(hodiny, form.den, form.casOd, form.casDo, upravovanaId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.predmet.trim()) return

    if (kolize.length > 0) {
      const seznam = kolize.map((h) => `„${h.predmet}“ (${h.casOd}–${h.casDo})`).join(', ')
      if (!window.confirm(`Tahle hodina se překrývá s: ${seznam}. Uložit i tak?`)) return
    }

    if (upravovanaId) {
      updateHodinu(upravovanaId, form)
    } else {
      // Notifikace se vyžádá jen u NOVÉ hodiny, ne u úpravy — přidání
      // je nejjasnější "chci tohle sledovat" gesto, stejný důvod jako
      // Planerovo addTask/Growth Roomovy termíny cílů.
      requestNotificationPermission()
      pridatHodinu(form.den, form.casOd, form.casDo, form.predmet, form.mistnost, form.vyucujici, form.tyden)
    }
    setFormOtevreny(false)
    setUpravovanaId(null)
    setForm(PRAZDNY_FORM)
  }

  const smazat = (h: HodinaRozvrhu) => {
    if (!window.confirm(`Smazat hodinu „${h.predmet}“?`)) return
    smazatHodinu(h.id)
  }

  const exportIcs = () => {
    if (hodiny.length === 0) return
    stahnoutBlob('rozvrh.ics', new Blob([sestavIcsRozvrhu(hodiny)], { type: 'text/calendar;charset=utf-8' }))
  }

  const hodinyPodleDne = (den: DenVTydnu) => hodiny.filter((h) => h.den === den)

  // Kopírovat den — kolize se řeší úplně stejně jako ruční přidání
  // (najdiKolize, jedno souhrnné potvrzení), jen se počítá pro
  // KAŽDOU kopírovanou hodinu najednou. Znovupoužívá pridatHodinu
  // pro každou položku zvlášť, ne novou store akci — appka tak
  // nemusí druhou cestou znovu řešit id/gamifikaci/validaci.
  const provestKopii = (zeDne: DenVTydnu, doDne: DenVTydnu) => {
    const kopirovane = hodinyPodleDne(zeDne)
    if (kopirovane.length === 0) return

    const vsechnyKolize = kopirovane.flatMap((h) => najdiKolize(hodiny, doDne, h.casOd, h.casDo))
    const pocetHodin = plural(kopirovane.length, 'hodinu', 'hodiny', 'hodin')
    if (vsechnyKolize.length > 0) {
      const seznam = [...new Set(vsechnyKolize.map((h) => `„${h.predmet}“ (${h.casOd}–${h.casDo})`))].join(', ')
      if (
        !window.confirm(
          `Zkopírovat ${kopirovane.length} ${pocetHodin} ze dne ${nazevDne(zeDne)} do ${nazevDne(doDne)}? Překrývá se s: ${seznam}.`
        )
      )
        return
    } else if (
      !window.confirm(`Zkopírovat ${kopirovane.length} ${pocetHodin} ze dne ${nazevDne(zeDne)} do ${nazevDne(doDne)}?`)
    ) {
      return
    }

    kopirovane.forEach((h) => pridatHodinu(doDne, h.casOd, h.casDo, h.predmet, h.mistnost, h.vyucujici, h.tyden))
    setKopirovanyDen(null)
  }

  // --- Zrušit/přesunout konkrétní výskyt ---

  const prepnoutVyskytPanel = (h: HodinaRozvrhu) => {
    if (vyskytHodinaId === h.id) {
      setVyskytHodinaId(null)
      setPresunForm(null)
      return
    }
    setVyskytHodinaId(h.id)
    setVyskytDatum(vychoziDatumVyskytu(h))
    setPresunForm(null)
  }

  const zrusitTentoVyskyt = (h: HodinaRozvrhu) => {
    if (!vyskytDatum) return
    zrusitVyskyt(h.id, vyskytDatum)
    setVyskytHodinaId(null)
  }

  const otevritPresunForm = (h: HodinaRozvrhu) => {
    setPresunForm({ datum: vyskytDatum, casOd: h.casOd, casDo: h.casDo })
  }

  const potvrditPresun = (h: HodinaRozvrhu) => {
    if (!presunForm || !vyskytDatum) return
    presunoutVyskyt(h.id, vyskytDatum, presunForm.datum, presunForm.casOd, presunForm.casDo)
    setVyskytHodinaId(null)
    setPresunForm(null)
  }

  // --- Prázdniny ---

  const handlePridatPrazdniny = (e: React.FormEvent) => {
    e.preventDefault()
    pridatPrazdniny(prazdninyForm.nazev, prazdninyForm.datumOd, prazdninyForm.datumDo)
    setPrazdninyForm(PRAZDNY_PRAZDNINY_FORM)
  }

  // --- Semestry a archiv ---

  const handleArchivovat = (e: React.FormEvent) => {
    e.preventDefault()
    if (
      semestrForm.vycistit &&
      !window.confirm('Opravdu vyčistit aktuální rozvrh? Hodiny zůstanou v archivu, ale ze živého rozvrhu zmizí.')
    )
      return
    archivovatSemestr(semestrForm.nazev, semestrForm.datumOd, semestrForm.datumDo, semestrForm.vycistit)
    setSemestrForm(PRAZDNY_SEMESTR_FORM)
    setSemestrFormOtevreny(false)
  }

  const smazatSemestrPotvrzene = (nazev: string, id: string) => {
    if (!window.confirm(`Smazat archivovaný semestr „${nazev}“? Smazání je trvalé.`)) return
    smazatSemestr(id)
    if (rozbalenySemestrId === id) setRozbalenySemestrId(null)
  }

  // --- Import z .ics ---

  const handleVyberSouboru = (e: React.ChangeEvent<HTMLInputElement>) => {
    const soubor = e.target.files?.[0]
    if (!soubor) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      const navrhy = naparsujIcsRozvrh(text)
      setNavrhyImportu(navrhy)
      // Duplicitní návrhy appka předvyplní jako NEzaškrtnuté — uživatel
      // nejspíš nechce tutéž hodinu v rozvrhu dvakrát.
      setVybraneNavrhy(
        new Set(navrhy.map((_, i) => i).filter((i) => !jeNavrhDuplicitni(navrhy[i], hodiny)))
      )
    }
    reader.readAsText(soubor)
  }

  const prepnoutNavrh = (i: number) => {
    setVybraneNavrhy((aktualni) => {
      const dalsi = new Set(aktualni)
      if (dalsi.has(i)) dalsi.delete(i)
      else dalsi.add(i)
      return dalsi
    })
  }

  const zrusitImport = () => {
    setNavrhyImportu(null)
    setVybraneNavrhy(new Set())
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const potvrditImport = () => {
    if (!navrhyImportu) return
    const vybrane = navrhyImportu.filter((_, i) => vybraneNavrhy.has(i))
    if (vybrane.length === 0) return
    requestNotificationPermission()
    vybrane.forEach((n) => pridatHodinu(n.den, n.casOd, n.casDo, n.predmet, n.mistnost, n.vyucujici, n.tyden))
    zrusitImport()
  }

  return (
    <div className="buddy-miniapp rozvrh buddy-theme-scope" {...rootAttributes}>
      <SurfaceBackdrop surfaceId="rozvrh" />
      <div className="buddy-ui-segmented rozvrh-zalozky" role="group" aria-label="Pohled rozvrhu">
        <button
          type="button"
          aria-pressed={zalozka === 'rozvrh'}
          className={`rozvrh-zalozka ${zalozka === 'rozvrh' ? 'je-aktivni' : ''}`}
          onClick={() => setZalozka('rozvrh')}
        >
          🗓 Rozvrh
        </button>
        <button
          type="button"
          aria-pressed={zalozka === 'dochazka'}
          className={`rozvrh-zalozka ${zalozka === 'dochazka' ? 'je-aktivni' : ''}`}
          onClick={() => setZalozka('dochazka')}
        >
          ✅ Docházka
        </button>
        <button
          type="button"
          aria-pressed={zalozka === 'sprava'}
          className={`rozvrh-zalozka ${zalozka === 'sprava' ? 'je-aktivni' : ''}`}
          onClick={() => setZalozka('sprava')}
        >
          🗂 Správa
        </button>
      </div>

      {zalozka === 'rozvrh' && (
        <>
          <div className="rozvrh-horni-lista">
            <button className="buddy-ui-button buddy-ui-button--primary rozvrh-pridat-btn" onClick={otevritPridani}>
              + Přidat hodinu
            </button>
            <button
              className="buddy-ui-button rozvrh-export-btn"
              onClick={exportIcs}
              disabled={hodiny.length === 0}
              aria-label="Exportovat rozvrh do kalendáře"
            >
              ⬇ Export .ics
            </button>
          </div>

          <label className="rozvrh-den-filtr">
            Den v týdnu
            <select className="buddy-ui-input" value={denFiltru} onChange={event => setDenFiltru(event.target.value)}>
              <option value="vse">Celý týden</option>
              {DNY_V_TYDNU.map(den => <option key={den.id} value={den.id}>{den.nazev}</option>)}
            </select>
          </label>

          {denFiltru !== 'vse' && hodiny.length > 0 && !hodiny.some(h => String(h.den) === denFiltru) && (
            <p className="buddy-ui-status rozvrh-prazdno">Pro tento den nemáš žádnou hodinu.</p>
          )}

          {hodiny.length === 0 && <p className="buddy-ui-status rozvrh-prazdno">Zatím žádné hodiny — přidej první.</p>}

          {DNY_V_TYDNU.filter(den => denFiltru === 'vse' || String(den.id) === denFiltru).map((den) => {
            const hodinyDne = hodinyPodleDne(den.id)
            if (hodinyDne.length === 0) return null
            return (
              <div key={den.id} className="buddy-ui-card rozvrh-den-blok">
                <div className="rozvrh-den-hlavicka">
                  <h3>{den.nazev}</h3>
                  <button
                    className="buddy-ui-button rozvrh-kopirovat-btn"
                    onClick={() => setKopirovanyDen(kopirovanyDen === den.id ? null : den.id)}
                  >
                    📋 Kopírovat den
                  </button>
                </div>

                {kopirovanyDen === den.id && (
                  <div className="rozvrh-kopirovat-nabidka" role="group" aria-label={`Kopírovat ${den.nazev} do`}>
                    <span>Zkopírovat do:</span>
                    {DNY_V_TYDNU.filter((cil) => cil.id !== den.id).map((cil) => (
                      <button key={cil.id} className="rozvrh-kopirovat-cil-btn" onClick={() => provestKopii(den.id, cil.id)}>
                        {cil.zkratka}
                      </button>
                    ))}
                  </div>
                )}

                <ul className="rozvrh-seznam">
                  {hodinyDne.map((h) => {
                    const cyklus = tydenHodiny(h)
                    const zruseniHodiny = zruseneHodiny.filter((z) => z.hodinaId === h.id)
                    const presunyHodiny = presuny.filter((p) => p.hodinaId === h.id)
                    return (
                      <li key={h.id} className="rozvrh-polozka-obal">
                        <div className="rozvrh-polozka">
                          <span className="rozvrh-polozka-cas">
                            {h.casOd}–{h.casDo}
                          </span>
                          <div className="rozvrh-polozka-text">
                            <strong>
                              {h.predmet}
                              {cyklus !== 'kazdy' && <span className="rozvrh-tyden-znacka">{NAZEV_CYKLU[cyklus]}</span>}
                            </strong>
                            {(h.mistnost || h.vyucujici) && (
                              <p>
                                {h.mistnost}
                                {h.mistnost && h.vyucujici && ' · '}
                                {h.vyucujici}
                              </p>
                            )}
                          </div>
                          <button
                            className="buddy-ui-button rozvrh-vyskyt-btn"
                            onClick={() => prepnoutVyskytPanel(h)}
                            aria-label={`Zrušit nebo přesunout výskyt ${h.predmet}`}
                            title="Zrušit nebo přesunout konkrétní den"
                          >
                            📅
                          </button>
                          <button className="buddy-ui-button rozvrh-upravit-btn" onClick={() => otevritUpravu(h)} aria-label={`Upravit ${h.predmet}`}>
                            ✏️
                          </button>
                          <button className="buddy-ui-button rozvrh-smazat-btn" onClick={() => smazat(h)} aria-label={`Smazat ${h.predmet}`}>
                            ✕
                          </button>
                        </div>

                        {vyskytHodinaId === h.id && (
                          <div className="buddy-ui-card rozvrh-vyskyt-panel">
                            <label className="rozvrh-form-radek">
                              <span>Kterého dne</span>
                              <input
                                type="date"
                                value={vyskytDatum}
                                onChange={(e) => setVyskytDatum(e.target.value)}
                              />
                            </label>
                            <div className="rozvrh-vyskyt-akce">
                              <button type="button" className="buddy-ui-button rozvrh-form-zrusit" onClick={() => zrusitTentoVyskyt(h)}>
                                🚫 Zrušit tenhle den
                              </button>
                              {!presunForm ? (
                                <button type="button" className="buddy-ui-button buddy-ui-button--primary rozvrh-form-ulozit" onClick={() => otevritPresunForm(h)}>
                                  ↪ Přesunout
                                </button>
                              ) : null}
                            </div>

                            {presunForm && (
                              <div className="rozvrh-presun-form">
                                <label className="rozvrh-form-radek">
                                  <span>Nové datum</span>
                                  <input
                                    type="date"
                                    value={presunForm.datum}
                                    onChange={(e) => setPresunForm({ ...presunForm, datum: e.target.value })}
                                  />
                                </label>
                                <div className="rozvrh-form-cas">
                                  <label className="rozvrh-form-radek">
                                    <span>Od</span>
                                    <input
                                      type="time"
                                      value={presunForm.casOd}
                                      onChange={(e) => setPresunForm({ ...presunForm, casOd: e.target.value })}
                                    />
                                  </label>
                                  <label className="rozvrh-form-radek">
                                    <span>Do</span>
                                    <input
                                      type="time"
                                      value={presunForm.casDo}
                                      onChange={(e) => setPresunForm({ ...presunForm, casDo: e.target.value })}
                                    />
                                  </label>
                                </div>
                                <div className="rozvrh-form-akce">
                                  <button type="button" className="buddy-ui-button rozvrh-form-zrusit" onClick={() => setPresunForm(null)}>
                                    Zrušit
                                  </button>
                                  <button type="button" className="buddy-ui-button buddy-ui-button--primary rozvrh-form-ulozit" onClick={() => potvrditPresun(h)}>
                                    Uložit přesun
                                  </button>
                                </div>
                              </div>
                            )}

                            {(zruseniHodiny.length > 0 || presunyHodiny.length > 0) && (
                              <div className="rozvrh-vyskyt-historie">
                                {zruseniHodiny.map((z) => (
                                  <div key={z.id} className="rozvrh-vyskyt-historie-radek">
                                    <span>🚫 Zrušeno {z.datum}</span>
                                    <button type="button" onClick={() => obnovitVyskyt(h.id, z.datum)}>
                                      Obnovit
                                    </button>
                                  </div>
                                ))}
                                {presunyHodiny.map((p) => (
                                  <div key={p.id} className="rozvrh-vyskyt-historie-radek">
                                    <span>
                                      ↪ {p.puvodniDatum} → {p.novyDatum} ({p.novyCasOd}–{p.novyCasDo})
                                    </span>
                                    <button type="button" onClick={() => zrusitPresun(p.id)}>
                                      Zrušit přesun
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}

          {formOtevreny && (
            <BuddyDialog
              surfaceId="rozvrh"
              title={upravovanaId ? 'Upravit hodinu' : 'Přidat hodinu'}
              onClose={() => setFormOtevreny(false)}
              contentClassName="buddy-miniapp"
            >
              <form className="rozvrh-form" onSubmit={handleSubmit}>
                <label className="rozvrh-form-radek">
                  <span>Den</span>
                  <select value={form.den} onChange={(e) => setForm({ ...form, den: Number(e.target.value) as DenVTydnu })}>
                    {DNY_V_TYDNU.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nazev}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="rozvrh-form-radek">
                  <span>Cyklus</span>
                  <select
                    value={form.tyden}
                    onChange={(e) => setForm({ ...form, tyden: e.target.value as TydenCyklus })}
                  >
                    {Object.entries(NAZEV_CYKLU).map(([id, nazev]) => (
                      <option key={id} value={id}>
                        {nazev}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="rozvrh-form-cas">
                  <label className="rozvrh-form-radek">
                    <span>Od</span>
                    <input type="time" value={form.casOd} onChange={(e) => setForm({ ...form, casOd: e.target.value })} required />
                  </label>
                  <label className="rozvrh-form-radek">
                    <span>Do</span>
                    <input type="time" value={form.casDo} onChange={(e) => setForm({ ...form, casDo: e.target.value })} required />
                  </label>
                </div>
                {kolize.length > 0 && (
                  <p className="rozvrh-form-kolize" role="alert">
                    ⚠️ Překrývá se s: {kolize.map((h) => `${h.predmet} (${h.casOd}–${h.casDo})`).join(', ')}
                  </p>
                )}
                <input
                  aria-label="Předmět"
                  placeholder="Předmět"
                  value={form.predmet}
                  onChange={(e) => setForm({ ...form, predmet: e.target.value })}
                  spellCheck
                  lang="cs"
                  autoFocus
                  required
                />
                <input
                  placeholder="Místnost (nepovinné)"
                  value={form.mistnost}
                  onChange={(e) => setForm({ ...form, mistnost: e.target.value })}
                  spellCheck
                  lang="cs"
                />
                <input
                  placeholder="Vyučující (nepovinné)"
                  value={form.vyucujici}
                  onChange={(e) => setForm({ ...form, vyucujici: e.target.value })}
                  spellCheck
                  lang="cs"
                />
                <div className="rozvrh-form-akce">
                  <button type="button" className="buddy-ui-button rozvrh-form-zrusit" onClick={() => setFormOtevreny(false)}>
                    Zrušit
                  </button>
                  <button type="submit" className="buddy-ui-button buddy-ui-button--primary rozvrh-form-ulozit">
                    {upravovanaId ? 'Uložit změny' : 'Přidat'}
                  </button>
                </div>
              </form>
            </BuddyDialog>
          )}
        </>
      )}

      {zalozka === 'dochazka' && (
        <>
          <div className="rozvrh-dochazka-dnes">
            <h3>Dnešní hodiny</h3>
            {dnesPrazdniny && (
              <p className="buddy-ui-status rozvrh-prazdno">🏖 Dnes jsou prázdniny — {dnesPrazdniny.nazev}.</p>
            )}
            {!dnesPrazdniny && dnesek.length === 0 && <p className="buddy-ui-status rozvrh-prazdno">Dnes podle rozvrhu žádná hodina není.</p>}
            {!dnesPrazdniny &&
              dnesek.map((e) => {
                const klic = klicDochazky(e.hodina.id, dnesniIso)
                const byl = dochazka[klic]
                return (
                  <div key={e.hodina.id} className={`rozvrh-dochazka-radek ${e.zrusena ? 'je-zrusena' : ''}`}>
                    <span className="rozvrh-dochazka-text">
                      {e.casOd} · <strong>{e.hodina.predmet}</strong>
                      {e.presunutoZ && <span className="rozvrh-znacka-presunuto"> (přesunuto z {e.presunutoZ})</span>}
                    </span>
                    {e.zrusena ? (
                      <span className="rozvrh-znacka-zruseno">🚫 Zrušeno</span>
                    ) : (
                      <div className="rozvrh-dochazka-tlacitka">
                        <button
                          className={`rozvrh-dochazka-btn rozvrh-dochazka-btn--byl ${byl === true ? 'je-vybrana' : ''}`}
                          onClick={() => oznacitDochazku(e.hodina.id, dnesniIso, byl === true ? null : true)}
                        >
                          Byl jsem
                        </button>
                        <button
                          className={`rozvrh-dochazka-btn rozvrh-dochazka-btn--nebyl ${byl === false ? 'je-vybrana' : ''}`}
                          onClick={() => oznacitDochazku(e.hodina.id, dnesniIso, byl === false ? null : false)}
                        >
                          Nebyl jsem
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
          </div>

          <div className="buddy-ui-card rozvrh-dochazka-prehled">
            <h3>Docházka podle předmětu</h3>
            {dochazkaPredmetu.length === 0 && (
              <p className="buddy-ui-status rozvrh-prazdno">Zatím žádné záznamy — označuj docházku výš.</p>
            )}
            {dochazkaPredmetu.map((d) => (
              <div key={d.predmet} className="rozvrh-dochazka-procenta-blok">
                <div className="rozvrh-dochazka-procenta-radek">
                  <span className="rozvrh-dochazka-procenta-nazev">{d.predmet}</span>
                  <div className="rozvrh-dochazka-lista">
                    <div
                      className={`rozvrh-dochazka-vypln ${d.procenta < PRAH_RIZIKA_DOCHAZKY ? 'je-riziko' : ''}`}
                      style={{ width: `${d.procenta}%` }}
                    />
                  </div>
                  <span className="rozvrh-dochazka-procenta-cislo">
                    {d.procenta}% ({d.pritomen}/{d.celkem})
                  </span>
                </div>
                <p className={`rozvrh-dochazka-absence ${d.pocetDovolenychAbsenci === 0 ? 'je-riziko' : ''}`}>
                  {d.pocetDovolenychAbsenci === 0
                    ? 'Žádnou další absenci si už nemůžeš dovolit'
                    : `Můžeš zameškat ještě ${d.pocetDovolenychAbsenci} ${plural(d.pocetDovolenychAbsenci, 'hodinu', 'hodiny', 'hodin')}`}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {zalozka === 'sprava' && (
        <>
          <section className="rozvrh-sprava-sekce">
            <h3>🏖 Prázdniny</h3>
            <p className="rozvrh-sprava-popis">
              Hodiny padnoucí do tohodle rozsahu se tenhle den vůbec neukážou a appka na ně nebude upozorňovat.
            </p>
            <form className="buddy-ui-card rozvrh-prazdniny-form" onSubmit={handlePridatPrazdniny}>
              <input
                placeholder="Název (např. Podzimní prázdniny)"
                value={prazdninyForm.nazev}
                onChange={(e) => setPrazdninyForm({ ...prazdninyForm, nazev: e.target.value })}
                spellCheck
                lang="cs"
                required
              />
              <div className="rozvrh-form-cas">
                <label className="rozvrh-form-radek">
                  <span>Od</span>
                  <input
                    type="date"
                    value={prazdninyForm.datumOd}
                    onChange={(e) => setPrazdninyForm({ ...prazdninyForm, datumOd: e.target.value })}
                    required
                  />
                </label>
                <label className="rozvrh-form-radek">
                  <span>Do</span>
                  <input
                    type="date"
                    value={prazdninyForm.datumDo}
                    onChange={(e) => setPrazdninyForm({ ...prazdninyForm, datumDo: e.target.value })}
                    required
                  />
                </label>
              </div>
              <button type="submit" className="buddy-ui-button buddy-ui-button--primary rozvrh-form-ulozit">
                + Přidat prázdniny
              </button>
            </form>

            {prazdniny.length === 0 ? (
              <p className="buddy-ui-status rozvrh-prazdno">Zatím žádné prázdniny nejsou zadané.</p>
            ) : (
              <ul className="rozvrh-seznam">
                {prazdniny.map((p) => (
                  <li key={p.id} className="rozvrh-polozka">
                    <div className="rozvrh-polozka-text">
                      <strong>{p.nazev}</strong>
                      <p>
                        {p.datumOd} – {p.datumDo}
                      </p>
                    </div>
                    <button className="buddy-ui-button rozvrh-smazat-btn" onClick={() => smazatPrazdniny(p.id)} aria-label={`Smazat ${p.nazev}`}>
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rozvrh-sprava-sekce">
            <h3>⬆ Import z .ics</h3>
            <p className="rozvrh-sprava-popis">
              Appka umí naimportovat jen opakující se (týdenní) hodiny — jednorázovou událost přeskočí.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".ics,text/calendar"
              onChange={handleVyberSouboru}
              className="rozvrh-import-input"
            />

            {navrhyImportu && (
              <div className="rozvrh-import-nahled">
                {navrhyImportu.length === 0 ? (
                  <p className="buddy-ui-status rozvrh-prazdno">V souboru appka nenašla žádnou opakující se hodinu.</p>
                ) : (
                  <>
                    <ul className="rozvrh-import-seznam">
                      {navrhyImportu.map((n, i) => {
                        const duplicitni = jeNavrhDuplicitni(n, hodiny)
                        return (
                          <li key={i} className="rozvrh-import-polozka">
                            <label>
                              <input type="checkbox" checked={vybraneNavrhy.has(i)} onChange={() => prepnoutNavrh(i)} />
                              <span>
                                {nazevDne(n.den)} {n.casOd}–{n.casDo} · {n.predmet}
                                {n.tyden !== 'kazdy' ? ` (${NAZEV_CYKLU[n.tyden]})` : ''}
                              </span>
                            </label>
                            {duplicitni && <span className="rozvrh-import-duplicitni">už v rozvrhu</span>}
                          </li>
                        )
                      })}
                    </ul>
                    <div className="rozvrh-form-akce">
                      <button type="button" className="buddy-ui-button rozvrh-form-zrusit" onClick={zrusitImport}>
                        Zrušit
                      </button>
                      <button
                        type="button"
                        className="buddy-ui-button buddy-ui-button--primary rozvrh-form-ulozit"
                        onClick={potvrditImport}
                        disabled={vybraneNavrhy.size === 0}
                      >
                        Přidat vybrané ({vybraneNavrhy.size})
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>

          <section className="rozvrh-sprava-sekce">
            <h3>📚 Semestry a archiv</h3>
            {!semestrFormOtevreny ? (
              <button className="buddy-ui-button buddy-ui-button--primary rozvrh-pridat-btn" onClick={() => setSemestrFormOtevreny(true)}>
                📦 Archivovat a začít nový semestr
              </button>
            ) : (
              <form className="buddy-ui-card rozvrh-semestr-form" onSubmit={handleArchivovat}>
                <input
                  placeholder="Název semestru (např. Zimní semestr 2026)"
                  value={semestrForm.nazev}
                  onChange={(e) => setSemestrForm({ ...semestrForm, nazev: e.target.value })}
                  spellCheck
                  lang="cs"
                  required
                />
                <div className="rozvrh-form-cas">
                  <label className="rozvrh-form-radek">
                    <span>Od</span>
                    <input
                      type="date"
                      value={semestrForm.datumOd}
                      onChange={(e) => setSemestrForm({ ...semestrForm, datumOd: e.target.value })}
                      required
                    />
                  </label>
                  <label className="rozvrh-form-radek">
                    <span>Do</span>
                    <input
                      type="date"
                      value={semestrForm.datumDo}
                      onChange={(e) => setSemestrForm({ ...semestrForm, datumDo: e.target.value })}
                      required
                    />
                  </label>
                </div>
                <label className="rozvrh-semestr-checkbox">
                  <input
                    type="checkbox"
                    checked={semestrForm.vycistit}
                    onChange={(e) => setSemestrForm({ ...semestrForm, vycistit: e.target.checked })}
                  />
                  <span>Vyčistit aktuální rozvrh (začít nový semestr s čistým rozvrhem)</span>
                </label>
                <div className="rozvrh-form-akce">
                  <button type="button" className="buddy-ui-button rozvrh-form-zrusit" onClick={() => setSemestrFormOtevreny(false)}>
                    Zrušit
                  </button>
                  <button type="submit" className="buddy-ui-button buddy-ui-button--primary rozvrh-form-ulozit">
                    Archivovat
                  </button>
                </div>
              </form>
            )}

            {semestry.length === 0 ? (
              <p className="buddy-ui-status rozvrh-prazdno">Zatím žádný archivovaný semestr.</p>
            ) : (
              <ul className="rozvrh-seznam">
                {[...semestry].reverse().map((s) => (
                  <li key={s.id} className="rozvrh-polozka-obal">
                    <div className="rozvrh-polozka">
                      <button
                        type="button"
                        className="rozvrh-polozka-text rozvrh-polozka-text--klikatelna"
                        onClick={() => setRozbalenySemestrId(rozbalenySemestrId === s.id ? null : s.id)}
                      >
                        <strong>{s.nazev}</strong>
                        <span className="rozvrh-semestr-info">
                          {s.datumOd} – {s.datumDo} · {s.hodiny.length} {plural(s.hodiny.length, 'hodina', 'hodiny', 'hodin')}
                        </span>
                      </button>
                      <button
                        className="buddy-ui-button rozvrh-smazat-btn"
                        onClick={() => smazatSemestrPotvrzene(s.nazev, s.id)}
                        aria-label={`Smazat semestr ${s.nazev}`}
                      >
                        ✕
                      </button>
                    </div>
                    {rozbalenySemestrId === s.id && (
                      <ul className="rozvrh-semestr-detail">
                        {serazenoPodleCasu(s.hodiny).map((h) => (
                          <li key={h.id}>
                            {nazevDne(h.den)} {h.casOd}–{h.casDo} · {h.predmet}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default Rozvrh
