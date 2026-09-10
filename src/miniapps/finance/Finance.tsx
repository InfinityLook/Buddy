import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useFinance } from './useFinance'
import { mistniDatum } from '@/core/utils/date'
import { stahnoutBlob } from '@/core/utils/download'
import { deleteFileBlob, getFileBlob, MAX_FILE_BYTES, putFileBlob } from '@/core/utils/fileStorage'
import { fileToResizedBlob } from '@/utils/image'
import {
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  FinanceCategory,
  KategorieVysek,
  MesicniBod,
  OBDOBI_LABELS,
  ObdobiFiltr,
  Transaction,
  TransactionType,
  TYP_LABELS,
  TypFiltr,
  UCTENKA_ID_PREFIX,
  categoriesFor,
  sestavCsvTransakci,
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

const dnesniDatum = () => mistniDatum()

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

/** Náhled přiložené účtenky — obrázek se ukáže rovnou, PDF jako odkaz
 *  na otevření v nové kartě. Vlastní object URL se revokuje při
 *  odmountování/výměně, stejná disciplína jako Music Roomovo
 *  přehrávání nahrávek (viz CLAUDE.md's vlastní poučení o úniku URL). */
const NahledUctenky: React.FC<{ receiptId: string; receiptMime: string | null }> = ({
  receiptId,
  receiptMime,
}) => {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let zruseno = false
    let aktualniUrl: string | null = null

    void getFileBlob(receiptId).then((blob) => {
      if (zruseno || !blob) return
      aktualniUrl = URL.createObjectURL(blob)
      setUrl(aktualniUrl)
    })

    return () => {
      zruseno = true
      if (aktualniUrl) URL.revokeObjectURL(aktualniUrl)
    }
  }, [receiptId])

  if (!url) return null

  if (receiptMime?.startsWith('image/')) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="fin-uctenka-nahled-odkaz">
        <img src={url} alt="Náhled účtenky" className="fin-uctenka-nahled-obrazek" />
      </a>
    )
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className="fin-uctenka-odkaz">
      📄 Otevřít účtenku
    </a>
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
    wallets,
    aktivniPenezenkaId,
    setAktivniPenezenkaId,
    addWallet,
    deleteWallet,
    budgets,
    budgetStavy,
    addBudget,
    deleteBudget,
    recurring,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    goalStavy,
    addGoal,
    deleteGoal,
  } = useFinance()

  const [donutTyp, setDonutTyp] = useState<TransactionType>('vydaj')

  // null = zavřeno, '' = zakládá se nová transakce, jinak id upravované
  const [editingId, setEditingId] = useState<string | null>(null)
  const [type, setType] = useState<TransactionType>('vydaj')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<FinanceCategory>('Jídlo')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(dnesniDatum())
  const [walletId, setWalletId] = useState<string | null>(null)
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [receiptMime, setReceiptMime] = useState<string | null>(null)
  const [nahravaSeUctenka, setNahravaSeUctenka] = useState(false)
  const uctenkaInputRef = useRef<HTMLInputElement>(null)

  // Které z profesionálních sekcí (Peněženky/Rozpočty/Opakující se
  // platby/Cíle) je zrovna rozbalené — nezávislé accordiony, ne
  // "jedna aktivní záložka", protože se nevylučují navzájem.
  const [otevrenoPenezenky, setOtevrenoPenezenky] = useState(false)
  const [otevrenoRozpocty, setOtevrenoRozpocty] = useState(false)
  const [otevrenoOpakujici, setOtevrenoOpakujici] = useState(false)
  const [otevrenoCile, setOtevrenoCile] = useState(false)

  const [novaPenezenka, setNovaPenezenka] = useState('')
  const [novyRozpocetKategorie, setNovyRozpocetKategorie] = useState<ExpenseCategory>(EXPENSE_CATEGORIES[0])
  const [novyRozpocetLimit, setNovyRozpocetLimit] = useState('')
  const [opakujiciForm, setOpakujiciForm] = useState({
    type: 'vydaj' as TransactionType,
    amount: '',
    category: EXPENSE_CATEGORIES[0] as FinanceCategory,
    note: '',
    dayOfMonth: '1',
  })
  const [novyCilNazev, setNovyCilNazev] = useState('')
  const [novyCilCastka, setNovyCilCastka] = useState('')
  const [novyCilTermin, setNovyCilTermin] = useState('')

  const isFormOpen = editingId !== null

  const openAdd = () => {
    setType('vydaj')
    setAmount('')
    setCategory('Jídlo')
    setNote('')
    setDate(dnesniDatum())
    setWalletId(aktivniPenezenkaId)
    setReceiptId(null)
    setReceiptMime(null)
    setEditingId('')
  }

  const openEdit = (t: Transaction) => {
    setType(t.type)
    setAmount(String(t.amount))
    setCategory(t.category)
    setNote(t.note)
    setDate(t.date)
    setWalletId(t.walletId)
    setReceiptId(t.receiptId)
    setReceiptMime(t.receiptMime)
    setEditingId(t.id)
  }

  const closeForm = () => setEditingId(null)

  const zmenType = (novy: TransactionType) => {
    setType(novy)
    // Kategorie patří jen jednomu typu — při přepnutí se musí vybrat
    // znovu, jinak by u výdaje zůstalo vybrané "Kapesné".
    setCategory(categoriesFor(novy)[0])
  }

  // Účtenka se čte hned při výběru souboru, ne až při odeslání
  // formuláře — appka tak umí ukázat náhled dřív, než uživatel klikne
  // "Uložit", a případnou chybu (moc velký soubor) nahlásí okamžitě.
  const handleUctenkaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const soubor = e.target.files?.[0]
    e.target.value = ''
    if (!soubor) return

    setNahravaSeUctenka(true)
    try {
      const novaId = UCTENKA_ID_PREFIX + `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

      if (soubor.type.startsWith('image/')) {
        // Zmenšeno na rozumnou čitelnou velikost, ne původní rozlišení
        // fotoaparátu — účtenka musí jít přečíst, ne vypadat profesionálně.
        const blob = await fileToResizedBlob(soubor, 1000, 0.82)
        await putFileBlob(novaId, blob)
      } else {
        if (soubor.size > MAX_FILE_BYTES) {
          window.alert('Soubor je moc velký (limit 25 MB).')
          return
        }
        await putFileBlob(novaId, soubor)
      }

      // Stará účtenka (pokud se právě nahrazuje) se uvolní, ať v
      // IndexedDB nezůstane osiřelý blob, na který už nic neukazuje.
      if (receiptId) void deleteFileBlob(receiptId)

      setReceiptId(novaId)
      setReceiptMime(soubor.type || null)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Účtenku se nepodařilo přiložit.')
    } finally {
      setNahravaSeUctenka(false)
    }
  }

  const odebratUctenku = () => {
    if (receiptId) void deleteFileBlob(receiptId)
    setReceiptId(null)
    setReceiptMime(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const castka = Math.round(Number(amount))
    if (!Number.isFinite(castka) || castka <= 0) return

    const input = { type, amount: castka, category, note: note.trim(), date, walletId, receiptId, receiptMime }
    if (editingId) updateTransaction(editingId, input)
    else addTransaction(input)
    closeForm()
  }

  const handleDelete = (t: Transaction) => {
    if (window.confirm(`Smazat záznam „${t.note || t.category}“?`)) {
      // Účtenka je čistě lokální soubor — smazáním transakce zmizí
      // i ona, ne že by v IndexedDB zůstal osiřelý blob navždy.
      if (t.receiptId) void deleteFileBlob(t.receiptId)
      deleteTransaction(t.id)
      if (editingId === t.id) closeForm()
    }
  }

  const exportCsv = () => {
    if (seznam.length === 0) return
    stahnoutBlob('transakce.csv', new Blob([sestavCsvTransakci(seznam)], { type: 'text/csv;charset=utf-8' }))
  }

  const pridatPenezenku = (e: React.FormEvent) => {
    e.preventDefault()
    if (!novaPenezenka.trim()) return
    addWallet(novaPenezenka, null)
    setNovaPenezenka('')
  }

  const pridatRozpocet = (e: React.FormEvent) => {
    e.preventDefault()
    const limit = Number(novyRozpocetLimit)
    if (!Number.isFinite(limit) || limit <= 0) return
    addBudget(novyRozpocetKategorie, limit)
    setNovyRozpocetLimit('')
  }

  const kategorieBezRozpoctu = useMemo(
    () => EXPENSE_CATEGORIES.filter((c) => !budgets.some((b) => b.category === c)),
    [budgets]
  )

  const pridatOpakujici = (e: React.FormEvent) => {
    e.preventDefault()
    const castka = Number(opakujiciForm.amount)
    if (!Number.isFinite(castka) || castka <= 0) return
    addRecurring({
      type: opakujiciForm.type,
      amount: castka,
      category: opakujiciForm.category,
      note: opakujiciForm.note,
      dayOfMonth: Number(opakujiciForm.dayOfMonth) || 1,
    })
    setOpakujiciForm({ type: 'vydaj', amount: '', category: EXPENSE_CATEGORIES[0], note: '', dayOfMonth: '1' })
  }

  const pridatCil = (e: React.FormEvent) => {
    e.preventDefault()
    const castka = Number(novyCilCastka)
    if (!novyCilNazev.trim() || !Number.isFinite(castka) || castka <= 0) return
    addGoal(novyCilNazev, castka, novyCilTermin || null)
    setNovyCilNazev('')
    setNovyCilCastka('')
    setNovyCilTermin('')
  }

  const bilanceObdobi = prijmyObdobi - vydajeObdobi
  const donutData = donutTyp === 'vydaj' ? kategorieVydaje : kategoriePrijmy

  return (
    <div className="fin-app">
      <div className="fin-header">
        <h2>Finance</h2>
        <div className="fin-header-akce">
          <button className="fin-csv-btn" onClick={exportCsv} disabled={seznam.length === 0} aria-label="Export do CSV">
            ⬇ CSV
          </button>
          <button className="fin-add-btn" onClick={isFormOpen ? closeForm : openAdd}>
            {isFormOpen ? '✕' : '+ Záznam'}
          </button>
        </div>
      </div>

      {wallets.length > 0 && (
        <div className="fin-filters">
          <button
            className={`fin-filter-chip ${aktivniPenezenkaId === null ? 'active' : ''}`}
            onClick={() => setAktivniPenezenkaId(null)}
          >
            Vše
          </button>
          {wallets.map((w) => (
            <button
              key={w.id}
              className={`fin-filter-chip ${aktivniPenezenkaId === w.id ? 'active' : ''}`}
              onClick={() => setAktivniPenezenkaId(w.id)}
            >
              {w.name}
            </button>
          ))}
        </div>
      )}

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
            Posledních 12 měsíců
          </span>
          <TrendGraf body={mesicniTrend} />
          <div className="fin-trend-legenda">
            <span><i className="fin-tecka fin-tecka--prijem" /> Příjmy</span>
            <span><i className="fin-tecka fin-tecka--vydaj" /> Výdaje</span>
          </div>
        </section>
      )}

      {/* --- Peněženky/účty --- */}
      <section className="fin-accordion">
        <button className="fin-accordion-hlava" onClick={() => setOtevrenoPenezenky((o) => !o)}>
          <span>💳 Peněženky a účty</span>
          <span className={`fin-accordion-sipka ${otevrenoPenezenky ? 'je-otevreno' : ''}`}>›</span>
        </button>
        {otevrenoPenezenky && (
          <div className="fin-accordion-telo">
            {wallets.length === 0 && <p className="fin-empty fin-empty--mala">Zatím žádné peněženky.</p>}
            {wallets.map((w) => (
              <div key={w.id} className="fin-sprava-radek">
                <span>{w.name}</span>
                <button className="fin-icon-btn danger" onClick={() => deleteWallet(w.id)} aria-label={`Smazat peněženku ${w.name}`}>
                  ✕
                </button>
              </div>
            ))}
            <form className="fin-mini-form" onSubmit={pridatPenezenku}>
              <input
                placeholder="Název (Hotovost, Účet…)"
                value={novaPenezenka}
                onChange={(e) => setNovaPenezenka(e.target.value)}
              />
              <button type="submit">+ Přidat</button>
            </form>
          </div>
        )}
      </section>

      {/* --- Rozpočty --- */}
      <section className="fin-accordion">
        <button className="fin-accordion-hlava" onClick={() => setOtevrenoRozpocty((o) => !o)}>
          <span>📊 Rozpočty</span>
          <span className={`fin-accordion-sipka ${otevrenoRozpocty ? 'je-otevreno' : ''}`}>›</span>
        </button>
        {otevrenoRozpocty && (
          <div className="fin-accordion-telo">
            {budgetStavy.length === 0 && <p className="fin-empty fin-empty--mala">Zatím žádné rozpočty.</p>}
            {budgetStavy.map(({ budget, utraceno, procenta, jePrekrocen }) => (
              <div key={budget.id} className="fin-rozpocet-radek">
                <div className="fin-rozpocet-hlavicka">
                  <span>
                    {CATEGORY_ICONS[budget.category]} {budget.category}
                  </span>
                  <button
                    className="fin-icon-btn danger"
                    onClick={() => deleteBudget(budget.id)}
                    aria-label={`Smazat rozpočet ${budget.category}`}
                  >
                    ✕
                  </button>
                </div>
                <div className="fin-rozpocet-lista">
                  <div
                    className={`fin-rozpocet-vypln ${jePrekrocen ? 'je-prekrocen' : ''}`}
                    style={{ width: `${Math.min(100, procenta)}%` }}
                  />
                </div>
                <span className={`fin-rozpocet-text ${jePrekrocen ? 'je-prekrocen' : ''}`}>
                  {formatKc(utraceno)} z {formatKc(budget.limitKc)} ({procenta} %)
                  {jePrekrocen && ' — limit překročen!'}
                </span>
              </div>
            ))}
            {kategorieBezRozpoctu.length > 0 && (
              <form className="fin-mini-form" onSubmit={pridatRozpocet}>
                <select value={novyRozpocetKategorie} onChange={(e) => setNovyRozpocetKategorie(e.target.value as ExpenseCategory)}>
                  {kategorieBezRozpoctu.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_ICONS[c]} {c}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  placeholder="Limit Kč/měsíc"
                  value={novyRozpocetLimit}
                  onChange={(e) => setNovyRozpocetLimit(e.target.value)}
                />
                <button type="submit">+ Přidat</button>
              </form>
            )}
          </div>
        )}
      </section>

      {/* --- Opakující se platby --- */}
      <section className="fin-accordion">
        <button className="fin-accordion-hlava" onClick={() => setOtevrenoOpakujici((o) => !o)}>
          <span>🔁 Opakující se platby</span>
          <span className={`fin-accordion-sipka ${otevrenoOpakujici ? 'je-otevreno' : ''}`}>›</span>
        </button>
        {otevrenoOpakujici && (
          <div className="fin-accordion-telo">
            {recurring.length === 0 && <p className="fin-empty fin-empty--mala">Zatím žádné opakující se platby.</p>}
            {recurring.map((r) => (
              <div key={r.id} className="fin-sprava-radek">
                <span>
                  {CATEGORY_ICONS[r.category]} {r.note || r.category} · {formatKc(r.amount)} · {r.dayOfMonth}. den v měsíci
                </span>
                <div className="fin-row-actions">
                  <button
                    className={`fin-icon-btn ${r.active ? '' : 'je-neaktivni'}`}
                    onClick={() => updateRecurring(r.id, !r.active)}
                    aria-label={r.active ? `Pozastavit ${r.category}` : `Zapnout ${r.category}`}
                  >
                    {r.active ? '⏸️' : '▶️'}
                  </button>
                  <button className="fin-icon-btn danger" onClick={() => deleteRecurring(r.id)} aria-label={`Smazat ${r.category}`}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
            <form className="fin-mini-form fin-mini-form--sloupec" onSubmit={pridatOpakujici}>
              <div className="fin-type-toggle">
                <button
                  type="button"
                  className={opakujiciForm.type === 'prijem' ? 'active' : ''}
                  onClick={() =>
                    setOpakujiciForm((f) => ({ ...f, type: 'prijem', category: categoriesFor('prijem')[0] }))
                  }
                >
                  Příjem
                </button>
                <button
                  type="button"
                  className={opakujiciForm.type === 'vydaj' ? 'active' : ''}
                  onClick={() =>
                    setOpakujiciForm((f) => ({ ...f, type: 'vydaj', category: categoriesFor('vydaj')[0] }))
                  }
                >
                  Výdaj
                </button>
              </div>
              <div className="fin-form-row">
                <input
                  type="number"
                  min={1}
                  placeholder="Částka Kč"
                  value={opakujiciForm.amount}
                  onChange={(e) => setOpakujiciForm((f) => ({ ...f, amount: e.target.value }))}
                />
                <select
                  value={opakujiciForm.category}
                  onChange={(e) => setOpakujiciForm((f) => ({ ...f, category: e.target.value as FinanceCategory }))}
                >
                  {categoriesFor(opakujiciForm.type).map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_ICONS[c]} {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="fin-form-row">
                <input
                  placeholder="Poznámka (Nájem, Netflix…)"
                  value={opakujiciForm.note}
                  onChange={(e) => setOpakujiciForm((f) => ({ ...f, note: e.target.value }))}
                />
                <input
                  type="number"
                  min={1}
                  max={28}
                  placeholder="Den v měsíci"
                  value={opakujiciForm.dayOfMonth}
                  onChange={(e) => setOpakujiciForm((f) => ({ ...f, dayOfMonth: e.target.value }))}
                />
              </div>
              <button type="submit">+ Přidat opakující se platbu</button>
            </form>
          </div>
        )}
      </section>

      {/* --- Finanční cíle --- */}
      <section className="fin-accordion">
        <button className="fin-accordion-hlava" onClick={() => setOtevrenoCile((o) => !o)}>
          <span>🎯 Finanční cíle</span>
          <span className={`fin-accordion-sipka ${otevrenoCile ? 'je-otevreno' : ''}`}>›</span>
        </button>
        {otevrenoCile && (
          <div className="fin-accordion-telo">
            {goalStavy.length === 0 && <p className="fin-empty fin-empty--mala">Zatím žádné finanční cíle.</p>}
            {goalStavy.map(({ goal, procenta, jeSplneny }) => (
              <div key={goal.id} className="fin-rozpocet-radek">
                <div className="fin-rozpocet-hlavicka">
                  <span>
                    {jeSplneny ? '🎉 ' : ''}
                    {goal.name}
                    {goal.deadline && ` · do ${formatDatum(goal.deadline)}`}
                  </span>
                  <button className="fin-icon-btn danger" onClick={() => deleteGoal(goal.id)} aria-label={`Smazat cíl ${goal.name}`}>
                    ✕
                  </button>
                </div>
                <div className="fin-rozpocet-lista">
                  <div
                    className={`fin-rozpocet-vypln ${jeSplneny ? 'je-splneny' : ''}`}
                    style={{ width: `${procenta}%` }}
                    role="progressbar"
                    aria-valuenow={procenta}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
                <span className="fin-rozpocet-text">
                  {formatKc(Math.max(0, zustatek))} z {formatKc(goal.targetAmount)} ({procenta} %)
                </span>
              </div>
            ))}
            <form className="fin-mini-form fin-mini-form--sloupec" onSubmit={pridatCil}>
              <input
                placeholder="Název cíle (Notebook, Dovolená…)"
                value={novyCilNazev}
                onChange={(e) => setNovyCilNazev(e.target.value)}
              />
              <div className="fin-form-row">
                <input
                  type="number"
                  min={1}
                  placeholder="Cílová částka Kč"
                  value={novyCilCastka}
                  onChange={(e) => setNovyCilCastka(e.target.value)}
                />
                <input
                  type="date"
                  value={novyCilTermin}
                  onChange={(e) => setNovyCilTermin(e.target.value)}
                  aria-label="Termín (nepovinné)"
                />
              </div>
              <button type="submit">+ Přidat cíl</button>
            </form>
          </div>
        )}
      </section>

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

          {wallets.length > 0 && (
            <select
              className="fin-penezenka-select"
              value={walletId ?? ''}
              onChange={(e) => setWalletId(e.target.value || null)}
              aria-label="Peněženka"
            >
              <option value="">Bez peněženky</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          )}

          <div className="fin-uctenka-radek">
            <input
              ref={uctenkaInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleUctenkaChange}
              className="fin-uctenka-input"
              id="fin-uctenka-input"
            />
            <label htmlFor="fin-uctenka-input" className="fin-uctenka-btn">
              {nahravaSeUctenka ? 'Nahrávám…' : receiptId ? '📎 Vyměnit účtenku' : '📎 Přiložit účtenku'}
            </label>
            {receiptId && (
              <>
                <NahledUctenky receiptId={receiptId} receiptMime={receiptMime} />
                <button type="button" className="fin-uctenka-odebrat" onClick={odebratUctenku}>
                  Odebrat
                </button>
              </>
            )}
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
              <span className="fin-row-title">
                {t.note || t.category}
                {t.receiptId && <span className="fin-row-uctenka-znacka" aria-label="Má přiloženou účtenku"> 📎</span>}
              </span>
              <span className="fin-row-sub">
                {t.category} · {formatDatum(t.date)}
                {t.walletId && wallets.find((w) => w.id === t.walletId) && ` · ${wallets.find((w) => w.id === t.walletId)!.name}`}
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
