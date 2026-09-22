import React, { useMemo, useRef, useState } from 'react'
import { AppIcon } from './AppIcon'
import type { AppItem } from '@/core/store/useAppStore'
import { zacykliIndex, melByPotvrditTazeni, dragNaklonStupnu, tazeniProcento } from './roomCarouselMath'
import './RoomCarousel.css'

interface RoomCarouselProps {
  rooms: AppItem[]
  onEnter: (room: AppItem) => void
}

// ==========================================
// Carousel Roomů nad mřížkou /apps — schválený mockup (viz CLAUDE.md,
// odsouhlaseno jako Artifact přes AskUserQuestion před stavěním).
// Vždy jeden Room uprostřed, přes plochu telefonu, swipe/tažení nebo
// šipky mezi nimi, samostatné tlačítko "Vstoupit" naviguje dovnitř —
// nic se nenaviguje jen tím, že se karta objeví uprostřed.
//
// Matematika tažení (zacyklení, práh, náklon) je čistá a testovaná
// v roomCarouselMath.ts, tahle komponenta ji jen volá a promítá do
// transformů — stejné rozdělení jako combat/engine.ts <-> Bojiste.tsx
// jinde v appce.
// ==========================================

// Stejné hex dvojice jako AppModule.css's .app-card-icon-wrap.<color> —
// vlastní kopie, ne import CSS třídy, protože tenhle carousel skládá
// gradient přímo do inline stylu (potřebuje ho i pro auroru na
// pozadí, ne jen na malý odznak ikony). Malá přijatá duplikace, stejná
// jako BARVY_UZLU jinde v appce — obě místa se čtou snadno samostatně.
const GRADIENTY: Record<AppItem['color'], [string, string]> = {
  purple: ['#7c3aed', '#a855f7'],
  cyan: ['#0284c7', '#38bdf8'],
  orange: ['#d97706', '#fbbf24'],
  green: ['#059669', '#34d399'],
  pink: ['#db2777', '#f472b6'],
  gold: ['#a16207', '#eab308'],
}

