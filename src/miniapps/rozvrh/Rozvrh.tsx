import React, { useState } from 'react'
import { stahnoutBlob } from '@/core/utils/download'
import { requestNotificationPermission } from '@/core/utils/notify'
import { useRozvrh } from './useRozvrh'
import {
  DNY_V_TYDNU,
  DenVTydnu,
  HodinaRozvrhu,
  PRAH_RIZIKA_DOCHAZKY,
  dnesniDatumIso,
  hodinyDnes,
  klicDochazky,
  najdiKolize,
  nazevDne,
  sestavIcsRozvrhu,
  spocitejDochazkuPodlePredmetu,
} from './types'
import { plural } from '@/core/utils/pluralCZ'
import './Rozvrh.css'

type Zalozka = 'rozvrh' | 'dochazka'

const PRAZDNY_FORM = { den: 1 as DenVTydnu, casOd: '08:00', casDo: '09:40', predmet: '', mistnost: '', vyucujici: '' }

export const Rozvrh: React.FC = () => {
  const { hodiny, dochazka, pridatHodinu, updateHodinu, smazatHodinu, oznacitDochazku } = useRozvrh()
  const [zalozka, setZalozka] = useState<Zalozka>('rozvrh')
  const [formOtevreny, setFormOtevreny] = useState(false)
  const [upravovanaId, setUpravovanaId] = useState<string | null>(null)
  const [form, setForm] = useState(PRAZDNY_FORM)
  // Kopírovat den — id dne, u kterého je zrovna otevřená nabídka
  // cílových dnů (null = zavřená). Jen jedna může být otevřená
  // najednou, stejná "jedno id, ne pole otevřených" úspora jako
  // Znamkovo rozbalenyPredmet vedle.
  const [kopirovanyDen, setKopirovanyDen] = useState<DenVTydnu | null>(null)

  const dnesniIso = dnesniDatumIso()
  const dnesek = hodinyDnes(hodiny)
  const dochazkaPredmetu = spocitejDochazkuPodlePredmetu(hodiny, dochazka)

  const otevritPridani = () => {
    setUpravovanaId(null)
    setForm(PRAZDNY_FORM)
    setFormOtevreny(true)
  }

  const otevritUpravu = (h: HodinaRozvrhu) => {
    setUpravovanaId(h.id)
    setForm({ den: h.den, casOd: h.casOd, casDo: h.casDo, predmet: h.predmet, mistnost: h.mistnost, vyucujici: h.vyucujici })
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
      pridatHodinu(form.den, form.casOd, form.casDo, form.predmet, form.mistnost, form.vyucujici)
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

    kopirovane.forEach((h) => pridatHodinu(doDne, h.casOd, h.casDo, h.predmet, h.mistnost, h.vyucujici))
    setKopirovanyDen(null)
  }

  return (
    <div className="rozvrh">
      <div className="rozvrh-zalozky" role="tablist">
        <button
          role="tab"
          aria-selected={zalozka === 'rozvrh'}
          className={`rozvrh-zalozka ${zalozka === 'rozvrh' ? 'je-aktivni' : ''}`}
          onClick={() => setZalozka('rozvrh')}
        >
          🗓 Rozvrh
        </button>
        <button
          role="tab"
          aria-selected={zalozka === 'dochazka'}
          className={`rozvrh-zalozka ${zalozka === 'dochazka' ? 'je-aktivni' : ''}`}
          onClick={() => setZalozka('dochazka')}
        >
          ✅ Docházka
        </button>
      </div>

      {zalozka === 'rozvrh' && (
        <>
          <div className="rozvrh-horni-lista">
            <button className="rozvrh-pridat-btn" onClick={otevritPridani}>
              + Přidat hodinu
            </button>
            <button
              className="rozvrh-export-btn"
              onClick={exportIcs}
              disabled={hodiny.length === 0}
              aria-label="Exportovat rozvrh do kalendáře"
            >
              ⬇ Export .ics
            </button>
          </div>

          {hodiny.length === 0 && <p className="rozvrh-prazdno">Zatím žádné hodiny — přidej první.</p>}

          {DNY_V_TYDNU.map((den) => {
            const hodinyDne = hodinyPodleDne(den.id)
            if (hodinyDne.length === 0) return null
            return (
              <div key={den.id} className="rozvrh-den-blok">
                <div className="rozvrh-den-hlavicka">
                  <h3>{den.nazev}</h3>
                  <button
                    className="rozvrh-kopirovat-btn"
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
                  {hodinyDne.map((h) => (
                    <li key={h.id} className="rozvrh-polozka">
                      <span className="rozvrh-polozka-cas">
                        {h.casOd}–{h.casDo}
                      </span>
                      <div className="rozvrh-polozka-text">
                        <strong>{h.predmet}</strong>
                        {(h.mistnost || h.vyucujici) && (
                          <p>
                            {h.mistnost}
                            {h.mistnost && h.vyucujici && ' · '}
                            {h.vyucujici}
                          </p>
                        )}
                      </div>
                      <button className="rozvrh-upravit-btn" onClick={() => otevritUpravu(h)} aria-label={`Upravit ${h.predmet}`}>
                        ✏️
                      </button>
                      <button className="rozvrh-smazat-btn" onClick={() => smazat(h)} aria-label={`Smazat ${h.predmet}`}>
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}

          {formOtevreny && (
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
                <button type="button" className="rozvrh-form-zrusit" onClick={() => setFormOtevreny(false)}>
                  Zrušit
                </button>
                <button type="submit" className="rozvrh-form-ulozit">
                  {upravovanaId ? 'Uložit změny' : 'Přidat'}
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {zalozka === 'dochazka' && (
        <>
          <div className="rozvrh-dochazka-dnes">
            <h3>Dnešní hodiny</h3>
            {dnesek.length === 0 && <p className="rozvrh-prazdno">Dnes podle rozvrhu žádná hodina není.</p>}
            {dnesek.map((h) => {
              const klic = klicDochazky(h.id, dnesniIso)
              const byl = dochazka[klic]
              return (
                <div key={h.id} className="rozvrh-dochazka-radek">
                  <span className="rozvrh-dochazka-text">
                    {h.casOd} · <strong>{h.predmet}</strong>
                  </span>
                  <div className="rozvrh-dochazka-tlacitka">
                    <button
                      className={`rozvrh-dochazka-btn rozvrh-dochazka-btn--byl ${byl === true ? 'je-vybrana' : ''}`}
                      onClick={() => oznacitDochazku(h.id, dnesniIso, byl === true ? null : true)}
                    >
                      Byl jsem
                    </button>
                    <button
                      className={`rozvrh-dochazka-btn rozvrh-dochazka-btn--nebyl ${byl === false ? 'je-vybrana' : ''}`}
                      onClick={() => oznacitDochazku(h.id, dnesniIso, byl === false ? null : false)}
                    >
                      Nebyl jsem
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="rozvrh-dochazka-prehled">
            <h3>Docházka podle předmětu</h3>
            {dochazkaPredmetu.length === 0 && (
              <p className="rozvrh-prazdno">Zatím žádné záznamy — označuj docházku výš.</p>
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
    </div>
  )
}

export default Rozvrh
