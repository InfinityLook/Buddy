import React, { useState } from 'react'
import { useFinance } from './useFinance'
import {
  FinanceCategory,
  KategorieVysek,
  MesicniBod,
  OBDOBI_LABELS,
  ObdobiFiltr,
  Transaction,
  TransactionType,
  TYP_LABELS,
  TypFiltr,
  categoriesFor,
} from './types'
import './Finance.css'

// Emoji u kategorií jsou jen popisek pro oko v seznamu a legendě grafu —
// nikde se podle nich nerozhoduje, takže přidání kategorie bez ikony
// aplikaci nerozbije, jen bude řádek o chlup míň ozdobný.
const CATEGORY_ICONS: Record<FinanceCategory, string> = {
  Kapesné: '👛',
  Brigáda: '💼',
  Dar: '🎁',
  'Ostatní příjem': '➕',
  Jídlo: '🍔',
  Doprava: '🚌',
  Zábava: '🎮',
  Škola: '🎒',
  Oblečení: '👕',
  Úspory: '🏦',
  'Ostatní výdaj': '➖',
}

// Sedm barev pro sedm kategorií výdajů — víc jich sada nemá. Prvních pět
// jsou přesně odstíny použité pro barvy dlaždic v Apps, ať Finance
// nepůsobí jako cizí paleta; poslední dvě je doplňují na stejné úrovni
// syté sytosti a jasu.
const PALETA = ['#38bdf8', '#a855f7', '#f472b6', '#fbbf24', '#34d399', '#f87171', '#818cf8']

const formatKc = (amount: number): string => `${Math.round(amount).toLocaleString('cs-CZ')} Kč`

const formatDatum = (iso: string): string => {
  const [rok, mesic, den] = iso.split('-')
  return `${den}.${mesic}.${rok.slice(2)}`
}

const dnesniDatum = () => new Date().toISOString().slice(0, 10)

interface DonutProps {
  vysece: KategorieVysek[]
}

/** Koláčový graf jako otáčivý přechod s vyříznutou dírou uprostřed.
 *  Díra jde přes masku, ne přes vrstvu barvy pozadí — ta by musela znát
 *  přesně to, co je pod ní, a s průhledným podkladem karty by nikdy
 *  neseděla (přesně tahle past se dřív stala prstenci kolem koule v Hubu).
 *
 *  Popisek uprostřed proto NENÍ potomkem maskovaného prvku — maska
 *  se aplikuje na celé vykreslení elementu včetně dětí, takže text uvnitř
 *  by zmizel spolu s dírou, přesně v místě, kde má být čitelný. Prstenec
 *  a popisek jsou sourozenci navrstvení přes sebe v obalu s position: relative. */
const Donut: React.FC<DonutProps> = ({ vysece }) => {
  if (vysece.length === 0) {
    return (
      <div className="fin-donut-wrap">
        <div className="fin-donut fin-donut--prazdny" aria-hidden="true" />
        <span className="fin-donut-stred">—</span>
      </div>
    )
  }

  let odkud = 0
  const casti = vysece.map((v, i) => {
    const kam = odkud + v.percent
    const barva = PALETA[i % PALETA.length]
    const text = `${barva} ${odkud}% ${kam}%`
    odkud = kam
    return text
  })

  const celkem = vysece.reduce((s, v) => s + v.amount, 0)

  return (
    <div
      className="fin-donut-wrap"
      role="img"
      aria-label={`Rozdělení podle kategorií, celkem ${formatKc(celkem)}`}
    >
      <div className="fin-donut" style={{ background: `conic-gradient(${casti.join(', ')})` }} />
      <span className="fin-donut-stred">{formatKc(celkem)}</span>
    </div>
  )
}

const TrendGraf: React.FC<{ body: MesicniBod[] }> = ({ body }) => {
  const maxHodnota = Math.max(1, ...body.map((b) => Math.max(b.prijmy, b.vydaje)))

  return (
    <div className="fin-trend">
      {body.map((b) => (
        <div key={b.mesic} className="fin-trend-sloupec">
          <div className="fin-trend-tyc-wrap">
            <div
              className="fin-trend-tyc fin-trend-tyc--prijem"
              style={{ height: `${(b.prijmy / maxHodnota) * 100}%` }}
              title={`Příjmy: ${formatKc(b.prijmy)}`}
            />
            <div
              className="fin-trend-tyc fin-trend-tyc--vydaj"
              style={{ height: `${(b.vydaje / maxHodnota) * 100}%` }}
              title={`Výdaje: ${formatKc(b.vydaje)}`}
            />
          </div>
          <span className="fin-trend-label">{b.label}</span>
        </div>
      ))}
    </div>
  )
}

