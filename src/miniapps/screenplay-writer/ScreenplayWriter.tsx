import React, { useState } from 'react'
import { useScreenplayWriter } from './useScreenplayWriter'
import { nadpisSceny, Scenar, TYPY_MIST, TypMista } from './types'
import { plural } from '@/core/utils/pluralCZ'
import './ScreenplayWriter.css'

export const ScreenplayWriter: React.FC = () => {
  const { scenare, addScenar, deleteScenar, addScena, deleteScena, addAkce, addDialog, deletePrvek } = useScreenplayWriter()
  const [aktivniId, setAktivniId] = useState<string | null>(null)
  const [novyNazev, setNovyNazev] = useState('')

  const aktivni = scenare.find((s) => s.id === aktivniId) ?? null

  const zalozit = () => {
    if (!novyNazev.trim()) return
    const id = addScenar(novyNazev)
    setNovyNazev('')
    setAktivniId(id)
  }

  if (!aktivni) {
    return (
      <div className="sw-app">
        <div className="sw-header">
          <h2>🎬 Scénář</h2>
        </div>

        <div className="sw-nova-radek">
          <input
            type="text"
            placeholder="Název nového scénáře"
            value={novyNazev}
            onChange={(e) => setNovyNazev(e.target.value)}
            maxLength={60}
            onKeyDown={(e) => e.key === 'Enter' && zalozit()}
          />
          <button className="sw-ulozit-btn" onClick={zalozit}>
            Založit
          </button>
        </div>

        <div className="sw-seznam">
          {scenare.length === 0 && <p className="sw-prazdno">Zatím žádný scénář. Založ první výš.</p>}
          {scenare.map((s) => (
            <div className="sw-radek" key={s.id}>
              <button className="sw-radek-otevrit" onClick={() => setAktivniId(s.id)}>
                <strong>{s.nazev}</strong>
                <span>{s.sceny.length} {plural(s.sceny.length, 'scéna napsána', 'scény napsány', 'scén napsáno')}</span>
              </button>
              <button className="sw-icon-btn danger" onClick={() => deleteScenar(s.id)} aria-label={`Smazat ${s.nazev}`}>
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <ScenarEditor
      scenar={aktivni}
      onZpet={() => setAktivniId(null)}
      addScena={addScena}
      deleteScena={deleteScena}
      addAkce={addAkce}
      addDialog={addDialog}
      deletePrvek={deletePrvek}
    />
  )
}

interface ScenarEditorProps {
  scenar: Scenar
  onZpet: () => void
  addScena: (scenarId: string, data: { typMista: TypMista; misto: string; cas: string }) => void
  deleteScena: (scenarId: string, scenaId: string) => void
  addAkce: (scenarId: string, scenaId: string, text: string) => void
  addDialog: (scenarId: string, scenaId: string, data: { postava: string; text: string; poznamka?: string }) => void
  deletePrvek: (scenarId: string, scenaId: string, prvekId: string) => void
}

const ScenarEditor: React.FC<ScenarEditorProps> = ({ scenar, onZpet, addScena, deleteScena, addAkce, addDialog, deletePrvek }) => {
  const [aktivniScenaId, setAktivniScenaId] = useState<string | null>(scenar.sceny[0]?.id ?? null)
  const [formOtevren, setFormOtevren] = useState<'scena' | 'akce' | 'dialog' | null>(null)

  const [typMista, setTypMista] = useState<TypMista>('INT')
  const [misto, setMisto] = useState('')
  const [cas, setCas] = useState('DEN')
  const [akceText, setAkceText] = useState('')
  const [postava, setPostava] = useState('')
  const [dialogText, setDialogText] = useState('')
  const [poznamka, setPoznamka] = useState('')

  const indexAktivni = scenar.sceny.findIndex((s) => s.id === aktivniScenaId)
  const aktivniScena = indexAktivni >= 0 ? scenar.sceny[indexAktivni] : null

  const pridatScenu = () => {
    if (!misto.trim()) return
    addScena(scenar.id, { typMista, misto, cas })
    setMisto('')
    setFormOtevren(null)
  }

  const pridatAkci = () => {
    if (!aktivniScena || !akceText.trim()) return
    addAkce(scenar.id, aktivniScena.id, akceText)
    setAkceText('')
    setFormOtevren(null)
  }

  const pridatDialog = () => {
    if (!aktivniScena || !dialogText.trim()) return
    addDialog(scenar.id, aktivniScena.id, { postava, text: dialogText, poznamka })
    setPostava('')
    setDialogText('')
    setPoznamka('')
    setFormOtevren(null)
  }

  const smazatAktivniScenu = () => {
    if (!aktivniScena) return
    deleteScena(scenar.id, aktivniScena.id)
    setAktivniScenaId(null)
  }

  return (
    <div className="sw-app">
      <div className="sw-header">
        <button className="sw-zpet-btn" onClick={onZpet} aria-label="Zpět na seznam scénářů">
          ←
        </button>
        <div className="sw-header-text">
          <strong>{scenar.nazev}</strong>
          <span>{scenar.sceny.length} {plural(scenar.sceny.length, 'scéna', 'scény', 'scén')}</span>
        </div>
      </div>

      <div className="sw-chip-row">
        {scenar.sceny.map((s, i) => (
          <button
            key={s.id}
            className={`sw-chip${aktivniScenaId === s.id ? ' active' : ''}`}
            onClick={() => setAktivniScenaId(s.id)}
          >
            Sc. {i + 1}
          </button>
        ))}
        <button className="sw-plus-chip" onClick={() => setFormOtevren('scena')} aria-label="Přidat scénu">
          +
        </button>
      </div>

      {formOtevren === 'scena' && (
        <div className="sw-form">
          <div className="sw-form-radek">
            <select value={typMista} onChange={(e) => setTypMista(e.target.value as TypMista)}>
              {TYPY_MIST.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input type="text" placeholder="Místo, např. Kavárna" value={misto} onChange={(e) => setMisto(e.target.value)} />
          </div>
          <input type="text" placeholder="Čas, např. Den" value={cas} onChange={(e) => setCas(e.target.value)} />
          <div className="sw-form-akce">
            <button className="sw-zrusit-btn" onClick={() => setFormOtevren(null)}>
              Zrušit
            </button>
            <button className="sw-ulozit-btn" onClick={pridatScenu}>
              Přidat scénu
            </button>
          </div>
        </div>
      )}

      {!aktivniScena ? (
        <p className="sw-prazdno">Zatím žádná scéna. Přidej první tlačítkem „+“.</p>
      ) : (
        <>
          <div className="sw-script-page">
            <div className="sw-sc-heading">{nadpisSceny(aktivniScena, indexAktivni + 1)}</div>

            {aktivniScena.prvky.length === 0 && <p className="sw-sc-prazdno">Scéna zatím nemá žádný text.</p>}

            {aktivniScena.prvky.map((p) =>
              p.typ === 'akce' ? (
                <div className="sw-sc-prvek" key={p.id}>
                  <p className="sw-sc-action">{p.text}</p>
                  <button className="sw-sc-smazat" onClick={() => deletePrvek(scenar.id, aktivniScena.id, p.id)}>
                    ✕
                  </button>
                </div>
              ) : (
                <div className="sw-sc-prvek" key={p.id}>
                  <div className="sw-sc-character">{p.postava.toUpperCase()}</div>
                  {p.poznamka && <div className="sw-sc-paren">({p.poznamka})</div>}
                  <p className="sw-sc-dialogue">{p.text}</p>
                  <button className="sw-sc-smazat" onClick={() => deletePrvek(scenar.id, aktivniScena.id, p.id)}>
                    ✕
                  </button>
                </div>
              )
            )}
          </div>

          {formOtevren === 'akce' && (
            <div className="sw-form">
              <textarea placeholder="Popiš, co se v téhle chvíli děje…" value={akceText} onChange={(e) => setAkceText(e.target.value)} rows={2} />
              <div className="sw-form-akce">
                <button className="sw-zrusit-btn" onClick={() => setFormOtevren(null)}>
                  Zrušit
                </button>
                <button className="sw-ulozit-btn" onClick={pridatAkci}>
                  Přidat akci
                </button>
              </div>
            </div>
          )}

          {formOtevren === 'dialog' && (
            <div className="sw-form">
              <input type="text" placeholder="Jméno postavy" value={postava} onChange={(e) => setPostava(e.target.value)} />
              <input type="text" placeholder="Herecká poznámka (nepovinné)" value={poznamka} onChange={(e) => setPoznamka(e.target.value)} />
              <textarea placeholder="Text repliky…" value={dialogText} onChange={(e) => setDialogText(e.target.value)} rows={2} />
              <div className="sw-form-akce">
                <button className="sw-zrusit-btn" onClick={() => setFormOtevren(null)}>
                  Zrušit
                </button>
                <button className="sw-ulozit-btn" onClick={pridatDialog}>
                  Přidat repliku
                </button>
              </div>
            </div>
          )}

          {!formOtevren && (
            <div className="sw-toolbar">
              <button className="sw-btn" onClick={() => setFormOtevren('akce')}>
                + Akce
              </button>
              <button className="sw-btn" onClick={() => setFormOtevren('dialog')}>
                + Postava
              </button>
              <button className="sw-btn" onClick={() => setFormOtevren('scena')}>
                + Scéna
              </button>
            </div>
          )}

          <button className="sw-smazat-scenu" onClick={smazatAktivniScenu}>
            Smazat tuhle scénu
          </button>
        </>
      )}
    </div>
  )
}