export const RoomCarousel: React.FC<RoomCarouselProps> = ({ rooms, onEnter }) => {
  const [active, setActive] = useState(0)
  const [animovat, setAnimovat] = useState(true)
  const stageRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const dragStartXRef = useRef(0)
  const [dragDeltaX, setDragDeltaX] = useState(0)

  const aktivniIndex = zacykliIndex(active, rooms.length)
  const predchoziIndex = zacykliIndex(aktivniIndex - 1, rooms.length)
  const dalsiIndex = zacykliIndex(aktivniIndex + 1, rooms.length)

  const jit = (novyIndex: number) => {
    setAnimovat(true)
    setActive(novyIndex)
  }

  const naklon = useMemo(() => {
    const sirka = stageRef.current?.clientWidth ?? 300
    return dragNaklonStupnu(dragDeltaX, sirka)
  }, [dragDeltaX])

  const procento = useMemo(() => {
    const sirka = stageRef.current?.clientWidth ?? 300
    return tazeniProcento(dragDeltaX, sirka)
  }, [dragDeltaX])

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.rc-enter-btn')) return
    draggingRef.current = true
    dragStartXRef.current = e.clientX
    setDragDeltaX(0)
    setAnimovat(false)
    stageRef.current?.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return
    setDragDeltaX(e.clientX - dragStartXRef.current)
  }

  const koncTazeni = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    const delta = dragDeltaX
    setDragDeltaX(0)
    setAnimovat(true)
    if (melByPotvrditTazeni(delta)) {
      jit(zacykliIndex(aktivniIndex + (delta < 0 ? 1 : -1), rooms.length))
    }
  }

  if (rooms.length === 0) return null

  const aktivniStyl: React.CSSProperties = draggingRef.current
    ? {
        transform: `translateX(${dragDeltaX * 0.9}px) rotateY(${naklon}deg) scale(${1 - Math.abs(procento) * 0.05})`,
        transition: 'none',
      }
    : {}

  return (
    <div className="rc-wrap">
      <button
        className="rc-arrow rc-arrow--left"
        aria-label="Předchozí Room"
        onClick={() => jit(zacykliIndex(aktivniIndex - 1, rooms.length))}
      >
        <AppIcon name="arrow-left" size={18} />
      </button>
      <button
        className="rc-arrow rc-arrow--right"
        aria-label="Další Room"
        onClick={() => jit(zacykliIndex(aktivniIndex + 1, rooms.length))}
      >
        <AppIcon name="arrow-right" size={18} />
      </button>

      <div
        className="rc-stage"
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={koncTazeni}
        onPointerCancel={koncTazeni}
        onPointerLeave={() => draggingRef.current && koncTazeni()}
      >
        {rooms.map((room, idx) => {
          let stavTrida = 'rc-hidden'
          let styl: React.CSSProperties | undefined
          if (idx === aktivniIndex) {
            stavTrida = 'rc-active'
            styl = aktivniStyl
          } else if (idx === predchoziIndex) stavTrida = 'rc-prev'
          else if (idx === dalsiIndex) stavTrida = 'rc-next'

          const [barvaA, barvaB] = GRADIENTY[room.color]

          return (
            <div
              key={room.id}
              className={`rc-card ${stavTrida} ${animovat ? '' : 'rc-no-anim'}`}
              style={{
                ...styl,
                ...(room.nahled ? { backgroundImage: `url(${room.nahled})` } : {}),
                ['--rc-a' as string]: barvaA,
                ['--rc-b' as string]: barvaB,
              }}
            >
              {!room.nahled && (
                <div className="rc-aurora" aria-hidden="true">
                  <div className="rc-blob rc-blob--1" />
                  <div className="rc-blob rc-blob--2" />
                  <div className="rc-blob rc-blob--3" />
                  <div className="rc-sheen" />
                  <div className="rc-grid-pattern" />
                </div>
              )}
              <div className="rc-grain" aria-hidden="true" />
              <div className="rc-veil" aria-hidden="true" />

              <span className={room.nahled ? 'rc-tag rc-tag--photo' : 'rc-tag'}>
                {room.nahled ? 'Reálná fotka' : '🎨 čeká na fotku'}
              </span>

              <div className="rc-content">
                <div className="rc-icon-orbit">
                  <div className="rc-ring" />
                  <div className="rc-icon-badge">
                    <AppIcon name={room.icon} size={24} />
                  </div>
                  <span className="rc-particle" />
                  <span className="rc-particle" />
                  <span className="rc-particle" />
                </div>
                <h2 className="rc-title">
                  {room.title.split(' ').map((slovo, i) => (
                    <span key={i} className="rc-title-word" style={{ animationDelay: `${i * 70}ms` }}>
                      {slovo}
                    </span>
                  ))}
                </h2>
                <p className="rc-desc">{room.category}</p>
                <button className="rc-enter-btn" onClick={() => onEnter(room)}>
                  <span className="rc-enter-label">Vstoupit</span>
                  <AppIcon name="arrow-right" size={16} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="rc-progress-row">
        <div className="rc-dots-track">
          {rooms.map((room, idx) => (
            <button
              key={room.id}
              className="rc-dot-slot"
              aria-label={`Přejít na ${room.title}`}
              onClick={() => jit(idx)}
            />
          ))}
          <div
            className="rc-liquid-pill"
            style={{
              transform: `translateX(${aktivniIndex * 13}px)`,
              background: `linear-gradient(90deg, ${GRADIENTY[rooms[aktivniIndex].color][0]}, ${GRADIENTY[rooms[aktivniIndex].color][1]})`,
            }}
          />
        </div>
        <span className="rc-counter">
          {aktivniIndex + 1} / {rooms.length}
        </span>
      </div>
    </div>
  )
}
