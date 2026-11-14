import React, { useEffect, useRef, useState } from 'react'
import { spustPrikaz } from '../commands'
import { SurfaceThemeScope } from '@/features/appearance/SurfaceAppearance'

interface Radek {
  typ: 'prikaz' | 'vystup'
  text: string
}

// ==========================================
// Konzole. Zatím jen appinfo a help — do budoucna sem přibudou příkazy
// na správu aplikace, proto PRIKAZY žije v samostatném commands.ts
// (viz komentář tam) a tenhle soubor neví nic o tom, co který příkaz
// dělá, jen vypisuje výsledek.
// ==========================================

export const KonzolePanel: React.FC = () => {
  const [radky, setRadky] = useState<Radek[]>([
    { typ: 'vystup', text: 'Buddy Admin Konzole — napiš "help" pro seznam příkazů.' },
  ])
  const [vstup, setVstup] = useState('')
  const log = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight
  }, [radky])

  const odeslat = (e: React.FormEvent) => {
    e.preventDefault()
    const prikaz = vstup.trim()
    if (!prikaz) return

    const vystup = spustPrikaz(prikaz)
    setRadky((r) => [
      ...r,
      { typ: 'prikaz', text: prikaz },
      ...vystup.map((text): Radek => ({ typ: 'vystup', text })),
    ])
    setVstup('')
  }

  return (
    <SurfaceThemeScope surfaceId="admin-console">
    <section className="admin-card admin-konzole">
      <div className="admin-konzole-log" ref={log} role="log" aria-label="Výstup konzole">
        {radky.map((r, i) => (
          <div key={i} className={`admin-konzole-radek admin-konzole-radek--${r.typ}`}>
            {r.typ === 'prikaz' ? `> ${r.text}` : r.text}
          </div>
        ))}
      </div>

      <form className="admin-konzole-vstup" onSubmit={odeslat}>
        <span className="admin-konzole-prompt">{'>'}</span>
        <input
          aria-label="Příkaz"
          value={vstup}
          onChange={(e) => setVstup(e.target.value)}
          placeholder="napiš příkaz…"
          autoComplete="off"
          spellCheck={false}
        />
        <button className="buddy-ui-button buddy-ui-button--primary" type="submit" disabled={!vstup.trim()}>Spustit</button>
      </form>
    </section>
    </SurfaceThemeScope>
  )
}