export const Finance: React.FC = () => {
  const {
    seznam,
    pocetCelkem,
    typFiltr,
    setTypFiltr,
    obdobiFiltr,
    setObdobiFiltr,
    zustatek,
    prijmyObdobi,
    vydajeObdobi,
    kategorieVydaje,
    kategoriePrijmy,
    mesicniTrend,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useFinance()

  const [donutTyp, setDonutTyp] = useState<TransactionType>('vydaj')

  // null = zavřeno, '' = zakládá se nová transakce, jinak id upravované
  const [editingId, setEditingId] = useState<string | null>(null)
  const [type, setType] = useState<TransactionType>('vydaj')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<FinanceCategory>('Jídlo')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(dnesniDatum())

  const isFormOpen = editingId !== null

  const openAdd = () => {
    setType('vydaj')
    setAmount('')
    setCategory('Jídlo')
    setNote('')
    setDate(dnesniDatum())
    setEditingId('')
  }

  const openEdit = (t: Transaction) => {
    setType(t.type)
    setAmount(String(t.amount))
    setCategory(t.category)
    setNote(t.note)
    setDate(t.date)
    setEditingId(t.id)
  }

  const closeForm = () => setEditingId(null)

  const zmenType = (novy: TransactionType) => {
    setType(novy)
    // Kategorie patří jen jednomu typu — při přepnutí se musí vybrat
    // znovu, jinak by u výdaje zůstalo vybrané "Kapesné".
    setCategory(categoriesFor(novy)[0])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const castka = Math.round(Number(amount))
    if (!Number.isFinite(castka) || castka <= 0) return

    const input = { type, amount: castka, category, note: note.trim(), date }
    if (editingId) updateTransaction(editingId, input)
    else addTransaction(input)
    closeForm()
  }

  const handleDelete = (t: Transaction) => {
    if (window.confirm(`Smazat záznam „${t.note || t.category}“?`)) {
      deleteTransaction(t.id)
      if (editingId === t.id) closeForm()
    }
  }

  const bilanceObdobi = prijmyObdobi - vydajeObdobi
  const donutData = donutTyp === 'vydaj' ? kategorieVydaje : kategoriePrijmy

  return (
    <div className="fin-app">
      <div className="fin-header">
        <h2>Finance</h2>
        <button className="fin-add-btn" onClick={isFormOpen ? closeForm : openAdd}>
          {isFormOpen ? '✕' : '+ Záznam'}
        </button>
      </div>

      <div className="fin-zustatek-card">
        <span className="fin-zustatek-label">Aktuální zůstatek</span>
        <span className={`fin-zustatek-castka ${zustatek < 0 ? 'je-zaporny' : ''}`}>
          {formatKc(zustatek)}
        </span>
      </div>

      <div className="fin-filters">
        {(Object.keys(OBDOBI_LABELS) as ObdobiFiltr[]).map((o) => (
          <button
            key={o}
            className={`fin-filter-chip ${obdobiFiltr === o ? 'active' : ''}`}
            onClick={() => setObdobiFiltr(o)}
          >
            {OBDOBI_LABELS[o]}
          </button>
        ))}
      </div>

      <div className="fin-summary-row">
        <div className="fin-summary-card fin-summary-card--prijem">
          <span className="fin-summary-label">Příjmy</span>
          <span className="fin-summary-castka">+{formatKc(prijmyObdobi)}</span>
        </div>
        <div className="fin-summary-card fin-summary-card--vydaj">
          <span className="fin-summary-label">Výdaje</span>
          <span className="fin-summary-castka">−{formatKc(vydajeObdobi)}</span>
        </div>
        <div className="fin-summary-card">
          <span className="fin-summary-label">Bilance</span>
          <span className={`fin-summary-castka ${bilanceObdobi < 0 ? 'je-zaporny' : 'je-kladny'}`}>
            {bilanceObdobi >= 0 ? '+' : ''}
            {formatKc(bilanceObdobi)}
          </span>
        </div>
      </div>

      {pocetCelkem > 0 && (
        <section className="fin-section">
          <div className="fin-section-head">
            <span className="fin-section-title">Podle kategorie</span>
            <div className="fin-mini-toggle">
              <button
                className={donutTyp === 'vydaj' ? 'active' : ''}
                onClick={() => setDonutTyp('vydaj')}
              >
                Výdaje
              </button>
              <button
                className={donutTyp === 'prijem' ? 'active' : ''}
                onClick={() => setDonutTyp('prijem')}
              >
                Příjmy
              </button>
            </div>
          </div>

          <div className="fin-donut-row">
            <Donut vysece={donutData} />
            <div className="fin-legenda">
              {donutData.length === 0 && (
                <p className="fin-empty fin-empty--mala">
                  {OBDOBI_LABELS[obdobiFiltr] === 'Vše' ? 'Zvolené' : OBDOBI_LABELS[obdobiFiltr].toLowerCase()} zatím
                  nic v téhle skupině nemá.
                </p>
              )}
              {donutData.map((v, i) => (
                <div key={v.category} className="fin-legenda-radek">
                  <span
                    className="fin-legenda-tecka"
                    style={{ background: PALETA[i % PALETA.length] }}
                  />
                  <span className="fin-legenda-nazev">
                    {CATEGORY_ICONS[v.category]} {v.category}
                  </span>
                  <span className="fin-legenda-procent">{Math.round(v.percent)} %</span>
                </div>
              ))}
            </div>
          </div>

          <span className="fin-section-title" style={{ marginTop: '0.5rem' }}>
            Posledních 6 měsíců
          </span>
          <TrendGraf body={mesicniTrend} />
          <div className="fin-trend-legenda">
            <span><i className="fin-tecka fin-tecka--prijem" /> Příjmy</span>
            <span><i className="fin-tecka fin-tecka--vydaj" /> Výdaje</span>
          </div>
        </section>
      )}

      {isFormOpen && (
        <form className="fin-form" onSubmit={handleSubmit}>
          <span className="fin-form-title">{editingId ? 'Upravit záznam' : 'Nový záznam'}</span>

          <div className="fin-type-toggle">
            <button
              type="button"
              className={type === 'prijem' ? 'active' : ''}
              onClick={() => zmenType('prijem')}
            >
              Příjem
            </button>
            <button
              type="button"
              className={type === 'vydaj' ? 'active' : ''}
              onClick={() => zmenType('vydaj')}
            >
              Výdaj
            </button>
          </div>

          <div className="fin-form-row">
            <input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              placeholder="Částka v Kč"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
            <select value={category} onChange={(e) => setCategory(e.target.value as FinanceCategory)}>
              {categoriesFor(type).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_ICONS[c]} {c}
                </option>
              ))}
            </select>
          </div>

          <div className="fin-form-row">
            <input
              type="text"
              placeholder="Poznámka (nepovinné)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={80}
            />
            <input type="date" value={date} max={dnesniDatum()} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <button type="submit" className="fin-submit-btn">
            {editingId ? 'Uložit změny' : 'Přidat záznam'}
          </button>
        </form>
      )}

      {typFiltr !== 'vse' || pocetCelkem > 1 ? (
        <div className="fin-filters">
          {(Object.keys(TYP_LABELS) as TypFiltr[]).map((t) => (
            <button
              key={t}
              className={`fin-filter-chip ${typFiltr === t ? 'active' : ''}`}
              onClick={() => setTypFiltr(t)}
            >
              {TYP_LABELS[t]}
            </button>
          ))}
        </div>
      ) : null}

      <div className="fin-list">
        {seznam.length === 0 && (
          <p className="fin-empty">
            {pocetCelkem === 0
              ? 'Zatím tu nic není. Přidej první záznam — třeba dnešní kapesné nebo oběd. 💸'
              : 'V téhle skupině zatím žádný záznam nemáš.'}
          </p>
        )}

        {seznam.map((t) => (
          <div key={t.id} className="fin-row">
            <span className="fin-row-icon" aria-hidden="true">
              {CATEGORY_ICONS[t.category]}
            </span>
            <div className="fin-row-mid">
              <span className="fin-row-title">{t.note || t.category}</span>
              <span className="fin-row-sub">
                {t.category} · {formatDatum(t.date)}
              </span>
            </div>
            <span className={`fin-row-castka ${t.type === 'prijem' ? 'je-prijem' : 'je-vydaj'}`}>
              {t.type === 'prijem' ? '+' : '−'}
              {formatKc(t.amount)}
            </span>
            <div className="fin-row-actions">
              <button className="fin-icon-btn" onClick={() => openEdit(t)} aria-label={`Upravit ${t.category}`}>
                ✏️
              </button>
              <button
                className="fin-icon-btn danger"
                onClick={() => handleDelete(t)}
                aria-label={`Smazat ${t.category}`}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
