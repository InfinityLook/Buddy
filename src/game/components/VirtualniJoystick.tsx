import React, { useRef } from 'react'
import './VirtualniJoystick.css'

interface Props {
  /** Volá se při každé změně polohy palce (x, z, oba -1..1) a s (0, 0)
   *  při puštění. Konzumuje usePlayerWorld.nastavJoystick přímo. */
  onZmena: (x: number, z: number) => void
}

const POLOMER_ZAKLADNY = 52

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
    // Obrazovka: dy kladné = dolů = dozadu, proto opačné znaménko pro z.
    onZmena(dx / POLOMER_ZAKLADNY, -dy / POLOMER_ZAKLADNY)
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
