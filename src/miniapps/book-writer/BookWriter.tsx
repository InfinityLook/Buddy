import React, { useState } from 'react'
import { useBookWriter } from './useBookWriter'
import { Kniha, celkovyPocetSlov, pocetSlov, serazenoPodleUpravy, sestavTextKnihy } from './types'
import { plural } from '@/core/utils/pluralCZ'
import { stahnoutTextovySoubor } from '@/core/utils/download'
import { formatujNaposledyUpraveno } from '@/flagships/writer-room/writerRoomFormat'
import './BookWriter.css'

export const BookWriter: React.FC = () => {
  const { knihy, addKniha, updateKniha, deleteKniha, setCilSlov, addKapitola, updateKapitola, deleteKapitola, presunKapitolu } =
    useBookWriter()
  const [aktivniKnihaId, setAktivniKnihaId] = useState<string | null>(null)
  const [novyNazev, setNovyNazev] = useState('')

  const aktivniKniha = knihy.find((k) => k.id === aktivniKnihaId) ?? null

  const zalozitKnihu = () => {
    if (!novyNazev.trim()) return
    const id = addKniha(novyNazev)
    setNovyNazev('')
    setAktivniKnihaId(id)
  }

  const smazatKnihu = (k: Kniha) => {
    if (window.confirm(`Smazat knihu „${k.nazev}“?`)) deleteKniha(k.id)
  }

  if (!aktivniKniha) {
    return (
      <div className="bw-app">
        <div className="bw-header">
          <h2>📖 Kniha</h2>
        </div>

        <div className="bw-nova-radek">
          <input
            type="text"
            placeholder="Název nové knihy"
            value={novyNazev}
            onChange={(e) => setNovyNazev(e.target.value)}
            maxLength={60}
            onKeyDown={(e) => e.key === 'Enter' && zalozitKnihu()}
          />
          <button className="bw-ulozit-btn" onClick={zalozitKnihu}>
            Založit
          </button>
        </div>

        <div className="bw-seznam">
          {knihy.length === 0 && <p className="bw-prazdno">Zatím žádná kniha. Založ první výš.</p>}
          {serazenoPodleUpravy(knihy).map((k) => (
            <div className="bw-radek" key={k.id}>
              <button className="bw-radek-otevrit" onClick={() => setAktivniKnihaId(k.id)}>
                <strong>{k.nazev}</strong>
                <span>
                  {k.kapitoly.length} {plural(k.kapitoly.length, 'kapitola', 'kapitoly', 'kapitol')} ·{' '}
                  {celkovyPocetSlov(k)} {plural(celkovyPocetSlov(k), 'slovo', 'slova', 'slov')}
                </span>
                <span className="bw-radek-cas">{formatujNaposledyUpraveno(k.upravenoAt)}</span>
              </button>
              <button className="bw-icon-btn danger" onClick={() => smazatKnihu(k)} aria-label={`Smazat ${k.nazev}`}>
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <KnihaEditor
      kniha={aktivniKniha}
      onZpet={() => setAktivniKnihaId(null)}
      updateKniha={updateKniha}
      addKapitola={addKapitola}
      updateKapitola={updateKapitola}
      deleteKapitola={deleteKapitola}
      presunKapitolu={presunKapitolu}
      setCilSlov={setCilSlov}
    />
  )
}

interface KnihaEditorProps {
  kniha: Kniha
  onZpet: () => void
  updateKniha: (id: string, nazev: string) => void
  addKapitola: (knihaId: string, nazev: string) => void
  updateKapitola: (knihaId: string, kapitolaId: string, data: { nazev?: string; text?: string }) => void
  deleteKapitola: (knihaId: string, kapitolaId: string) => void
  presunKapitolu: (knihaId: string, kapitolaId: string, smer: 'nahoru' | 'dolu') => void
  setCilSlov: (knihaId: string, cil: number | null) => void
}

const KnihaEditor: React.FC<KnihaEditorProps> = ({
  kniha,
  onZpet,
  updateKniha,
  addKapitola,
  updateKapitola,
  deleteKapitola,
  presunKapitolu,
  setCilSlov,
}) => {
  const [aktivniKapitolaId, setAktivniKapitolaId] = useState<string | null>(kniha.kapitoly[0]?.id ?? null)
  const [nahledOtevren, setNahledOtevren] = useState(false)
  const indexAktivni = kniha.kapitoly.findIndex((k) => k.id === aktivniKapitolaId)
  const aktivniKapitola = indexAktivni >= 0 ? kniha.kapitoly[indexAktivni] : null

  const pridatKapitolu = () => {
    const poradi = kniha.kapitoly.length + 1
    addKapitola(kniha.id, `Kapitola ${poradi}`)
  }

  const smazatAktivniKapitolu = () => {
    if (!aktivniKapitola) return
    if (window.confirm(`Smazat kapitolu „${aktivniKapitola.nazev}“?`)) {
      deleteKapitola(kniha.id, aktivniKapitola.id)
      setAktivniKapitolaId(null)
    }
  }

  const celkem = celkovyPocetSlov(kniha)
  const cilProcenta = kniha.cilSlov && kniha.cilSlov > 0 ? Math.min(100, Math.round((celkem / kniha.cilSlov) * 100)) : null

  if (nahledOtevren) {
    return <KnihaNahled kniha={kniha} onZpet={() => setNahledOtevren(false)} />
  }

  return (
    <div className="bw-app">
      <div className="bw-header">
        <button className="bw-zpet-btn" onClick={onZpet} aria-label="Zpět na seznam knih">
          ←
        </button>
        <div className="bw-header-text">
          <input
            className="bw-header-nazev"
            value={kniha.nazev}
            onChange={(e) => updateKniha(kniha.id, e.target.value)}
            maxLength={60}
            aria-label="Název knihy"
          />
          <span>
            {celkem} {plural(celkem, 'slovo', 'slova', 'slov')}
            {kniha.cilSlov ? ` / ${kniha.cilSlov}` : ''}
          </span>
        </div>
        <button className="bw-nahled-btn" onClick={() => setNahledOtevren(true)} aria-label="Otevřít náhled celé knihy">
          👁 Náhled
        </button>
      </div>

      {cilProcenta !== null && (
        <div className="bw-cil-lista" role="progressbar" aria-valuenow={cilProcenta} aria-valuemin={0} aria-valuemax={100}>
          <div className="bw-cil-vypln" style={{ width: `${cilProcenta}%` }} />
        </div>
      )}

      <div className="bw-chip-row">
        {kniha.kapitoly.map((k, i) => (
          <button
            key={k.id}
            className={`bw-chip${aktivniKapitolaId === k.id ? ' active' : ''}`}
            onClick={() => setAktivniKapitolaId(k.id)}
          >
            Kap. {i + 1}
          </button>
        ))}
        <button className="bw-plus-chip" onClick={pridatKapitolu} aria-label="Přidat kapitolu">
          +
        </button>
      </div>

      {!aktivniKapitola ? (
        <p className="bw-prazdno">Zatím žádná kapitola. Přidej první tlačítkem „+“.</p>
      ) : (
        <>
          <div className="bw-kapitola-hlavicka">
            <input
              className="bw-kapitola-nazev"
              value={aktivniKapitola.nazev}
              onChange={(e) => updateKapitola(kniha.id, aktivniKapitola.id, { nazev: e.target.value })}
              maxLength={60}
            />
            <div className="bw-posun-btns">
              <button
                className="bw-posun-btn"
                onClick={() => presunKapitolu(kniha.id, aktivniKapitola.id, 'nahoru')}
                disabled={indexAktivni <= 0}
                aria-label="Posunout kapitolu nahoru"
              >
                ↑
              </button>
              <button
                className="bw-posun-btn"
                onClick={() => presunKapitolu(kniha.id, aktivniKapitola.id, 'dolu')}
                disabled={indexAktivni >= kniha.kapitoly.length - 1}
                aria-label="Posunout kapitolu dolů"
              >
                ↓
              </button>
            </div>
          </div>

          <textarea
            className="bw-editor"
            value={aktivniKapitola.text}
            onChange={(e) => updateKapitola(kniha.id, aktivniKapitola.id, { text: e.target.value })}
            placeholder="Piš sem text kapitoly…"
            rows={12}
          />

          <div className="bw-spodni-radek">
            <span>
              {pocetSlov(aktivniKapitola.text)} {plural(pocetSlov(aktivniKapitola.text), 'slovo', 'slova', 'slov')} v téhle kapitole
            </span>
            <button className="bw-icon-btn danger" onClick={smazatAktivniKapitolu}>
              Smazat kapitolu
            </button>
          </div>
        </>
      )}

      <div className="bw-cil-radek">
        <label htmlFor="bw-cil">Cíl počtu slov na celou knihu</label>
        <input
          id="bw-cil"
          type="number"
          min={0}
          placeholder="např. 50000"
          value={kniha.cilSlov ?? ''}
          onChange={(e) => setCilSlov(kniha.id, e.target.value === '' ? null : Math.max(0, Number(e.target.value)))}
        />
      </div>
    </div>
  )
}

const KnihaNahled: React.FC<{ kniha: Kniha; onZpet: () => void }> = ({ kniha, onZpet }) => (
  <div className="bw-app">
    <div className="bw-header">
      <button className="bw-zpet-btn" onClick={onZpet} aria-label="Zpět na editor">
        ←
      </button>
      <div className="bw-header-text">
        <strong>{kniha.nazev}</strong>
        <span>Náhled celé knihy</span>
      </div>
      <button
        className="bw-nahled-btn"
        onClick={() => stahnoutTextovySoubor(`${kniha.nazev || 'kniha'}.txt`, sestavTextKnihy(kniha))}
      >
        ⬇ .txt
      </button>
    </div>

    <div className="bw-nahled">
      {kniha.kapitoly.length === 0 ? (
        <p className="bw-prazdno">Kniha zatím nemá žádnou kapitolu.</p>
      ) : (
        kniha.kapitoly.map((k, i) => (
          <div className="bw-nahled-kapitola" key={k.id}>
            <h3>
              {i + 1}. {k.nazev}
            </h3>
            <p className="bw-nahled-text">{k.text.trim() || '(prázdná kapitola)'}</p>
          </div>
        ))
      )}
    </div>
  </div>
)
