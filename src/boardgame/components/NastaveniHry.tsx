import React, { useState } from 'react'
import { startovniPozice, VYCHOZI_LIMIT_MINUT, vytvorHrace } from '../engine'
import { VSECHNY_POSTAVY, type PostavaId } from '../postavy'
import type { Hrac, LimitMinut } from '../types'

// ==========================================
// Buddyho Trh — nastavení lokální hry. Dva stepper (lidí u zařízení,
// botů navíc) plus jeden řádek na "sedadlo" — jméno (jen u lidí) a
// tlačítko postavy, co při klepnutí přeskočí na další volnou postavu
// (žádný samostatný výběrový grid, appka má jen 6 postav a 2–6 sedadel,
// takže cyklování stačí a je to nejmíň obrazovek na cestu ke hře).
//
// Časový limit je čtyři pevné pilulky (15/30/45/60 min), přesně jak
// to bylo domluvené v mechanické diskuzi — žádný volný vstup, žádný
// "bez limitu" (na rozdíl od per-tahového timeru, který appka
// naopak nemá vůbec).
// ==========================================

const MIN_HRACU = 2
const MAX_HRACU = 6
const LIMITY_MINUT: LimitMinut[] = [15, 30, 45, 60]

interface Sedadlo {
  id: string
  jeBot: boolean
  jmeno: string
  postavaId: PostavaId
}

const vychoziSedadla = (pocetLidi: number, pocetBotu: number): Sedadlo[] => {
  const sedadla: Sedadlo[] = []
  for (let i = 0; i < pocetLidi; i++) {
    sedadla.push({
      id: `hrac-${i}`,
      jeBot: false,
      jmeno: `Hráč ${i + 1}`,
      postavaId: VSECHNY_POSTAVY[i % VSECHNY_POSTAVY.length].id,
    })
  }
  for (let i = 0; i < pocetBotu; i++) {
    sedadla.push({
      id: `bot-${i}`,
      jeBot: true,
      jmeno: `Bot ${i + 1}`,
      postavaId: VSECHNY_POSTAVY[(pocetLidi + i) % VSECHNY_POSTAVY.length].id,
    })
  }
  return sedadla
}

const dalsiVolnaPostava = (aktualni: PostavaId, obsazene: Set<PostavaId>): PostavaId => {
  const ids = VSECHNY_POSTAVY.map((p) => p.id)
  let index = ids.indexOf(aktualni)
  for (let krok = 0; krok < ids.length; krok++) {
    index = (index + 1) % ids.length
    if (ids[index] === aktualni || !obsazene.has(ids[index])) return ids[index]
  }
  return aktualni
}

interface Props {
  onZpet: () => void
  onSpustit: (hraci: Hrac[], limitMinut: LimitMinut) => void
}

