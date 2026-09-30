import React, { useRef } from 'react'
import './VirtualniJoystick.css'

interface Props {
  /** Volá se při každé změně polohy palce (x, z, oba -1..1) a s (0, 0)
   *  při puštění. Konzumuje usePlayerWorld.nastavJoystick přímo. */
  onZmena: (x: number, z: number) => void
}

const POLOMER_ZAKLADNY = 52
/** Mrtvá zóna kolem středu (appčino "vylepši ovládání" zadání u
 *  appčina Survival Night, zavedené tady, protože jde o jediný zdroj
 *  vstupu appka sdílí s appčiným 3D průzkumem) — bez ní i nepatrné,
 *  neúmyslné posunutí palce (chvění prstu, nepřesný dotek na okraji
 *  základny) poslalo nenulový vektor a postava se tak trochu "táhla"
 *  i beze skutečného úmyslu appku pohnout. appka zbytek dráhy za
 *  mrtvou zónou přeškáluje zpátky na 0..1 (viz zpracujPolohu níž), ať
 *  appčin výstup pořád doopravdy dosáhne plné rychlosti na kraji
 *  joysticku, ne jen na (1 - PODIL_MRTVE_ZONY) jejího rozsahu. */
const PODIL_MRTVE_ZONY = 0.12

// ==========================================
// Virtuální joystick pro pohyb ve 3D průzkumu na mobilu — čisté DOM
// prvky, žádné plátno navíc. Leží mimo DOM strom kontejneru
// usePlayerWorld.ts (viz komentář tam), takže dotyk na něm nikdy
// nespustí otáčení kamerou — je to jiný element, prohlížeč pošle
// pointer eventy jen sem.
// ==========================================

export const VirtualniJoystick: React.FC<Props> = ({ onZmena }) => {
  const zakladnaRef = useRef<HTMLDivElement>(null)
  const knoflikRef = useRef<HTMLDivElement>(null)
  const aktivniDotyk = useRef<number | null>(null)

  const zpracujPolohu = (clientX: number, clientY: number) => {
    const zakladna = zakladnaRef.current
    const knoflik = knoflikRef.current
    if (!zakladna || !knoflik) return

    const rect = zakladna.getBoundingClientRect()
    const stredX = rect.left + rect.width / 2
    const stredY = rect.top + rect.height / 2

    let dx = clientX - stredX
    let dy = clientY - stredY
    const vzdalenost = Math.hypot(dx, dy)
    if (vzdalenost > POLOMER_ZAKLADNY) {
      dx = (dx / vzdalenost) * POLOMER_ZAKLADNY
      dy = (dy / vzdalenost) * POLOMER_ZAKLADNY
    }

    knoflik.style.transform = `translate(${dx}px, ${dy}px)`

    // Appka pod mrtvou zónou pošle přesně (0, 0) — appčin vizuální
    // knoflík pořád sleduje prst 1:1 (appka appku nenechává "cuknout"
    // vizuálně, jen appčin VÝSTUP appka škáluje), jen appka nepošle
    // téměř-nulový-ale-ne-úplně vektor dál do enginu.
    const prahPx = POLOMER_ZAKLADNY * PODIL_MRTVE_ZONY
    if (vzdalenost < prahPx) {
      onZmena(0, 0)
      return
    }
    const smerX = dx / vzdalenost
    const smerY = dy / vzdalenost
    const skalovanaVzd = Math.min(1, (vzdalenost - prahPx) / (POLOMER_ZAKLADNY - prahPx))
    // Obrazovka: dy kladné = dolů = dozadu, proto opačné znaménko pro z.
    onZmena(smerX * skalovanaVzd, -smerY * skalovanaVzd)
  }

  const pusteno = () => {
    aktivniDotyk.current = null
    const knoflik = knoflikRef.current
    if (knoflik) knoflik.style.transform = 'translate(0, 0)'
    onZmena(0, 0)
  }

  return (
    <div
      ref={zakladnaRef}
      className="explorace-joystick"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        aktivniDotyk.current = e.pointerId
        zpracujPolohu(e.clientX, e.clientY)
      }}
      onPointerMove={(e) => {
        if (aktivniDotyk.current !== e.pointerId) return
        zpracujPolohu(e.clientX, e.clientY)
      }}
      onPointerUp={(e) => {
        if (aktivniDotyk.current !== e.pointerId) return
        pusteno()
      }}
      onPointerCancel={(e) => {
        if (aktivniDotyk.current !== e.pointerId) return
        pusteno()
      }}
    >
      <div ref={knoflikRef} className="explorace-joystick-knoflik" />
    </div>
  )
}
