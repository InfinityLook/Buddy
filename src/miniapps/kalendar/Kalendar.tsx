import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
import { useAppStore } from '@/core/store/useAppStore'
import { stahnoutBlob } from '@/core/utils/download'
import { normalizeText } from '@/core/utils/text'
import { requestNotificationPermission } from '@/core/utils/notify'
import { useRozvrh } from '@/miniapps/rozvrh/useRozvrh'
import { efektivniRozvrhProDatum } from '@/miniapps/rozvrh/types'
import { useStudyPlanner } from '@/miniapps/study-planner/useStudyPlanner'
import {
  NAZEV_POHLEDU,
  POHLEDY_KALENDARE,
  rozlozeniMesice,
  tydenOd,
  useKalendarStore,
} from './useKalendar'
import type { PohledKalendare } from './useKalendar'
import {
  BARVY_DNE,
  barvyDniJakoRecord,
  MOZNOSTI_OPAKOVANI,
  NAZEV_OPAKOVANI,
  naparsujIcs,
  posunDatumStr,
  sestavIcsKalendare,
  VOLBY_PRIPOMINKY,
} from './types'
import type { BarvaDne, IcsNavrh, Udalost, UdajeUdalosti } from './types'
import {
  chybaTerminu,
  datumStr,
  klicImportu,
  mistniDatum,
  platneDatum,
  posunMesic,
  vyskytVDen,
} from './kalendarProgram'
import './Kalendar.css'

const DNY = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']

const BARVY: Record<BarvaDne, string> = {
  cyan: 'Tyrkysová',
  violet: 'Fialová',
  magenta: 'Purpurová',
  green: 'Zelená',
  orange: 'Oranžová',
  red: 'Červená',
}

