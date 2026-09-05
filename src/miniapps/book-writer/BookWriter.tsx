import React, { useState } from 'react'
import { useBookWriter } from './useBookWriter'
import { Kniha, celkovyPocetSlov, pocetSlov } from './types'
import { plural } from '@/core/utils/pluralCZ'
import './BookWriter.css'

export const BookWriter: React.FC = () => {
  const { knihy, addKniha, deleteKniha, setCilSlov, addKapitola, updateKapitola, deleteKapitola } = useBookWriter()
  const [aktivniKnihaId, setAktivniKnihaId] = useState<string | null>(null)
  const [novyNazev, setNovyNazev] = useState('')

  const aktivniKniha = knihy.find((k) => k.id === aktivniKnihaId) ?? null

  const zalozitKnihu = () => {
    if (!novyNazev.trim()) return
    const id = addKniha(novyNazev)
    setNovyNazev('')
    setAktivniKnihaId(id)
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
          {knihy.map((k) => (
            <div className="bw-radek" key={k.id}>
              <button className="bw-radek-otevrit" onClick={() => setAktivniKnihaId(k.id)}>
                <strong>{k.nazev}</strong>
                <span>
                  {k.kapitoly.length} {plural(k.kapitoly.length, 'kapitola', 'kapitoly', 'kapitol')} ·{' '}
                  {celkovyPocetSlov(k)} {plural(celkovyPocetSlov(k), 'slovo', 'slova', 'slov')}
                </span>
              </button>
              <button className="bw-icon-btn danger" onClick={() => deleteKniha(k.id)} aria-label={`Smazat ${k.nazev}`}>
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return <KnihaEditor kniha={aktivniKniha} onZpet={() => setAktivniKnihaId(null)} addKapitola={addKapitola} updateKapitola={updateKapitola} deleteKapitola={deleteKapitola} setCilSlov={setCilSlov} />
}

interface KnihaEditorProps {
  kniha: Kniha
  onZpet: () => void
  addKapitola: (knihaId: string, nazev: string) => void
  updateKapitola: (knihaId: string, kapitolaId: string, data: { nazev?: string; text?: string }) => void
  deleteKapitola: (knihaId: string, kapitolaId: string) => void
  setCilSlov: (knihaId: string, cil: number | null) => void
}

const KnihaEditor: React.FC<KnihaEditorProps> = ({ kniha, onZpet, addKapitola, updateKapitola, deleteKapitola, setCilSlov }) => {
  const [aktivniKapitolaId, setAktivniKapitolaId] = useState<string | null>(kniha.kapitoly[0]?.id ?? null)
  const aktivniKapitola = kniha.kapitoly.find((k) => k.id === aktivniKapitolaId) ?? null

  const pridatKapitolu = () => {
    const poradi = kniha.kapitoly.length + 1
    addKapitola(kniha.id, `Kapitola ${poradi}`)
  }

  const celkem = celkovyPocetSlov(kniha)

  return (
    <div className="bw-app">
      <div className="bw-header">
        <button className="bw-zpet-btn" onClick={onZpet} aria-label="Zpět na seznam knih">
          ←
        </button>
        <div className="bw-header-text">
          <strong>{kniha.nazev}</strong>
          <span>
            {celkem} {plural(celkem, 'slovo', 'slova', 'slov')}
            {kniha.cilSlov ? ` / ${kniha.cilSlov}` : ''}
          </span>
        </div>
      </div>

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
          <input
            className="bw-kapitola-nazev"
            value={aktivniKapitola.nazev}
            onChange={(e) => updateKapitola(kniha.id, aktivniKapitola.id, { nazev: e.target.value })}
            maxLength={60}
          />

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
            <button className="bw-icon-btn danger" onClick={() => deleteKapitola(kniha.id, aktivniKapitola.id)}>
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
