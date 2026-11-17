import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { formatCas, odhadMinut, spoctiProcenta, type Kapitola } from '../libraryTextTypes'
import { TEMATA_CTECKY, VELIKOSTI_PISMA, useLibraryCtecka } from '../useLibraryCtecka'
import type { KatalogDilo } from '../libraryTypes'
import { useLibraryAnnotations } from '../useLibraryAnnotations'
import { BARVY_ANOTACE, type AnotaceZaznam, type BarvaAnotace } from '@/core/utils/libraryAnnotationsValidation'
import { POPIS_BARVY, najdiZalozku, rozdelBlok, seradPodlePozice, zkratVyrez } from '../libraryAnnotations'

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
  /** Verze textu, kterou čtenář právě čte (kotvy poznámek se vážou k ní). */
  versionId: string
  zOffline?: boolean
  /** Živé poznámky k tomuto dílu. */
  anotace: readonly AnotaceZaznam[]
  onProgress: (postup: PostupCteni) => void
  onBack: () => void
}

const ULOZENI_ZPOZDENI_MS = 1500
const DOKONCENO_PRAH = 0.97

interface VyberTextu {
  blockIdx: number
  start: number
  end: number
  text: string
}

export function TextovaCtecka({ dilo, kapitoly, start, zacatekSekund, versionId, zOffline, anotace, onProgress, onBack }: Props) {
  const pridejAnotaci = useLibraryAnnotations((s) => s.pridej)
  const upravAnotaci = useLibraryAnnotations((s) => s.uprav)
  const smazAnotaci = useLibraryAnnotations((s) => s.smaz)
  const tema = useLibraryCtecka((s) => s.tema)
  const velikost = useLibraryCtecka((s) => s.velikost)
  const zmenVelikost = useLibraryCtecka((s) => s.zmenVelikost)
  const nastavTema = useLibraryCtecka((s) => s.nastavTema)

  const [idx, setIdx] = useState(() => Math.min(Math.max(start.kapitolaIdx, 0), kapitoly.length - 1))
  const [panel, setPanel] = useState<'kapitoly' | 'vzhled' | 'poznamky' | null>(null)
  const [vyber, setVyber] = useState<VyberTextu | null>(null)
  const [upravovana, setUpravovana] = useState<string | null>(null)
  const [textPoznamky, setTextPoznamky] = useState('')
  const [zprava, setZprava] = useState<string | null>(null)
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

  // Poznámky z jiné verze textu nemají spolehlivou kotvu — nezvýrazňují se ani neskáče se na ně.
  const anotaceVerze = useMemo(
    () => anotace.filter((a) => !a.versionId || a.versionId === versionId),
    [anotace, versionId],
  )
  const anotacePodleBloku = useMemo(() => {
    const mapa = new Map<number, AnotaceZaznam[]>()
    for (const a of anotaceVerze) {
      if (a.chapterPos !== idx) continue
      const arr = mapa.get(a.blockIdx)
      if (arr) arr.push(a)
      else mapa.set(a.blockIdx, [a])
    }
    return mapa
  }, [anotaceVerze, idx])
  const serazene = useMemo(() => seradPodlePozice(anotace), [anotace])
  const upravovanaAnotace = upravovana ? anotace.find((a) => a.id === upravovana && a.kind !== 'zalozka') : undefined

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

  // Označený text uvnitř jednoho bloku → plovoucí lišta se zvýrazněním.
  const clearTimer = useRef<number | null>(null)
  useEffect(() => {
    const blokPodUzlem = (uzel: Node | null): HTMLElement | null => {
      const el = uzel && uzel.nodeType === 1 ? (uzel as Element) : (uzel?.parentElement ?? null)
      return el ? el.closest<HTMLElement>('[data-b]') : null
    }
    const naVyber = () => {
      const sel = window.getSelection()
      const kontejner = scrollRef.current
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !kontejner) {
        // Krátké zpoždění: dotyk na tlačítko lišty zruší označení dřív, než se stihne klik.
        if (clearTimer.current === null) clearTimer.current = window.setTimeout(() => { clearTimer.current = null; setVyber(null) }, 400)
        return
      }
      const r = sel.getRangeAt(0)
      const od = blokPodUzlem(r.startContainer)
      const dop = blokPodUzlem(r.endContainer)
      if (!od || od !== dop || !kontejner.contains(od)) return
      const pre = document.createRange()
      pre.selectNodeContents(od)
      pre.setEnd(r.startContainer, r.startOffset)
      const startZn = pre.toString().length
      const txt = r.toString()
      if (!txt.trim()) return
      if (clearTimer.current !== null) { window.clearTimeout(clearTimer.current); clearTimer.current = null }
      setVyber({ blockIdx: Number(od.dataset.b), start: startZn, end: startZn + txt.length, text: txt })
    }
    document.addEventListener('selectionchange', naVyber)
    return () => {
      document.removeEventListener('selectionchange', naVyber)
      if (clearTimer.current !== null) window.clearTimeout(clearTimer.current)
    }
  }, [])

  // Změna kapitoly zruší rozdělanou volbu a otevřený editor.
  useEffect(() => {
    setVyber(null)
    setUpravovana(null)
  }, [idx])

  useEffect(() => {
    if (!zprava) return
    const t = window.setTimeout(() => setZprava(null), 2500)
    return () => window.clearTimeout(t)
  }, [zprava])

  const otevriEditor = (a: AnotaceZaznam) => {
    setUpravovana(a.id)
    setTextPoznamky(a.note ?? '')
    setPanel(null)
  }

  const zvyrazni = (barva: BarvaAnotace): string | null => {
    if (!vyber) return null
    const id = pridejAnotaci({
      workId: dilo.id,
      versionId,
      kind: 'zvyrazneni',
      chapterPos: idx,
      blockIdx: vyber.blockIdx,
      charStart: vyber.start,
      charEnd: vyber.end,
      excerpt: vyber.text.slice(0, 500),
      color: barva,
    })
    if (!id) setZprava('K tomuhle dílu už máš nejvíc poznámek, které appka drží.')
    window.getSelection()?.removeAllRanges()
    setVyber(null)
    return id
  }

  const poznamkaKVyberu = () => {
    const id = zvyrazni('zluta')
    if (!id) return
    setUpravovana(id)
    setTextPoznamky('')
  }

  const prepniZalozku = () => {
    const blok = poloha.current.blockIdx
    const existujici = najdiZalozku(anotace, idx, blok)
    if (existujici) {
      smazAnotaci(existujici.id)
      setZprava('Záložka odebrána.')
      return
    }
    const text = kapitola?.bloky[blok]?.text ?? kapitola?.title ?? ''
    const id = pridejAnotaci({
      workId: dilo.id, versionId, kind: 'zalozka', chapterPos: idx, blockIdx: blok, excerpt: zkratVyrez(text, 140),
    })
    setZprava(id ? 'Záložka přidána.' : 'K tomuhle dílu už máš nejvíc poznámek, které appka drží.')
  }

  const skoc = (kapIdx: number, blockIdx: number) => {
    setPanel(null)
    const kontejner = scrollRef.current
    if (kapIdx === idx && kontejner) {
      const blok = kontejner.querySelector<HTMLElement>(`[data-b="${blockIdx}"]`)
      kontejner.scrollTop = blok ? blok.offsetTop - 8 : 0
      return
    }
    pocatecniBlok.current = blockIdx > 0 ? blockIdx : null
    setIdx(kapIdx)
  }

  const naKlikVTextu = (e: React.MouseEvent) => {
    if (!window.getSelection()?.isCollapsed) return
    const znacka = (e.target as HTMLElement).closest<HTMLElement>('mark[data-a]')
    if (!znacka) return
    const a = anotace.find((x) => x.id === znacka.dataset.a)
    if (a) otevriEditor(a)
  }

  const maZalozkuTady = !!najdiZalozku(anotace, idx, poloha.current.blockIdx)

  const vykresliText = (blokIdx: number, text: string) => {
    const zvyrazneni = anotacePodleBloku.get(blokIdx)
    if (!zvyrazneni) return text
    return rozdelBlok(text, zvyrazneni).map((u, i) =>
      u.anotaceId ? (
        <mark key={i} data-a={u.anotaceId} data-barva={u.barva ?? 'zluta'} data-poznamka={u.maPoznamku ? '1' : undefined}>
          {u.text}
        </mark>
      ) : (
        u.text
      ),
    )
  }

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
        if (e.key !== 'Escape') return
        if (upravovana) setUpravovana(null)
        else if (panel) setPanel(null)
        else onBack()
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
        <div className="library-text-skupina">
          <button type="button" className="library-secondary" onClick={prepniZalozku} aria-pressed={maZalozkuTady}
            aria-label={maZalozkuTady ? 'Odebrat záložku' : 'Přidat záložku'}>
            {maZalozkuTady ? '🔖' : '🏷️'}
          </button>
          <button type="button" className="library-secondary" onClick={() => setPanel(panel === 'poznamky' ? null : 'poznamky')}
            aria-expanded={panel === 'poznamky'}>
            Poznámky{anotace.length > 0 ? ` (${anotace.length})` : ''}
          </button>
          <button type="button" className="library-secondary" onClick={() => setPanel(panel === 'vzhled' ? null : 'vzhled')}
            aria-expanded={panel === 'vzhled'} aria-label="Vzhled textu">
            Aa
          </button>
        </div>
      </div>
      {zOffline && <p className="library-text-offline">Čteš uloženou kopii — bez připojení se nedá ověřit nejnovější verze.</p>}
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
      {panel === 'poznamky' && (
        <div className="library-text-panel library-text-poznamky" role="group" aria-label="Záložky a poznámky">
          {serazene.length === 0 && (
            <p className="library-hint">Zatím nic. Označ text pro zvýraznění, nebo přidej záložku.</p>
          )}
          <ul>
            {serazene.map((a) => {
              const aktualni = !a.versionId || a.versionId === versionId
              const kapNazev = kapitoly[a.chapterPos]?.title || `Kapitola ${a.chapterPos + 1}`
              return (
                <li key={a.id} className="library-poznamka" data-stara={aktualni ? undefined : '1'}>
                  <button type="button" className="library-poznamka-hlavni" disabled={!aktualni}
                    onClick={() => skoc(Math.min(a.chapterPos, kapitoly.length - 1), a.blockIdx)}>
                    <span className="library-poznamka-znacka" data-barva={a.color ?? 'zalozka'} aria-hidden="true">
                      {a.kind === 'zalozka' ? '🔖' : ''}
                    </span>
                    <span className="library-poznamka-text">
                      <span className="library-poznamka-kap">{kapNazev}{aktualni ? '' : ' · starší verze textu'}</span>
                      <span>{a.excerpt || (a.kind === 'zalozka' ? 'Záložka' : '…')}</span>
                      {a.note && <em>{a.note}</em>}
                    </span>
                  </button>
                  {a.kind !== 'zalozka' && aktualni && (
                    <button type="button" className="library-secondary" onClick={() => otevriEditor(a)}>Upravit</button>
                  )}
                  <button type="button" className="library-secondary" aria-label="Smazat" onClick={() => smazAnotaci(a.id)}>✕</button>
                </li>
              )
            })}
          </ul>
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

      <div className="library-text-scroll" ref={scrollRef} onScroll={naScroll} onClick={naKlikVTextu} tabIndex={0}>
        <article className="library-text-obsah">
          <h2>{kapitola.title || `Kapitola ${idx + 1}`}</h2>
          {kapitola.bloky.length === 0 && <p className="library-text-prazdne">Tahle kapitola je prázdná.</p>}
          {kapitola.bloky.map((b, i) => {
            const zalozka = anotacePodleBloku.get(i)?.some((a) => a.kind === 'zalozka') ? '1' : undefined
            return b.typ === 'nadpis' ? <h3 key={i} data-b={i} data-zalozka={zalozka}>{vykresliText(i, b.text)}</h3>
              : b.typ === 'citat' ? <blockquote key={i} data-b={i} data-zalozka={zalozka}>{vykresliText(i, b.text)}</blockquote>
              : b.typ === 'oddelovac' ? <hr key={i} data-b={i} data-zalozka={zalozka} />
              : <p key={i} data-b={i} data-zalozka={zalozka}>{vykresliText(i, b.text)}</p>
          })}
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
      {zprava && <p className="library-text-toast" role="status">{zprava}</p>}

      {vyber && !upravovanaAnotace && (
        <div className="library-text-vyber" role="toolbar" aria-label="Zvýraznit označený text"
          onMouseDown={(e) => e.preventDefault()}>
          {BARVY_ANOTACE.map((b) => (
            <button key={b} type="button" className="library-barva" data-barva={b} aria-label={`Zvýraznit: ${POPIS_BARVY[b]}`}
              onClick={() => zvyrazni(b)} />
          ))}
          <button type="button" className="library-secondary" onClick={poznamkaKVyberu}>Poznámka</button>
        </div>
      )}

      {upravovanaAnotace && (
        <div className="library-text-editor" role="dialog" aria-label="Poznámka ke zvýraznění">
          <blockquote>{zkratVyrez(upravovanaAnotace.excerpt, 200)}</blockquote>
          <div className="library-text-radek">
            {BARVY_ANOTACE.map((b) => (
              <button key={b} type="button" className="library-barva" data-barva={b} aria-label={`Barva: ${POPIS_BARVY[b]}`}
                aria-pressed={upravovanaAnotace.color === b} onClick={() => upravAnotaci(upravovanaAnotace.id, { color: b })} />
            ))}
          </div>
          <textarea value={textPoznamky} maxLength={2000} rows={3} placeholder="Tvoje poznámka…" aria-label="Text poznámky"
            onChange={(e) => setTextPoznamky(e.target.value)} />
          <div className="library-text-radek">
            <button type="button" className="library-primary"
              onClick={() => { upravAnotaci(upravovanaAnotace.id, { note: textPoznamky }); setUpravovana(null) }}>
              Uložit
            </button>
            <button type="button" className="library-secondary"
              onClick={() => { smazAnotaci(upravovanaAnotace.id); setUpravovana(null) }}>
              Smazat zvýraznění
            </button>
            <button type="button" className="library-secondary" onClick={() => setUpravovana(null)}>Zavřít</button>
          </div>
        </div>
      )}
    </section>
  )
}