const dlouheDatum = new Intl.DateTimeFormat('cs-CZ', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const kratkeDatum = new Intl.DateTimeFormat('cs-CZ', {
  day: 'numeric',
  month: 'numeric',
})

const mesicRok = new Intl.DateTimeFormat('cs-CZ', {
  month: 'long',
  year: 'numeric',
})

const kratce = (d: string) => kratkeDatum.format(mistniDatum(d))

const naplanujDny = (d: string, pocet: number) =>
  Array.from({ length: pocet }, (_, i) => posunDatumStr(d, i)).filter(platneDatum)

interface Navrh extends UdajeUdalosti {
  id?: string
  revize?: number
  datum: string
}

interface Radek {
  id: string
  nazev: string
  popis?: string
  cas: string
  rozsah?: string
  poradi: string
  zdroj: string
  udalost?: Udalost
  zacatek?: string
}

function Modal({
  title,
  close,
  children,
}: {
  title: string
  close: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={ref}
      className="buddy-cal-dialog"
      aria-label={title}
      onCancel={event => {
        event.preventDefault()
        close()
      }}
    >
      <header className="buddy-cal-row">
        <h3>{title}</h3>
        <button type="button" aria-label="Zavřít" onClick={close}>×</button>
      </header>
      {children}
    </dialog>
  )
}

export function Kalendar() {
  const { rootAttributes } = useSurfaceAppearance('kalendar')
  const store = useKalendarStore()
  const { tasks } = useStudyPlanner()
  const { hodiny, prazdniny, zruseneHodiny, presuny } = useRozvrh()
  const input = useRef<HTMLInputElement>(null)

  const [den, setDen] = useState(() => datumStr())
  const [pohled, setPohled] = useState<PohledKalendare | 'program'>('mesic')
  const [hledat, setHledat] = useState('')
  const [navrh, setNavrh] = useState<Navrh | null>(null)
  const [vyber, setVyber] = useState<{ udalost: Udalost; zacatek: string } | null>(null)
  const [importy, setImporty] = useState<IcsNavrh[] | null>(null)
  const [vybraneImporty, setVybraneImporty] = useState<Set<number>>(new Set())
  const [nacita, setNacita] = useState(false)
  const [chyba, setChyba] = useState('')
  const [zprava, setZprava] = useState('')

  const dnes = datumStr()
  const [rok, mesic] = den.split('-').map(Number)
  const { pocetDni, posunOdPondeli } = rozlozeniMesice(rok, mesic - 1)
  const prvni = `${den.slice(0, 7)}-01`
  const tyden = tydenOd(den)

  const mrizka = pohled === 'mesic'
    ? [...Array<string | null>(posunOdPondeli).fill(null), ...naplanujDny(prvni, pocetDni)]
    : pohled === 'tyden' ? tyden : []

  const udalosti = useMemo(
    () => store.udalosti.filter(u => !u.deletedAt),
    [store.udalosti]
  )

  const barvy = useMemo(
    () => barvyDniJakoRecord(store.barvyDniZaznamy),
    [store.barvyDniZaznamy]
  )

  const terminy = useMemo(() => {
    const poDnech = new Map<string, typeof tasks>()

    for (const task of tasks) {
      if (task.completed || !task.dueDate) continue
      const seznam = poDnech.get(task.dueDate) ?? []
      seznam.push(task)
      poDnech.set(task.dueDate, seznam)
    }

    return poDnech
  }, [tasks])

  const kliceImportu = useMemo(() => new Set(udalosti.map(klicImportu)), [udalosti])

  function posun(smer: -1 | 1) {
    const krok = pohled === 'tyden' ? 7 : pohled === 'program' ? 14 : 1
    const dalsi = pohled === 'mesic'
      ? posunMesic(den, smer)
      : posunDatumStr(den, smer * krok)

    if (platneDatum(dalsi)) setDen(dalsi)
  }

  function zapis(akce: () => void, text: string) {
    try {
      akce()
      setChyba('')
      setZprava(text)
      return true
    } catch {
      setZprava('')
      setChyba('Zápis se nepodařilo potvrdit. Zkontroluj stav kalendáře a volné místo v zařízení.')
      return false
    }
  }

  function novaUdalost(datum: string) {
    setChyba('')
    setNavrh({
      datum,
      nazev: '',
      popis: '',
      celodenni: true,
      casOd: '09:00',
      casDo: '',
      opakovani: 'zadne',
      pripominkaMinut: null,
    })
  }

  function ulozit(event: FormEvent) {
    event.preventDefault()
    if (!navrh) return

    const { id, revize, datum, ...pole } = navrh
    const udaje: UdajeUdalosti = {
      ...pole,
      nazev: pole.nazev.trim(),
      popis: pole.popis.trim(),
      datumDo: pole.datumDo || undefined,
      casOd: pole.celodenni ? undefined : pole.casOd || undefined,
      casDo: pole.celodenni ? undefined : pole.casDo || undefined,
    }

    const neplatne = !udaje.nazev
      ? 'Vyplň název události.'
      : chybaTerminu({ datum, ...udaje })

    if (neplatne) {
      setChyba(neplatne)
      return
    }

    const predZapisem = useKalendarStore.getState().udalosti
    const puvodni = predZapisem.find(u => u.id === id && !u.deletedAt)

    if (id && (!puvodni || puvodni.updatedAt !== revize)) {
      setChyba('Událost se mezitím změnila. Otevři ji znovu z kalendáře.')
      return
    }

    const akce = () => {
      if (id) {
        const zmeny = { datum, ...udaje }
        store.upravitUdalost(id, zmeny)
      } else {
        store.pridatUdalost(datum, udaje)
      }
    }

    if (zapis(akce, 'Událost uložena.')) {
      setDen(datum)
      setNavrh(null)

      if (udaje.pripominkaMinut !== null) requestNotificationPermission()
    } else {
      // Zustand může změnit paměť ještě před chybou zápisu do úložiště.
      // Při dalším pokusu uprav stejný záznam, místo založení kopie.
      const poZapisu = useKalendarStore.getState().udalosti
      const zapsana = id
        ? poZapisu.find(u => u.id === id)
        : poZapisu.find(u => !predZapisem.some(stara => stara.id === u.id))

      if (zapsana) {
        setNavrh({ ...navrh, id: zapsana.id, revize: zapsana.updatedAt })
      }
    }
  }

  async function otevritIcs(event: ChangeEvent<HTMLInputElement>) {
    const soubor = event.target.files?.[0]
    event.target.value = ''
    if (!soubor || nacita) return

    setChyba('')
    setZprava('')
    setNacita(true)

    try {
      if (soubor.size > 1024 * 1024) throw new Error('Vyber soubor ICS do 1 MB.')

      const nalezene = naparsujIcs(await soubor.text())
      const platne = nalezene.filter(u => !chybaTerminu(u))
      if (!platne.length) throw new Error('V souboru nejsou platné události.')

      const obsazene = new Set(kliceImportu)
      const vybrane = new Set<number>()

      platne.forEach((u, i) => {
        const klic = klicImportu(u)
        if (!obsazene.has(klic)) vybrane.add(i)
        obsazene.add(klic)
      })

      setImporty(platne)
      setVybraneImporty(vybrane)

      if (platne.length < nalezene.length) {
        setZprava(`Přeskočené neplatné události: ${nalezene.length - platne.length}`)
      }
    } catch (error) {
      setChyba(error instanceof Error ? error.message : 'Soubor se nepodařilo přečíst.')
    } finally {
      setNacita(false)
    }
  }

  function radkyProDen(datum: string): Radek[] {
    const radky: Radek[] = []

    for (const u of udalosti) {
      const vyskyt = vyskytVDen(u, datum)
      if (!vyskyt) continue

      const viceDni = vyskyt.zacatek !== vyskyt.konec
      const cas = u.celodenni ? 'Celý den' : [u.casOd, u.casDo].filter(Boolean).join('–')
      const popisekPripominky = VOLBY_PRIPOMINKY.find(
        p => p.hodnota === u.pripominkaMinut
      )?.nazev

      const zdroj = [
        'Událost',
        u.opakovani !== 'zadne' && NAZEV_OPAKOVANI[u.opakovani],
        u.pripominkaMinut !== null && popisekPripominky,
      ].filter(Boolean).join(' · ')

      radky.push({
        id: `u-${u.id}`,
        nazev: u.nazev,
        popis: u.popis,
        zdroj,
        cas,
        rozsah: viceDni ? `${kratce(vyskyt.zacatek)} – ${kratce(vyskyt.konec)}` : undefined,
        poradi: u.celodenni || vyskyt.zacatek < datum ? '' : u.casOd ?? '',
        udalost: u,
        zacatek: vyskyt.zacatek,
      })
    }

    const rozvrhDne = efektivniRozvrhProDatum(
      hodiny, prazdniny, zruseneHodiny, presuny, datum
    )

    for (const { hodina, casOd, casDo, zrusena, presunutoZ } of rozvrhDne) {
      radky.push({
        id: `r-${hodina.id}-${casOd}`,
        nazev: hodina.predmet,
        cas: `${casOd}–${casDo}`,
        poradi: casOd,
        zdroj: zrusena
          ? 'Rozvrh · zrušeno'
          : presunutoZ ? 'Rozvrh · přesunuto' : 'Rozvrh',
      })
    }

    for (const task of terminy.get(datum) ?? []) {
      radky.push({
        id: `p-${task.id}`,
        nazev: task.topic,
        popis: task.subject,
        cas: 'Termín',
        poradi: '24:00',
        zdroj: 'Plánovač',
      })
    }

    const dotaz = normalizeText(hledat.trim())

    return radky
      .filter(radek => normalizeText(`${radek.nazev} ${radek.popis ?? ''}`).includes(dotaz))
      .sort((a, b) => a.poradi.localeCompare(b.poradi) || a.nazev.localeCompare(b.nazev, 'cs'))
  }

  const program = (pohled === 'program' ? naplanujDny(den, 14) : [den])
    .map(datum => ({ datum, radky: radkyProDen(datum) }))
    .filter(sk => pohled !== 'program' || sk.radky.length > 0)

  const nadpis = pohled === 'mesic'
    ? mesicRok.format(mistniDatum(den))
    : pohled === 'tyden'
      ? `${kratce(tyden[0])} – ${kratce(tyden[6])}`
      : pohled === 'program'
        ? `${kratce(den)} – ${kratce(posunDatumStr(den, 13))}`
        : dlouheDatum.format(mistniDatum(den))

  function upravit(u: Udalost) {
    const { id, datum, datumDo, nazev, popis, celodenni, casOd, casDo, opakovani, pripominkaMinut } = u
    setVyber(null)
    setChyba('')
    setNavrh({
      id, revize: u.updatedAt, datum, datumDo, nazev, popis,
      celodenni, casOd, casDo, opakovani, pripominkaMinut,
    })
  }

  return (
    <section className="buddy-cal buddy-theme-scope" {...rootAttributes}>
      <div className="buddy-cal-row">
        <div className="buddy-cal-tabs" role="group" aria-label="Pohled kalendáře">
          {[...POHLEDY_KALENDARE, 'program' as const].map(p => (
            <button
              key={p}
              type="button"
              aria-pressed={p === pohled}
              onClick={() => {
                setPohled(p)
                setHledat('')
              }}
            >
              {p === 'program' ? 'Program' : NAZEV_POHLEDU[p]}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setDen(datumStr())}>Dnes</button>
      </div>

      <div className="buddy-cal-row buddy-cal-period">
        <button type="button" aria-label="Předchozí období" onClick={() => posun(-1)}>‹</button>
        <h2 aria-live="polite">{nadpis}</h2>
        <button type="button" aria-label="Další období" onClick={() => posun(1)}>›</button>
      </div>

      {mrizka.length > 0 && (
        <div className="buddy-cal-grid">
          {DNY.map(d => (
            <span key={d} className="buddy-cal-weekday" aria-hidden="true">{d}</span>
          ))}

          {mrizka.map((d, i) => {
            if (!d || !platneDatum(d)) return <span key={i} />

            const maUdalost = udalosti.some(u => vyskytVDen(u, d))
            const maTermin = !!terminy.get(d)?.length

            return (
              <button
                key={d}
                type="button"
                aria-pressed={den === d}
                aria-current={d === dnes ? 'date' : undefined}
                aria-label={`${dlouheDatum.format(mistniDatum(d))}${maUdalost ? ', události' : ''}${maTermin ? ', termíny z Plánovače' : ''}`}
                data-color={barvy[d]}
                onClick={() => setDen(d)}
              >
                {Number(d.slice(-2))}
                <span className="buddy-cal-marks" aria-hidden="true">
                  {maUdalost && <i />}
                  {maTermin && <i className="buddy-cal-task-mark" />}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <div className="buddy-cal-row buddy-cal-actions">
        <button type="button" className="buddy-cal-primary" onClick={() => novaUdalost(den)}>
          + Událost
        </button>

        {pohled === 'program' ? (
          <input
            type="search"
            aria-label="Hledat v programu"
            placeholder="Hledat v programu…"
            value={hledat}
            onChange={e => setHledat(e.target.value)}
          />
        ) : (
          <select
            aria-label="Barva dne"
            value={barvy[den] ?? ''}
            onChange={e => {
              const barva = e.target.value as BarvaDne | ''
              zapis(() => store.nastavBarvuDne(den, barva || null), 'Označení dne uloženo.')
            }}
          >
            <option value="">Bez barvy</option>
            {BARVY_DNE.map(barva => (
              <option key={barva} value={barva}>{BARVY[barva]}</option>
            ))}
          </select>
        )}
      </div>

      {!navrh && chyba && <p className="buddy-cal-error" role="alert">{chyba}</p>}
      {zprava && <p className="buddy-cal-status" role="status">{zprava}</p>}

      {program.length === 0 && (
        <p className="buddy-cal-muted">V tomto období nejsou odpovídající položky.</p>
      )}

      {program.map(({ datum, radky }) => (
        <section className="buddy-cal-day" key={datum}>
          <h3>{dlouheDatum.format(mistniDatum(datum))}</h3>

          {radky.length === 0 && (
            <p className="buddy-cal-muted">Na tenhle den zatím nic nemáš.</p>
          )}

          {radky.map(radek => (
            <article className="buddy-cal-card" key={radek.id}>
              <div className="buddy-cal-time">
                {radek.cas}
                {radek.rozsah && <small>{radek.rozsah}</small>}
              </div>

              <div>
                <strong>{radek.nazev}</strong>
                <small>{radek.zdroj}</small>
                {radek.popis && <p>{radek.popis}</p>}
              </div>

              {radek.udalost && radek.zacatek && (
                <button
                  type="button"
                  aria-label={`Možnosti: ${radek.nazev}`}
                  onClick={() => {
                    if (radek.udalost && radek.zacatek) {
                      setVyber({ udalost: radek.udalost, zacatek: radek.zacatek })
                    }
                  }}
                >
                  ⋯
                </button>
              )}

              {radek.zdroj === 'Plánovač' && (
                <button
                  type="button"
                  aria-label={`Otevřít Plánovač: ${radek.nazev}`}
                  onClick={() => {
                    const app = useAppStore.getState()
                    app.setActiveAppId('study-planner', app.returnPath)
                  }}
                >
                  ›
                </button>
              )}
            </article>
          ))}
        </section>
      ))}

      <footer className="buddy-cal-row buddy-cal-files">
        <button type="button" disabled={nacita} onClick={() => input.current?.click()}>
          Import ICS
        </button>

        <button
          type="button"
          disabled={!udalosti.length}
          onClick={() => zapis(() => {
            const obsah = sestavIcsKalendare(udalosti.map(u => ({
              ...u,
              nazev: u.nazev.replace(/\r\n?/g, '\n'),
              popis: u.popis.replace(/\r\n?/g, '\n'),
            })))

            stahnoutBlob(
              'Buddy-kalendar.ics',
              new Blob([obsah], { type: 'text/calendar;charset=utf-8' })
            )
          }, 'Export ICS připraven.')}
        >
          Export ICS
        </button>

        <input ref={input} type="file" hidden accept=".ics,text/calendar" onChange={otevritIcs} />
      </footer>

      {navrh && (
        <Modal
          title={navrh.id ? 'Upravit událost' : 'Nová událost'}
          close={() => {
            setNavrh(null)
            setChyba('')
          }}
        >
          <form className="buddy-cal-form" onSubmit={ulozit}>
            {chyba && <p className="buddy-cal-error" role="alert">{chyba}</p>}

            <label>
              Název
              <input
                autoFocus
                required
                maxLength={140}
                value={navrh.nazev}
                onChange={e => setNavrh({ ...navrh, nazev: e.target.value })}
              />
            </label>

            <div className="buddy-cal-pair">
              <label>
                Datum začátku
                <input
                  type="date"
                  required
                  min="1000-01-01"
                  max="9999-12-31"
                  value={navrh.datum}
                  readOnly={!!navrh.id && store.udalosti.some(
                    u => u.id === navrh.id && u.opakovani !== 'zadne'
                  )}
                  onChange={e => setNavrh({ ...navrh, datum: e.target.value })}
                />
              </label>

              <label>
                Datum konce
                <input
                  type="date"
                  min={navrh.datum}
                  max="9999-12-31"
                  value={navrh.datumDo ?? ''}
                  onChange={e => setNavrh({ ...navrh, datumDo: e.target.value })}
                />
              </label>
            </div>

            <label className="buddy-cal-check">
              <input
                type="checkbox"
                checked={navrh.celodenni}
                onChange={e => setNavrh({ ...navrh, celodenni: e.target.checked })}
              />
              Celodenní
            </label>

            {!navrh.celodenni && (
              <div className="buddy-cal-pair">
                <label>
                  Čas od
                  <input
                    type="time"
                    required
                    value={navrh.casOd ?? ''}
                    onChange={e => setNavrh({ ...navrh, casOd: e.target.value })}
                  />
                </label>

                <label>
                  Čas do
                  <input
                    type="time"
                    value={navrh.casDo ?? ''}
                    onChange={e => setNavrh({ ...navrh, casDo: e.target.value })}
                  />
                </label>
              </div>
            )}

            <label>
              Opakování
              <select
                value={navrh.opakovani}
                onChange={e => setNavrh({ ...navrh, opakovani: e.target.value as Navrh['opakovani'] })}
              >
                {MOZNOSTI_OPAKOVANI.map(o => (
                  <option key={o} value={o}>{NAZEV_OPAKOVANI[o]}</option>
                ))}
              </select>
            </label>

            <label>
              Připomínka
              <select
                value={navrh.pripominkaMinut ?? ''}
                onChange={e => setNavrh({
                  ...navrh,
                  pripominkaMinut: e.target.value === '' ? null : Number(e.target.value),
                })}
              >
                {VOLBY_PRIPOMINKY.map(p => (
                  <option key={p.nazev} value={p.hodnota ?? ''}>{p.nazev}</option>
                ))}
              </select>
            </label>

            <label>
              Poznámka
              <textarea
                rows={3}
                maxLength={3000}
                value={navrh.popis}
                onChange={e => setNavrh({ ...navrh, popis: e.target.value })}
              />
            </label>

            <button type="submit" className="buddy-cal-primary">Uložit událost</button>
          </form>
        </Modal>
      )}

      {vyber && (
        <Modal title={vyber.udalost.nazev} close={() => setVyber(null)}>
          <div className="buddy-cal-form">
            <button type="button" onClick={() => upravit(vyber.udalost)}>
              {vyber.udalost.opakovani === 'zadne' ? 'Upravit událost' : 'Upravit sérii'}
            </button>

            {vyber.udalost.opakovani !== 'zadne' && (
              <button
                type="button"
                onClick={() => {
                  zapis(
                    () => store.vynechatVyskyt(vyber.udalost.id, vyber.zacatek),
                    'Výskyt vynechán.'
                  )
                  setVyber(null)
                }}
              >
                Vynechat výskyt {kratce(vyber.zacatek)}
              </button>
            )}

            <button
              type="button"
              className="buddy-cal-danger"
              onClick={() => {
                const cela = vyber.udalost.opakovani !== 'zadne'
                if (!window.confirm(cela ? 'Smazat celou sérii?' : 'Smazat událost?')) return
                zapis(() => store.smazatUdalost(vyber.udalost.id), 'Smazáno.')
                setVyber(null)
              }}
            >
              {vyber.udalost.opakovani === 'zadne' ? 'Smazat událost' : 'Smazat celou sérii'}
            </button>
          </div>
        </Modal>
      )}

      {importy && (
        <Modal title="Náhled importu ICS" close={() => setImporty(null)}>
          <p className="buddy-cal-muted">
            Časy se načtou jako místní. Před importem zkontroluj datum a čas.
          </p>

          <div className="buddy-cal-import">
            {importy.map((u, i) => (
              <label className="buddy-cal-check" key={i}>
                <input
                  type="checkbox"
                  checked={vybraneImporty.has(i)}
                  onChange={() => {
                    setVybraneImporty(stav => {
                      const dalsi = new Set(stav)
                      if (dalsi.has(i)) dalsi.delete(i)
                      else dalsi.add(i)
                      return dalsi
                    })
                  }}
                />

                <span>
                  {u.nazev}
                  <small>
                    {kratce(u.datum)} {u.celodenni ? '· celý den' : u.casOd}
                    {kliceImportu.has(klicImportu(u)) ? ' · už existuje' : ''}
                  </small>
                </span>
              </label>
            ))}
          </div>

          <button
            type="button"
            className="buddy-cal-primary"
            disabled={!vybraneImporty.size}
            onClick={() => {
              const vybrane = importy.filter((_, i) => vybraneImporty.has(i))
              if (zapis(
                () => store.importovatUdalosti(vybrane),
                `Importováno: ${vybrane.length}`
              )) {
                setImporty(null)
              }
            }}
          >
            Importovat vybrané ({vybraneImporty.size})
          </button>
        </Modal>
      )}
    </section>
  )
}
