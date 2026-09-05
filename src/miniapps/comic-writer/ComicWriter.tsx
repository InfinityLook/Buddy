import React, { useState } from 'react'
import { useComicWriter } from './useComicWriter'
import { celkovyPocetPanelu, Komiks, TypRadku } from './types'
import { plural } from '@/core/utils/pluralCZ'
import './ComicWriter.css'

export const ComicWriter: React.FC = () => {
  const { komiksy, addKomiks, deleteKomiks, addStrana, deleteStrana, addPanel, deletePanel, addRadek, deleteRadek } = useComicWriter()
  const [aktivniId, setAktivniId] = useState<string | null>(null)
  const [novyNazev, setNovyNazev] = useState('')

  const aktivni = komiksy.find((k) => k.id === aktivniId) ?? null

  const zalozit = () => {
    if (!novyNazev.trim()) return
    const id = addKomiks(novyNazev)
    setNovyNazev('')
    setAktivniId(id)
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
          {komiksy.map((k) => (
            <div className="cw-radek" key={k.id}>
              <button className="cw-radek-otevrit" onClick={() => setAktivniId(k.id)}>
                <strong>{k.nazev}</strong>
                <span>
                  {k.strany.length} {plural(k.strany.length, 'strana', 'strany', 'stran')} ·{' '}
                  {celkovyPocetPanelu(k)} {plural(celkovyPocetPanelu(k), 'panel', 'panely', 'panelů')}
                </span>
              </button>
              <button className="cw-icon-btn danger" onClick={() => deleteKomiks(k.id)} aria-label={`Smazat ${k.nazev}`}>
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
      addStrana={addStrana}
      deleteStrana={deleteStrana}
      addPanel={addPanel}
      deletePanel={deletePanel}
      addRadek={addRadek}
      deleteRadek={deleteRadek}
    />
  )
}

interface KomiksEditorProps {
  komiks: Komiks
  onZpet: () => void
  addStrana: (komiksId: string) => void
  deleteStrana: (komiksId: string, stranaId: string) => void
  addPanel: (komiksId: string, stranaId: string, vizual: string) => void
  deletePanel: (komiksId: string, stranaId: string, panelId: string) => void
  addRadek: (komiksId: string, stranaId: string, panelId: string, data: { typ: TypRadku; postava?: string; text: string }) => void
  deleteRadek: (komiksId: string, stranaId: string, panelId: string, radekId: string) => void
}

const KomiksEditor: React.FC<KomiksEditorProps> = ({ komiks, onZpet, addStrana, deleteStrana, addPanel, deletePanel, addRadek, deleteRadek }) => {
  const [aktivniStranaId, setAktivniStranaId] = useState<string | null>(komiks.strany[0]?.id ?? null)
  const [novyVizual, setNovyVizual] = useState('')
  const [radekFormPanelId, setRadekFormPanelId] = useState<string | null>(null)
  const [radekTyp, setRadekTyp] = useState<TypRadku>('dialog')
  const [radekPostava, setRadekPostava] = useState('')
  const [radekText, setRadekText] = useState('')

  const aktivniStrana = komiks.strany.find((s) => s.id === aktivniStranaId) ?? null

  const pridatStranu = () => {
    addStrana(komiks.id)
  }

  const pridatPanel = () => {
    if (!aktivniStrana || !novyVizual.trim()) return
    addPanel(komiks.id, aktivniStrana.id, novyVizual)
    setNovyVizual('')
  }

  const pridatRadek = (panelId: string) => {
    if (!aktivniStrana || !radekText.trim()) return
    addRadek(komiks.id, aktivniStrana.id, panelId, { typ: radekTyp, postava: radekPostava, text: radekText })
    setRadekPostava('')
    setRadekText('')
    setRadekFormPanelId(null)
  }

  return (
    <div className="cw-app">
      <div className="cw-header">
        <button className="cw-zpet-btn" onClick={onZpet} aria-label="Zpět na seznam komiksů">
          ←
        </button>
        <div className="cw-header-text">
          <strong>{komiks.nazev}</strong>
          <span>{komiks.strany.length} {plural(komiks.strany.length, 'strana', 'strany', 'stran')}</span>
        </div>
      </div>

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
            <button className="cw-icon-btn danger" onClick={() => { deleteStrana(komiks.id, aktivniStrana.id); setAktivniStranaId(null) }}>
              Smazat stranu
            </button>
          </div>

          {aktivniStrana.panely.length === 0 && <p className="cw-prazdno">Strana zatím nemá žádný panel.</p>}

          {aktivniStrana.panely.map((p, i) => (
            <div className="cw-panel-card" key={p.id}>
              <div className="cw-panel-head">
                <span>
                  <span className="cw-panel-num">{i + 1}</span>
                  <b>Panel {i + 1}</b>
                </span>
                <button className="cw-mini-smazat" onClick={() => deletePanel(komiks.id, aktivniStrana.id, p.id)}>
                  ✕
                </button>
              </div>

              <div className="cw-panel-label">Vizuál</div>
              <div className="cw-panel-visual">{p.vizual}</div>

              {p.radky.map((r) => (
                <div className="cw-panel-line" key={r.id}>
                  <div>
                    <span className="cw-panel-label cw-panel-label--radek">{r.typ === 'dialog' ? 'Dialog' : 'Popisek'}</span>
                    {r.typ === 'dialog' && r.postava && <b> {r.postava.toUpperCase()}:</b>} {r.text}
                  </div>
                  <button className="cw-mini-smazat" onClick={() => deleteRadek(komiks.id, aktivniStrana.id, p.id, r.id)}>
                    ✕
                  </button>
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
                    <button className="cw-zrusit-btn" onClick={() => setRadekFormPanelId(null)}>
                      Zrušit
                    </button>
                    <button className="cw-ulozit-btn" onClick={() => pridatRadek(p.id)}>
                      Přidat
                    </button>
                  </div>
                </div>
              ) : (
                <button className="cw-pridat-radek-btn" onClick={() => setRadekFormPanelId(p.id)}>
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
    </div>
  )
}
