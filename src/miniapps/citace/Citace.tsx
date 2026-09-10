import React, { useMemo, useState } from 'react'
import { useCitace } from './useCitace'
import { Citace as CitaceZaznam, TYPY_ZDROJE, TypZdroje, sestavCitaci } from './types'
import './Citace.css'

const PRAZDNY_FORM = { autor: '', nazev: '', rok: '', vydavatelNeboWeb: '', url: '', datumCitace: '' }

export const Citace: React.FC = () => {
  const { citace, pridatCitaci, smazatCitaci } = useCitace()
  const [typ, setTyp] = useState<TypZdroje>('kniha')
  const [form, setForm] = useState(PRAZDNY_FORM)
  const [zkopirovanoId, setZkopirovanoId] = useState<string | null>(null)

  // Živý náhled ještě neuložené citace — vidí, co vznikne, dřív než
  // klikne "Přidat do seznamu".
  const nahled = useMemo(
    () =>
      sestavCitaci({
        id: 'nahled',
        typ,
        autor: form.autor,
        nazev: form.nazev,
        rok: form.rok,
        vydavatelNeboWeb: form.vydavatelNeboWeb,
        url: form.url,
        datumCitace: form.datumCitace,
        createdAt: '',
      }),
    [typ, form]
  )

  const kopirovat = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setZkopirovanoId(id)
      window.setTimeout(() => setZkopirovanoId((aktualni) => (aktualni === id ? null : aktualni)), 1500)
    } catch {
      // Schránka je bonus, ne podmínka — bez oprávnění se prostě nic nestane.
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nazev.trim()) return
    pridatCitaci(typ, form.autor, form.nazev, form.rok, form.vydavatelNeboWeb, form.url, form.datumCitace)
    setForm(PRAZDNY_FORM)
  }

  const odebrat = (c: CitaceZaznam) => {
    if (!window.confirm(`Smazat citaci „${c.nazev}“?`)) return
    smazatCitaci(c.id)
  }

  return (
    <div className="citace">
      <div className="citace-typ-radek" role="group" aria-label="Typ zdroje">
        {TYPY_ZDROJE.map((t) => (
          <button
            key={t.id}
            className={`citace-typ-btn ${typ === t.id ? 'je-vybrany' : ''}`}
            onClick={() => setTyp(t.id)}
          >
            {t.nazev}
          </button>
        ))}
      </div>

      <form className="citace-form" onSubmit={handleSubmit}>
        <input
          placeholder="Autor (Příjmení, Jméno)"
          value={form.autor}
          onChange={(e) => setForm({ ...form, autor: e.target.value })}
          spellCheck
          lang="cs"
        />
        <input
          placeholder="Název"
          value={form.nazev}
          onChange={(e) => setForm({ ...form, nazev: e.target.value })}
          spellCheck
          lang="cs"
          required
        />
        <div className="citace-form-radek">
          <input
            placeholder="Rok vydání"
            value={form.rok}
            onChange={(e) => setForm({ ...form, rok: e.target.value })}
          />
          <input
            placeholder={typ === 'kniha' ? 'Nakladatelství' : typ === 'clanek' ? 'Časopis' : 'Název webu'}
            value={form.vydavatelNeboWeb}
            onChange={(e) => setForm({ ...form, vydavatelNeboWeb: e.target.value })}
            spellCheck
            lang="cs"
          />
        </div>
        {typ === 'web' && (
          <div className="citace-form-radek">
            <input
              placeholder="URL adresa"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
            <input
              type="date"
              value={form.datumCitace}
              onChange={(e) => setForm({ ...form, datumCitace: e.target.value })}
              aria-label="Datum navštívení stránky"
            />
          </div>
        )}

        <div className="citace-nahled">
          <span className="citace-nahled-popisek">Náhled</span>
          <p>{nahled}</p>
        </div>

        <div className="citace-form-akce">
          <button type="button" className="citace-kopirovat-btn" onClick={() => kopirovat(nahled, 'nahled')}>
            {zkopirovanoId === 'nahled' ? 'Zkopírováno ✓' : '📋 Kopírovat'}
          </button>
          <button type="submit" className="citace-ulozit-btn">
            + Přidat do seznamu
          </button>
        </div>
      </form>

      {citace.length === 0 && <p className="citace-prazdno">Zatím žádné uložené citace.</p>}

      <ul className="citace-seznam">
        {citace.map((c) => {
          const text = sestavCitaci(c)
          return (
            <li key={c.id} className="citace-polozka">
              <p className="citace-polozka-text">{text}</p>
              <div className="citace-polozka-akce">
                <button className="citace-kopirovat-btn" onClick={() => kopirovat(text, c.id)}>
                  {zkopirovanoId === c.id ? 'Zkopírováno ✓' : '📋 Kopírovat'}
                </button>
                <button className="citace-smazat-btn" aria-label={`Smazat citaci ${c.nazev}`} onClick={() => odebrat(c)}>
                  ✕
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default Citace
