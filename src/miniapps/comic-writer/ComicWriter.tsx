import React, { useState } from 'react'
import { useComicWriter } from './useComicWriter'
import { celkovyPocetPanelu, Komiks, serazenoPodleUpravy, sestavTextKomiksu, TypRadku } from './types'
import { plural } from '@/core/utils/pluralCZ'
import { stahnoutTextovySoubor } from '@/core/utils/download'
import { formatujNaposledyUpraveno } from '@/flagships/writer-room/writerRoomFormat'
import './ComicWriter.css'

export const ComicWriter: React.FC = () => {
  const {
    komiksy,
    addKomiks,
    updateKomiks,
    deleteKomiks,
    setCilStran,
    addStrana,
    deleteStrana,
    addPanel,
    updatePanel,
    deletePanel,
    addRadek,
    updateRadek,
    deleteRadek,
    presunStranu,
  } = useComicWriter()
  const [aktivniId, setAktivniId] = useState<string | null>(null)
  const [novyNazev, setNovyNazev] = useState('')

  const aktivni = komiksy.find((k) => k.id === aktivniId) ?? null

  const zalozit = () => {
    if (!novyNazev.trim()) return
    const id = addKomiks(novyNazev)
    setNovyNazev('')
    setAktivniId(id)
  }

  const smazatKomiks = (k: Komiks) => {
    if (window.confirm(`Smazat komiks „${k.nazev}“?`)) deleteKomiks(k.id)
  }

  if (!aktivni) {
    return (
      <div className="cw-app">
        <div className="cw-header">
          <h2>💥 Komiks</h2>
        </div>

        <div className="cw-nova-radek">
          <input
            type="text"
            placeholder="Název nového komiksu"
            value={novyNazev}
            onChange={(e) => setNovyNazev(e.target.value)}
            maxLength={60}
            onKeyDown={(e) => e.key === 'Enter' && zalozit()}
          />
          <button className="cw-ulozit-btn" onClick={zalozit}>
            Založit
          </button>
        </div>

        <div className="cw-seznam">
          {komiksy.length === 0 && <p className="cw-prazdno">Zatím žádný komiks. Založ první výš.</p>}
          {serazenoPodleUpravy(komiksy).map((k) => (
            <div className="cw-radek" key={k.id}>
              <button className="cw-radek-otevrit" onClick={() => setAktivniId(k.id)}>
                <strong>{k.nazev}</strong>
                <span>
                  {k.strany.length} {plural(k.strany.length, 'strana', 'strany', 'stran')} ·{' '}
                  {celkovyPocetPanelu(k)} {plural(celkovyPocetPanelu(k), 'panel', 'panely', 'panelů')}
                </span>
                <span className="cw-radek-cas">{formatujNaposledyUpraveno(k.upravenoAt)}</span>
              </button>
              <button className="cw-icon-btn danger" onClick={() => smazatKomiks(k)} aria-label={`Smazat ${k.nazev}`}>
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <KomiksEditor
      komiks={aktivni}
      onZpet={() => setAktivniId(null)}
      updateKomiks={updateKomiks}
      setCilStran={setCilStran}
      addStrana={addStrana}
      deleteStrana={deleteStrana}
      addPanel={addPanel}
      updatePanel={updatePanel}
      deletePanel={deletePanel}
      addRadek={addRadek}
      updateRadek={updateRadek}
      deleteRadek={deleteRadek}
      presunStranu={presunStranu}
    />
  )
}

interface KomiksEditorProps {
  komiks: Komiks
  onZpet: () => void
  updateKomiks: (id: string, nazev: string) => void
  setCilStran: (komiksId: string, cil: number | null) => void
  addStrana: (komiksId: string) => void
  deleteStrana: (komiksId: string, stranaId: string) => void
  addPanel: (komiksId: string, stranaId: string, vizual: string) => void
  updatePanel: (komiksId: string, stranaId: string, panelId: string, vizual: string) => void
  deletePanel: (komiksId: string, stranaId: string, panelId: string) => void
  addRadek: (komiksId: string, stranaId: string, panelId: string, data: { typ: TypRadku; postava?: string; text: string }) => void
  updateRadek: (
    komiksId: string,
    stranaId: string,
    panelId: string,
    radekId: string,
    data: { typ?: TypRadku; postava?: string; text?: string }
  ) => void
  deleteRadek: (komiksId: string, stranaId: string, panelId: string, radekId: string) => void
  presunStranu: (komiksId: string, stranaId: string, smer: 'nahoru' | 'dolu') => void
}

const KomiksEditor: React.FC<KomiksEditorProps> = ({
  komiks,
  onZpet,
  updateKomiks,
  setCilStran,
  addStrana,
  deleteStrana,
  addPanel,
  updatePanel,
  deletePanel,
  addRadek,
  updateRadek,
  deleteRadek,
  presunStranu,
}) => {
  const [aktivniStranaId, setAktivniStranaId] = useState<string | null>(komiks.strany[0]?.id ?? null)
  const [novyVizual, setNovyVizual] = useState('')
  const [radekFormPanelId, setRadekFormPanelId] = useState<string | null>(null)
  const [radekTyp, setRadekTyp] = useState<TypRadku>('dialog')
  const [radekPostava, setRadekPostava] = useState('')
  const [radekText, setRadekText] = useState('')
  const [nahledOtevren, setNahledOtevren] = useState(false)

  // Úprava existujícího panelu/řádku sdílí stejný formulář jako
  // přidávání nového — tahle dvě id říkají, jestli je aktuálně otevřený
  // formulář v editačním režimu (a nad kterou konkrétní položkou).
  const [upravovanyPanelId, setUpravovanyPanelId] = useState<string | null>(null)
  const [upravovanyVizual, setUpravovanyVizual] = useState('')
  const [upravovanyRadek, setUpravovanyRadek] = useState<{ panelId: string; radekId: string } | null>(null)

  const indexAktivni = komiks.strany.findIndex((s) => s.id === aktivniStranaId)
  const aktivniStrana = indexAktivni >= 0 ? komiks.strany[indexAktivni] : null

  const pridatStranu = () => {
    addStrana(komiks.id)
  }

  const pridatPanel = () => {
    if (!aktivniStrana || !novyVizual.trim()) return
    addPanel(komiks.id, aktivniStrana.id, novyVizual)
    setNovyVizual('')
  }

  const otevritUpravuPanelu = (panelId: string, vizual: string) => {
    setUpravovanyPanelId(panelId)
    setUpravovanyVizual(vizual)
  }

  const ulozitUpravuPanelu = () => {
    if (!aktivniStrana || !upravovanyPanelId || !upravovanyVizual.trim()) return
    updatePanel(komiks.id, aktivniStrana.id, upravovanyPanelId, upravovanyVizual)
    setUpravovanyPanelId(null)
  }

  const otevritPridaniRadku = (panelId: string) => {
    setRadekTyp('dialog')
    setRadekPostava('')
    setRadekText('')
    setUpravovanyRadek(null)
    setRadekFormPanelId(panelId)
  }

  const otevritUpravuRadku = (panelId: string, radekId: string, typ: TypRadku, postava: string, text: string) => {
    setRadekTyp(typ)
    setRadekPostava(postava)
    setRadekText(text)
    setUpravovanyRadek({ panelId, radekId })
    setRadekFormPanelId(panelId)
  }

  const pridatRadek = (panelId: string) => {
    if (!aktivniStrana || !radekText.trim()) return
    if (upravovanyRadek) {
      updateRadek(komiks.id, aktivniStrana.id, upravovanyRadek.panelId, upravovanyRadek.radekId, {
        typ: radekTyp,
        postava: radekPostava,
        text: radekText,
      })
    } else {
      addRadek(komiks.id, aktivniStrana.id, panelId, { typ: radekTyp, postava: radekPostava, text: radekText })
    }
    setRadekPostava('')
    setRadekText('')
    setUpravovanyRadek(null)
    setRadekFormPanelId(null)
  }

  const smazatAktivniStranu = () => {
    if (!aktivniStrana) return
    if (window.confirm(`Smazat stranu ${aktivniStrana.cislo}?`)) {
      deleteStrana(komiks.id, aktivniStrana.id)
      setAktivniStranaId(null)
    }
  }

  const smazatPanel = (panelId: string, poradi: number) => {
    if (!aktivniStrana) return
    if (window.confirm(`Smazat panel ${poradi}?`)) deletePanel(komiks.id, aktivniStrana.id, panelId)
  }

  const celkem = komiks.strany.length
  const cilProcenta = komiks.cilStran && komiks.cilStran > 0 ? Math.min(100, Math.round((celkem / komiks.cilStran) * 100)) : null

  if (nahledOtevren) {
    return <KomiksNahled komiks={komiks} onZpet={() => setNahledOtevren(false)} />
  }

  return (
    <div className="cw-app">
      <div className="cw-header">
        <button className="cw-zpet-btn" onClick={onZpet} aria-label="Zpět na seznam komiksů">
          ←
        </button>
        <div className="cw-header-text">
          <input
            className="cw-header-nazev"
            value={komiks.nazev}
            onChange={(e) => updateKomiks(komiks.id, e.target.value)}
            maxLength={60}
            aria-label="Název komiksu"
          />
          <span>
            {komiks.strany.length} {plural(komiks.strany.length, 'strana', 'strany', 'stran')}
            {komiks.cilStran ? ` / ${komiks.cilStran}` : ''}
          </span>
        </div>
        <button className="cw-nahled-btn" onClick={() => setNahledOtevren(true)} aria-label="Otevřít náhled celého komiksu">
          👁 Náhled
        </button>
      </div>

      {cilProcenta !== null && (
        <div className="cw-cil-lista" role="progressbar" aria-valuenow={cilProcenta} aria-valuemin={0} aria-valuemax={100}>
          <div className="cw-cil-vypln" style={{ width: `${cilProcenta}%` }} />
        </div>
      )}

      <div className="cw-chip-row">
        {komiks.strany.map((s) => (
          <button
            key={s.id}
            className={`cw-chip${aktivniStranaId === s.id ? ' active' : ''}`}
            onClick={() => setAktivniStranaId(s.id)}
          >
            Str. {s.cislo}
          </button>
        ))}
        <button className="cw-plus-chip" onClick={pridatStranu} aria-label="Přidat stranu">
          +
        </button>
      </div>

      {!aktivniStrana ? (
        <p className="cw-prazdno">Zatím žádná strana. Přidej první tlačítkem „+“.</p>
      ) : (
        <>
          <div className="cw-page-head">
            <strong>Strana {aktivniStrana.cislo}</strong>
            <div className="cw-page-head-btns">
              <div className="cw-posun-btns">
                <button
                  className="cw-posun-btn"
                  onClick={() => presunStranu(komiks.id, aktivniStrana.id, 'nahoru')}
                  disabled={indexAktivni <= 0}
                  aria-label="Posunout stranu nahoru"
                >
                  ↑
                </button>
                <button
                  className="cw-posun-btn"
                  onClick={() => presunStranu(komiks.id, aktivniStrana.id, 'dolu')}
                  disabled={indexAktivni >= komiks.strany.length - 1}
                  aria-label="Posunout stranu dolů"
                >
                  ↓
                </button>
              </div>
              <button className="cw-icon-btn danger" onClick={smazatAktivniStranu}>
                Smazat stranu
              </button>
            </div>
          </div>

          {aktivniStrana.panely.length === 0 && <p className="cw-prazdno">Strana zatím nemá žádný panel.</p>}

          {aktivniStrana.panely.map((p, i) => (
            <div className="cw-panel-card" key={p.id}>
              <div className="cw-panel-head">
                <span>
                  <span className="cw-panel-num">{i + 1}</span>
                  <b>Panel {i + 1}</b>
                </span>
                <div className="cw-panel-head-btns">
                  <button className="cw-mini-upravit" onClick={() => otevritUpravuPanelu(p.id, p.vizual)} aria-label="Upravit vizuál panelu">
                    ✏️
                  </button>
                  <button className="cw-mini-smazat" onClick={() => smazatPanel(p.id, i + 1)}>
                    ✕
                  </button>
                </div>
              </div>

              <div className="cw-panel-label">Vizuál</div>
              {upravovanyPanelId === p.id ? (
                <div className="cw-radek-form">
                  <input type="text" value={upravovanyVizual} onChange={(e) => setUpravovanyVizual(e.target.value)} />
                  <div className="cw-form-akce">
                    <button className="cw-zrusit-btn" onClick={() => setUpravovanyPanelId(null)}>
                      Zrušit
                    </button>
                    <button className="cw-ulozit-btn" onClick={ulozitUpravuPanelu}>
                      Uložit
                    </button>
                  </div>
                </div>
              ) : (
                <div className="cw-panel-visual">{p.vizual}</div>
              )}

              {p.radky.map((r) => (
                <div className="cw-panel-line" key={r.id}>
                  <div>
                    <span className="cw-panel-label cw-panel-label--radek">{r.typ === 'dialog' ? 'Dialog' : 'Popisek'}</span>
                    {r.typ === 'dialog' && r.postava && <b> {r.postava.toUpperCase()}:</b>} {r.text}
                  </div>
                  <div className="cw-panel-line-btns">
                    <button
                      className="cw-mini-upravit"
                      onClick={() => otevritUpravuRadku(p.id, r.id, r.typ, r.postava, r.text)}
                      aria-label="Upravit řádek"
                    >
                      ✏️
                    </button>
                    <button className="cw-mini-smazat" onClick={() => deleteRadek(komiks.id, aktivniStrana.id, p.id, r.id)}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}

              {radekFormPanelId === p.id ? (
                <div className="cw-radek-form">
                  <div className="cw-radek-form-row">
                    <select value={radekTyp} onChange={(e) => setRadekTyp(e.target.value as TypRadku)}>
                      <option value="dialog">Dialog</option>
                      <option value="popisek">Popisek</option>
                    </select>
                    {radekTyp === 'dialog' && (
                      <input type="text" placeholder="Postava" value={radekPostava} onChange={(e) => setRadekPostava(e.target.value)} />
                    )}
                  </div>
                  <input type="text" placeholder="Text…" value={radekText} onChange={(e) => setRadekText(e.target.value)} />
                  <div className="cw-form-akce">
                    <button
                      className="cw-zrusit-btn"
                      onClick={() => {
                        setUpravovanyRadek(null)
                        setRadekFormPanelId(null)
                      }}
                    >
                      Zrušit
                    </button>
                    <button className="cw-ulozit-btn" onClick={() => pridatRadek(p.id)}>
                      {upravovanyRadek ? 'Uložit' : 'Přidat'}
                    </button>
                  </div>
                </div>
              ) : (
                <button className="cw-pridat-radek-btn" onClick={() => otevritPridaniRadku(p.id)}>
                  + Dialog / Popisek
                </button>
              )}
            </div>
          ))}

          <div className="cw-novy-panel">
            <input type="text" placeholder="Popiš, co je v novém panelu vidět…" value={novyVizual} onChange={(e) => setNovyVizual(e.target.value)} />
            <button className="cw-ulozit-btn" onClick={pridatPanel}>
              + Přidat panel
            </button>
          </div>
        </>
      )}

      <div className="cw-cil-radek">
        <label htmlFor="cw-cil">Cíl počtu stran na celý komiks</label>
        <input
          id="cw-cil"
          type="number"
          min={0}
          placeholder="např. 20"
          value={komiks.cilStran ?? ''}
          onChange={(e) => setCilStran(komiks.id, e.target.value === '' ? null : Math.max(0, Number(e.target.value)))}
        />
      </div>
    </div>
  )
}

const KomiksNahled: React.FC<{ komiks: Komiks; onZpet: () => void }> = ({ komiks, onZpet }) => (
  <div className="cw-app">
    <div className="cw-header">
      <button className="cw-zpet-btn" onClick={onZpet} aria-label="Zpět na editor">
        ←
      </button>
      <div className="cw-header-text">
        <strong>{komiks.nazev}</strong>
        <span>Náhled celého komiksu</span>
      </div>
      <button
        className="cw-nahled-btn"
        onClick={() => stahnoutTextovySoubor(`${komiks.nazev || 'komiks'}.txt`, sestavTextKomiksu(komiks))}
      >
        ⬇ .txt
      </button>
    </div>

    {komiks.strany.length === 0 ? (
      <p className="cw-prazdno">Komiks zatím nemá žádnou stranu.</p>
    ) : (
      komiks.strany.map((s) => (
        <div key={s.id} className="cw-nahled-strana">
          <div className="cw-page-head">
            <strong>Strana {s.cislo}</strong>
          </div>
          {s.panely.length === 0 && <p className="cw-prazdno">Strana zatím nemá žádný panel.</p>}
          {s.panely.map((p, i) => (
            <div className="cw-panel-card" key={p.id}>
              <div className="cw-panel-head">
                <span>
                  <span className="cw-panel-num">{i + 1}</span>
                  <b>Panel {i + 1}</b>
                </span>
              </div>
              <div className="cw-panel-label">Vizuál</div>
              <div className="cw-panel-visual">{p.vizual}</div>
              {p.radky.map((r) => (
                <div className="cw-panel-line" key={r.id}>
                  <div>
                    <span className="cw-panel-label cw-panel-label--radek">{r.typ === 'dialog' ? 'Dialog' : 'Popisek'}</span>
                    {r.typ === 'dialog' && r.postava && <b> {r.postava.toUpperCase()}:</b>} {r.text}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))
    )}
  </div>
)
