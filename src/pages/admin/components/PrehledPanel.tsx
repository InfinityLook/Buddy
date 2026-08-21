import React, { useEffect, useRef, useState } from 'react'
import * as adminApi from '../api'
import { nactiAplikaceMetriky, AplikaceMetriky } from '../metrics'
import { AdminPrehled, ZdrojMetrik } from '../types'

const ZDROJE: { id: ZdrojMetrik; label: string }[] = [
  { id: 'aplikace', label: 'Aplikace' },
  { id: 'supabase', label: 'Supabase' },
  { id: 'vercel', label: 'Vercel' },
]

// Kolik vzorků zátěže si graf pamatuje — 20 vzorků po 3 s je poslední
// minuta běhu, dost na to, aby byl vidět trend, a málo na to, aby se
// sloupečky na malém displeji nezmáčkly k nerozeznání.
const POCET_VZORKU = 20
const INTERVAL_MS = 3000

const formatUptime = (od: number): string => {
  const s = Math.floor((Date.now() - od) / 1000)
  if (s < 60) return `${s} s`
  const min = Math.floor(s / 60)
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)} h ${min % 60} min`
}

const StatCard: React.FC<{ hodnota: number | string; label: string }> = ({ hodnota, label }) => (
  <div className="admin-stat-card">
    <span className="admin-stat-hodnota">{hodnota}</span>
    <span className="admin-stat-label">{label}</span>
  </div>
)

export const PrehledPanel: React.FC = () => {
  const [prehled, setPrehled] = useState<AdminPrehled | null>(null)
  const [zdroj, setZdroj] = useState<ZdrojMetrik>('aplikace')
  const [metriky, setMetriky] = useState<AplikaceMetriky | null>(null)
  const [vzorky, setVzorky] = useState<number[]>([])
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    void adminApi.nactiPrehled().then(setPrehled)
  }, [])

  // Živý graf jede jen pro zdroj "Aplikace" — jediný, u kterého se dá
  // bezpečně měřit cokoliv bez tajného tokenu (viz metrics.ts). Interval
  // se zastavuje při odchodu z panelu, jinak by běžel navěky na pozadí.
  useEffect(() => {
    if (zdroj !== 'aplikace') return

    const tik = async () => {
      const m = await nactiAplikaceMetriky()
      setMetriky(m)
      if (m.pametMB) {
        const procento = Math.round((m.pametMB.pouzito / m.pametMB.limit) * 100)
        setVzorky((v) => [...v, procento].slice(-POCET_VZORKU))
      }
    }

    void tik()
    timerRef.current = window.setInterval(tik, INTERVAL_MS)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [zdroj])

  return (
    <div className="admin-prehled">
      {/* Stavový přehled */}
      <section className="admin-card">
        <span className="admin-card-title">Stav aplikace</span>
        {prehled ? (
          <div className="admin-stats-grid">
            <StatCard hodnota={prehled.pocetUctu} label="Účtů" />
            <StatCard hodnota={prehled.pocetNevyrizenychHlaseni} label="Nevyřízených hlášení" />
            <StatCard hodnota={prehled.pocetHlaseniCelkem} label="Hlášení celkem" />
            <StatCard hodnota={prehled.pocetZprav24h} label="Zpráv za 24 h" />
            <StatCard hodnota={prehled.pocetChatu} label="Chatů" />
            <StatCard hodnota={prehled.pocetPratelstvi} label="Přátelství" />
          </div>
        ) : (
          <p className="admin-empty">Načítám, nebo cloud není dostupný.</p>
        )}
      </section>

      {/* Graf a živé parametry */}
      <section className="admin-card">
        <div className="admin-card-head">
          <span className="admin-card-title">Zátěž a parametry</span>
          <div className="admin-zdroj-toggle">
            {ZDROJE.map((z) => (
              <button
                key={z.id}
                className={zdroj === z.id ? 'active' : ''}
                onClick={() => setZdroj(z.id)}
              >
                {z.label}
              </button>
            ))}
          </div>
        </div>

        {zdroj !== 'aplikace' ? (
          <p className="admin-empty">
            Živá data z {zdroj === 'supabase' ? 'Supabase' : 'Vercelu'} vyžadují zabezpečený server,
            který by držel přístupový token mimo dosah prohlížeče — ten se v čistě klientské appce
            nedá bezpečně schovat. Zatím nedostupné, viz poznámka v CLAUDE.md.
          </p>
        ) : metriky ? (
          <>
            <div className="admin-graf">
              {vzorky.map((v, i) => (
                <div key={i} className="admin-graf-sloupec" style={{ height: `${Math.max(2, v)}%` }} />
              ))}
            </div>
            <div className="admin-metriky-grid">
              <span>Verze</span>
              <span>{metriky.verze}</span>
              <span>Build</span>
              <span className="admin-mono">{metriky.buildId}</span>
              <span>Běží od</span>
              <span>{formatUptime(metriky.bezimOd)}</span>
              <span>Paměť</span>
              <span>{metriky.pametMB ? `${metriky.pametMB.pouzito} / ${metriky.pametMB.limit} MB` : 'nedostupné'}</span>
              <span>Úložiště</span>
              <span>{metriky.ulozisteMB ? `${metriky.ulozisteMB.pouzito} / ${metriky.ulozisteMB.kvota} MB` : 'nedostupné'}</span>
              <span>Cache úložiště</span>
              <span>{metriky.pocetCacheStorage}</span>
              <span>Připojení</span>
              <span>{metriky.online ? 'online' : 'offline'}</span>
            </div>
          </>
        ) : (
          <p className="admin-empty">Měřím…</p>
        )}
      </section>
    </div>
  )
}