export const NastaveniHry: React.FC<Props> = ({ onZpet, onSpustit }) => {
  const [pocetLidi, setPocetLidi] = useState(2)
  const [pocetBotu, setPocetBotu] = useState(0)
  const [sedadla, setSedadla] = useState<Sedadlo[]>(() => vychoziSedadla(2, 0))
  const [limitMinut, setLimitMinut] = useState<LimitMinut>(VYCHOZI_LIMIT_MINUT)

  const celkem = pocetLidi + pocetBotu

  const prepocitat = (noviLide: number, noviBoti: number) => {
    setPocetLidi(noviLide)
    setPocetBotu(noviBoti)
    setSedadla(vychoziSedadla(noviLide, noviBoti))
  }

  const zmenLidi = (delta: number) => {
    const novi = Math.max(1, Math.min(MAX_HRACU, pocetLidi + delta))
    const boti = Math.min(pocetBotu, MAX_HRACU - novi)
    prepocitat(novi, boti)
  }

  const zmenBoty = (delta: number) => {
    const novi = Math.max(0, Math.min(MAX_HRACU - pocetLidi, pocetBotu + delta))
    prepocitat(pocetLidi, novi)
  }

  const zmenJmeno = (id: string, jmeno: string) => {
    setSedadla((s) => s.map((sedadlo) => (sedadlo.id === id ? { ...sedadlo, jmeno } : sedadlo)))
  }

  const cyklujPostavu = (id: string) => {
    setSedadla((s) => {
      const obsazene = new Set(s.map((sedadlo) => sedadlo.postavaId))
      return s.map((sedadlo) =>
        sedadlo.id === id ? { ...sedadlo, postavaId: dalsiVolnaPostava(sedadlo.postavaId, obsazene) } : sedadlo
      )
    })
  }

  const spustit = () => {
    const hraci = sedadla.map((sedadlo, poradi) =>
      vytvorHrace(
        sedadlo.id,
        sedadlo.jmeno.trim() || (sedadlo.jeBot ? `Bot ${poradi + 1}` : `Hráč ${poradi + 1}`),
        sedadlo.postavaId,
        sedadlo.jeBot,
        startovniPozice(poradi, sedadla.length)
      )
    )
    onSpustit(hraci, limitMinut)
  }

  return (
    <div className="trh-page">
      <header className="trh-top-bar">
        <button className="trh-back-btn" onClick={onZpet}>
          ← Zpět
        </button>
        <h1 className="trh-title">Nastavení hry</h1>
      </header>

      <div className="trh-stepper-radek">
        <span>Hráči u tohoto zařízení</span>
        <div className="trh-stepper">
          <button onClick={() => zmenLidi(-1)} disabled={pocetLidi <= 1} aria-label="Ubrat hráče">
            −
          </button>
          <strong>{pocetLidi}</strong>
          <button onClick={() => zmenLidi(1)} disabled={celkem >= MAX_HRACU} aria-label="Přidat hráče">
            +
          </button>
        </div>
      </div>

      <div className="trh-stepper-radek">
        <span>Boti navíc</span>
        <div className="trh-stepper">
          <button onClick={() => zmenBoty(-1)} disabled={pocetBotu <= 0} aria-label="Ubrat bota">
            −
          </button>
          <strong>{pocetBotu}</strong>
          <button onClick={() => zmenBoty(1)} disabled={celkem >= MAX_HRACU} aria-label="Přidat bota">
            +
          </button>
        </div>
      </div>

      {celkem < MIN_HRACU && <p className="trh-varovani">Potřeba aspoň {MIN_HRACU} hráči celkem.</p>}

      <div className="trh-stepper-radek">
        <span>Časový limit hry</span>
        <div className="trh-limit-pilulky">
          {LIMITY_MINUT.map((min) => (
            <button
              key={min}
              className={`trh-limit-pilulka ${limitMinut === min ? 'je-vybrana' : ''}`}
              onClick={() => setLimitMinut(min)}
            >
              {min} min
            </button>
          ))}
        </div>
      </div>

      <ul className="trh-sedadla">
        {sedadla.map((sedadlo) => {
          const postava = VSECHNY_POSTAVY.find((p) => p.id === sedadlo.postavaId)!
          return (
            <li key={sedadlo.id} className="trh-sedadlo">
              {sedadlo.jeBot ? (
                <span className="trh-sedadlo-jmeno">{sedadlo.jmeno}</span>
              ) : (
                <input
                  className="trh-sedadlo-jmeno-input"
                  value={sedadlo.jmeno}
                  onChange={(e) => zmenJmeno(sedadlo.id, e.target.value)}
                  maxLength={16}
                />
              )}
              <button
                className="trh-postava-btn"
                style={{ borderColor: postava.barva }}
                onClick={() => cyklujPostavu(sedadlo.id)}
              >
                <span aria-hidden="true">{postava.emoji}</span> {postava.jmeno}
              </button>
            </li>
          )
        })}
      </ul>

      <button className="trh-spustit-btn" onClick={spustit} disabled={celkem < MIN_HRACU}>
        Spustit hru ({celkem} hráčů)
      </button>
    </div>
  )
}

export default NastaveniHry
