import React from 'react'
import type { PostavaId } from '../combat/postavy'
import './PostavaGrafika.css'

interface Props {
  postavaId: PostavaId
  size?: number
  /** Jemné dýchavé pohupování — jen pro výběr postavy na ovladači
   *  (VyberPostavy.tsx), NE pro token v aréně (Bojiste.tsx), kde stav
   *  bojovníka (idle/útok/hitstun/blok/ko) už řídí vlastní animaci na
   *  obalovém <div> a dvě animace na sobě by se rvaly o transform. */
  animovana?: boolean
  className?: string
}

interface PaletaPostavy {
  telo: string
  teloSvetle: string
  akcent: string
  aura: string
}

// ==========================================
// Fáze 6 — ruční SVG ilustrace čtyř bojovníků Souboje, náhrada za
// emoji ikony z Fáze 2/3 (viz CLAUDE.md). RPG hrdinové appky mají
// skutečný fotkový pipeline (public/postavy/<id>.jpg, ořezané z
// referenčního obrázkového sheetu — viz Game hub sekce), ale takový
// sheet pro tuhle zbrusu novou čtveřici neexistuje a appka nemá k
// dispozici žádný nástroj na generování obrázků — jediná cesta ke
// "skutečné grafice", kterou appka umí sama vyrobit, je ruční SVG.
// Vektor navíc sedí líp na "2D/2.5D stylizovaný vzhled", rozhodnutý
// přes AskUserQuestion ještě před Fází 0 (žádný 3D pipeline na
// postavy v projektu neexistuje), a beze ztráty ostrosti škáluje
// mezi malou kartou na ovladači a větším tokenem v aréně na TV — bez
// druhé sady souborů pro dvě velikosti, jako by to potřeboval rastr.
// Barvy/doplněk se odvozují jen od postavaId, žádný vlastní stav,
// žádný requestAnimationFrame — čistě prezentační, stejná kázeň jako
// Bojiste.tsx samotné.
// ==========================================

const PALETY: Record<PostavaId, PaletaPostavy> = {
  pyra: { telo: '#dc2626', teloSvetle: '#fca5a5', akcent: '#fed7aa', aura: 'rgba(249, 115, 22, 0.55)' },
  bulwark: { telo: '#1d4ed8', teloSvetle: '#93c5fd', akcent: '#e2e8f0', aura: 'rgba(59, 130, 246, 0.45)' },
  volt: { telo: '#ca8a04', teloSvetle: '#fde68a', akcent: '#fef9c3', aura: 'rgba(250, 204, 21, 0.55)' },
  onyx: { telo: '#4c1d95', teloSvetle: '#a78bfa', akcent: '#c4b5fd', aura: 'rgba(139, 92, 246, 0.5)' },
}

export const PostavaGrafika: React.FC<Props> = ({ postavaId, size = 72, animovana = false, className }) => {
  const p = PALETY[postavaId]
  const gradId = `souboj-aura-${postavaId}`

  return (
    <svg
      viewBox="0 0 120 160"
      width={size}
      height={Math.round((size * 160) / 120)}
      className={`souboj-postava-svg ${animovana ? 'souboj-postava-svg--animovana' : ''} ${className ?? ''}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={gradId} cx="50%" cy="55%" r="60%">
          <stop offset="0%" stopColor={p.aura} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      <ellipse cx="60" cy="90" rx="54" ry="54" fill={`url(#${gradId})`} />

      {/* signátura vzadu za tělem — Onyxův plášť, Bulwarkův štítový kotouč */}
      {postavaId === 'onyx' && (
        <path d="M20 60 Q10 102 26 148 L44 140 Q30 100 40 66 Z" fill={p.telo} opacity="0.85" />
      )}
      {postavaId === 'bulwark' && <ellipse cx="60" cy="96" rx="32" ry="36" fill={p.teloSvetle} opacity="0.3" />}

      {/* nohy */}
      <rect x="42" y="118" width="14" height="34" rx="6" fill={p.telo} />
      <rect x="64" y="118" width="14" height="34" rx="6" fill={p.telo} />

      {/* trup */}
      <rect x="38" y="66" width="44" height="58" rx="16" fill={p.telo} />
      <rect x="38" y="66" width="44" height="20" rx="10" fill={p.teloSvetle} opacity="0.5" />

      {/* paže */}
      <rect x="20" y="70" width="16" height="42" rx="8" fill={p.telo} />
      <rect x="84" y="70" width="16" height="42" rx="8" fill={p.telo} />

      {/* hlava */}
      <circle cx="60" cy="40" r="24" fill={p.teloSvetle} />
      <circle cx="52" cy="40" r="3.5" fill="#0f172a" />
      <circle cx="68" cy="40" r="3.5" fill="#0f172a" />

      {/* postavu odlišující doplněk */}
      {postavaId === 'pyra' && (
        <path
          d="M60 6 L68 24 L60 19 L52 24 Z M45 11 L52 26 L43 23 Z M75 11 L68 26 L77 23 Z"
          fill={p.akcent}
        />
      )}
      {postavaId === 'bulwark' && <path d="M60 10 L83 23 L83 40 L60 32 L37 40 L37 23 Z" fill={p.akcent} />}
      {postavaId === 'volt' && <path d="M63 6 L49 28 L58 28 L50 42 L74 18 L62 18 Z" fill={p.akcent} />}
      {postavaId === 'onyx' && (
        <path d="M96 40 L104 128 L96 132 L86 44 Z" fill={p.akcent} stroke="#1e1b4b" strokeWidth="1.5" />
      )}
    </svg>
  )
}
