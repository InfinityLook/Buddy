import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { formatCas, odhadMinut, spoctiProcenta, type Kapitola } from '../libraryTextTypes'
import { TEMATA_CTECKY, VELIKOSTI_PISMA, useLibraryCtecka } from '../useLibraryCtecka'
import type { KatalogDilo } from '../libraryTypes'

// ==========================================
// Čtečka textových děl. Čte po kapitolách, pamatuje si polohu (kapitola +
// první viditelný blok), počítá postup podle znaků a čas čtení. Postup
// hlásí rodiči (debounce + při odchodu/skrytí stránky) — ukládání a
// synchronizaci řeší rodič, čtečka o cloudu nic neví.
// ==========================================

export interface PostupCteni {
  kapitolaIdx: number
  blockIdx: number
  percent: number
  /** Celkem sekund čtení včetně dřívějších relací. */
  secondsRead: number
  dokonceno: boolean
}

interface Props {
  dilo: KatalogDilo
  kapitoly: readonly Kapitola[]
  start: { kapitolaIdx: number; blockIdx: number }
  zacatekSekund: number
  onProgress: (postup: PostupCteni) => void
  onBack: () => void
}

const ULOZENI_ZPOZDENI_MS = 1500
const DOKONCENO_PRAH = 0.97

export function TextovaCtecka({ dilo, kapitoly, start, zacatekSekund, onProgress, onBack }: Props) {
  const tema = useLibraryCtecka((s) => s.tema)
  const velikost = useLibraryCtecka((s) => s.velikost)
  const zmenVelikost = useLibraryCtecka((s) => s.zmenVelikost)
  const nastavTema = useLibraryCtecka((s) => s.nastavTema)

  const [idx, setIdx] = useState(() => Math.min(Math.max(start.kapitolaIdx, 0), kapitoly.length - 1))
  const [panel, setPanel] = useState<'kapitoly' | 'vzhled' | null>(null)
  const [zlomek, setZlomek] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pocatecniBlok = useRef<number | null>(start.blockIdx > 0 ? start.blockIdx : null)
  const sekundy = useRef(zacatekSekund)
  const poloha = useRef({ blockIdx: start.blockIdx, zlomek: 0 })
  const dokonceno = useRef(false)
  const zmeneno = useRef(false)
  const prvniVykresleni = useRef(true)
  const timer = useRef<number | null>(null)
  const frame = useRef<number | null>(null)
  const idxRef = useRef(idx)
  const onProgressRef = useRef(onProgress)

  useEffect(() => {
    onProgressRef.current = onProgress
  }, [onProgress])
  useEffect(() => {
    idxRef.current = idx
  }, [idx])

  const kapitola = kapitoly[idx]

  const uloz = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    // Pouhé otevření a zavření bez čtení se neukládá (neplete se do statistik čtenářů).
    if (!zmeneno.current) return
    const { blockIdx, zlomek: z } = poloha.current
    const posledni = idxRef.current === kapitoly.length - 1
    if (posledni && z >= DOKONCENO_PRAH) dokonceno.current = true
    onProgressRef.current({
      kapitolaIdx: idxRef.current,
      blockIdx,
      percent: dokonceno.current ? 100 : spoctiProcenta(kapitoly, idxRef.current, z),
      secondsRead: Math.floor(sekundy.current),
      dokonceno: dokonceno.current,
    })
  }, [kapitoly])

  const naplanujUlozeni = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(uloz, ULOZENI_ZPOZDENI_MS)
  }, [uloz])

  // Po změně kapitoly: skok na uložený blok (jen poprvé) nebo na začátek.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const cil = pocatecniBlok.current
    pocatecniBlok.current = null
    const blok = cil !== null ? el.querySelector<HTMLElement>(`[data-b="${cil}"]`) : null
    el.scrollTop = blok ? blok.offsetTop - 8 : 0
    const max = el.scrollHeight - el.clientHeight
    const z = max <= 0 ? 1 : el.scrollTop / max
    poloha.current = { blockIdx: blok ? cil! : 0, zlomek: z }
    setZlomek(z)
    if (prvniVykresleni.current) {
      prvniVykresleni.current = false
      return
    }
    zmeneno.current = true
    naplanujUlozeni()
  }, [idx, naplanujUlozeni])

  const naScroll = () => {
    if (frame.current !== null) return
    frame.current = requestAnimationFrame(() => {
      frame.current = null
      const el = scrollRef.current
      if (!el) return
      const max = el.scrollHeight - el.clientHeight
      const z = max <= 0 ? 1 : Math.min(1, el.scrollTop / max)
      let prvni = 0
      for (const b of el.querySelectorAll<HTMLElement>('[data-b]')) {
        if (b.offsetTop + b.offsetHeight > el.scrollTop + 8) {
          prvni = Number(b.dataset.b)
          break
        }
      }
      poloha.current = { blockIdx: prvni, zlomek: z }
      setZlomek(z)
      zmeneno.current = true
      naplanujUlozeni()
    })
  }

  // Čas čtení: jen když je stránka vidět.
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      sekundy.current += 1
      if (sekundy.current - zacatekSekund >= 5) zmeneno.current = true
    }, 1000)
    const skryto = () => {
      if (document.visibilityState === 'hidden') uloz()
    }
    document.addEventListener('visibilitychange', skryto)
    return () => {
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', skryto)
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      uloz()
    }
  }, [uloz, zacatekSekund])

  const percent = useMemo(() => spoctiProcenta(kapitoly, idx, zlomek), [kapitoly, idx, zlomek])
  const zbyva = useMemo(() => odhadMinut(kapitoly, idx, zlomek), [kapitoly, idx, zlomek])

  const prejdi = (dalsi: number) => {
    if (dalsi < 0 || dalsi >= kapitoly.length) return
    setIdx(dalsi)
    setPanel(null)
  }

  if (!kapitola) return null

  return (
    <section
      className="library-text"
      data-ctecka-tema={tema}
      style={{ ['--ctecka-pismo' as string]: `${VELIKOSTI_PISMA[velikost]}rem` }}
      aria-label={`Čtení: ${dilo.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') (panel ? setPanel(null) : onBack())
      }}
    >
      <div className="library-text-bar">
        <button type="button" className="library-secondary" onClick={() => setPanel(panel === 'kapitoly' ? null : 'kapitoly')}
          aria-expanded={panel === 'kapitoly'}>
          Kapitoly
        </button>
        <span className="library-text-stav" aria-live="off">
          {Math.round(percent)} % · {zbyva > 0 ? `zbývá ~${formatCas(zbyva * 60)}` : 'konec'}
        </span>
        <button type="button" className="library-secondary" onClick={() => setPanel(panel === 'vzhled' ? null : 'vzhled')}
          aria-expanded={panel === 'vzhled'} aria-label="Vzhled textu">
          Aa
        </button>
      </div>
      <div className="library-text-pruh" role="progressbar" aria-label="Postup čtení" aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={Math.round(percent)}>
        <span style={{ width: `${percent}%` }} />
      </div>

      {panel === 'vzhled' && (
        <div className="library-text-panel" role="group" aria-label="Vzhled textu">
          <div className="library-text-radek">
            <button type="button" className="library-secondary" onClick={() => zmenVelikost(-1)} disabled={velikost === 0}
              aria-label="Menší písmo">A−</button>
            <button type="button" className="library-secondary" onClick={() => zmenVelikost(1)}
              disabled={velikost === VELIKOSTI_PISMA.length - 1} aria-label="Větší písmo">A+</button>
          </div>
          <div className="library-text-radek">
            {TEMATA_CTECKY.map((t) => (
              <button key={t.id} type="button" className="library-filter" aria-pressed={tema === t.id}
                onClick={() => nastavTema(t.id)}>
                {t.nazev}
              </button>
            ))}
          </div>
        </div>
      )}
      {panel === 'kapitoly' && (
        <ol className="library-text-panel library-text-toc" aria-label="Seznam kapitol">
          {kapitoly.map((k, i) => (
            <li key={k.position}>
              <button type="button" aria-current={i === idx ? 'true' : undefined} onClick={() => prejdi(i)}>
                {k.title || `Kapitola ${i + 1}`}
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className="library-text-scroll" ref={scrollRef} onScroll={naScroll} tabIndex={0}>
        <article className="library-text-obsah">
          <h2>{kapitola.title || `Kapitola ${idx + 1}`}</h2>
          {kapitola.bloky.length === 0 && <p className="library-text-prazdne">Tahle kapitola je prázdná.</p>}
          {kapitola.bloky.map((b, i) =>
            b.typ === 'nadpis' ? <h3 key={i} data-b={i}>{b.text}</h3>
            : b.typ === 'citat' ? <blockquote key={i} data-b={i}>{b.text}</blockquote>
            : b.typ === 'oddelovac' ? <hr key={i} data-b={i} />
            : <p key={i} data-b={i}>{b.text}</p>,
          )}
          <nav className="library-text-nav" aria-label="Přechod mezi kapitolami">
            <button type="button" className="library-secondary" disabled={idx === 0} onClick={() => prejdi(idx - 1)}>
              ‹ Předchozí
            </button>
            <button type="button" className="library-secondary" disabled={idx === kapitoly.length - 1}
              onClick={() => prejdi(idx + 1)}>
              Další kapitola ›
            </button>
          </nav>
        </article>
      </div>
    </section>
  )
}
