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
  /** Tmavší odstín těla — spodní zastávka přechodu na trupu/nohou
   *  (viz `bodyGradId` níž) a barva rukavic/bot, ať postavička
   *  vypadá stínovaná, ne plochá. */
  teloTmave: string
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
//
// Druhé kolo vylepšení (po prvním AskUserQuestion, viz CLAUDE.md)
// přidalo stínovaný přechod na trupu/nohou/pažích místo plochých
// barev, tmavý obrys na hlavních tvarech (jednotné `OBRYS`, ne barva
// odvozená per postava — jednodušší a pořád dost tmavá na cokoli z
// palety), drobné "rukavice" na koncích paží v barvě doplňku (spojuje
// postavu s jejím vlastním akcentem) a lehce asymetrický bojový postoj
// (jedna paže výš, druhá níž) místo úplně symetrické figury.
// ==========================================

const OBRYS = 'rgba(15, 23, 42, 0.38)'

const PALETY: Record<PostavaId, PaletaPostavy> = {
  pyra: {
    telo: '#dc2626',
    teloSvetle: '#fca5a5',
    teloTmave: '#7f1d1d',
    akcent: '#fed7aa',
    aura: 'rgba(249, 115, 22, 0.55)',
  },
  bulwark: {
    telo: '#1d4ed8',
    teloSvetle: '#93c5fd',
    teloTmave: '#1e3a8a',
    akcent: '#e2e8f0',
    aura: 'rgba(59, 130, 246, 0.45)',
  },
  volt: {
    telo: '#ca8a04',
    teloSvetle: '#fde68a',
    teloTmave: '#854d0e',
    akcent: '#fef9c3',
    aura: 'rgba(250, 204, 21, 0.55)',
  },
  onyx: {
    telo: '#4c1d95',
    teloSvetle: '#a78bfa',
    teloTmave: '#2e1065',
    akcent: '#c4b5fd',
    aura: 'rgba(139, 92, 246, 0.5)',
  },
}

export const PostavaGrafika: React.FC<Props> = ({ postavaId, size = 72, animovana = false, className }) => {
  const p = PALETY[postavaId]
  const gradAuraId = `souboj-aura-${postavaId}`
  const gradTeloId = `souboj-telo-${postavaId}`

  return (
    <svg
      viewBox="0 0 120 160"
      width={size}
      height={Math.round((size * 160) / 120)}
      className={`souboj-postava-svg ${animovana ? 'souboj-postava-svg--animovana' : ''} ${className ?? ''}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={gradAuraId} cx="50%" cy="55%" r="60%">
          <stop offset="0%" stopColor={p.aura} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        {/* Sdílený stínovaný přechod pro trup/nohy/paže — jeden gradient
            na postavu, ne jeden na tvar, ať těla drží stejné "světlo
            shora" napříč celou postavičkou. */}
        <linearGradient id={gradTeloId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={p.telo} />
          <stop offset="100%" stopColor={p.teloTmave} />
        </linearGradient>
      </defs>

      <ellipse cx="60" cy="90" rx="54" ry="54" fill={`url(#${gradAuraId})`} />

      {/* signátura vzadu za tělem — Onyxův plášť, Bulwarkův štítový kotouč */}
      {postavaId === 'onyx' && (
        <path d="M20 60 Q10 102 26 148 L44 140 Q30 100 40 66 Z" fill={p.telo} stroke={OBRYS} strokeWidth="1.5" opacity="0.85" />
      )}
      {postavaId === 'bulwark' && <ellipse cx="60" cy="96" rx="32" ry="36" fill={p.teloSvetle} opacity="0.3" />}

      {/* nohy — lehce od sebe, bojový postoj */}
      <rect x="40" y="118" width="14" height="34" rx="6" fill={`url(#${gradTeloId})`} stroke={OBRYS} strokeWidth="1.5" />
      <rect x="66" y="118" width="14" height="34" rx="6" fill={`url(#${gradTeloId})`} stroke={OBRYS} strokeWidth="1.5" />
      {/* boty */}
      <rect x="38" y="146" width="18" height="8" rx="4" fill={p.teloTmave} />
      <rect x="64" y="146" width="18" height="8" rx="4" fill={p.teloTmave} />

      {/* trup */}
      <rect x="38" y="66" width="44" height="58" rx="16" fill={`url(#${gradTeloId})`} stroke={OBRYS} strokeWidth="1.5" />
      <rect x="38" y="66" width="44" height="20" rx="10" fill={p.teloSvetle} opacity="0.45" />

      {/* paže — mírně asymetrický postoj (levá výš, jako střeh) */}
      <rect x="18" y="64" width="16" height="42" rx="8" fill={`url(#${gradTeloId})`} stroke={OBRYS} strokeWidth="1.5" />
      <rect x="86" y="74" width="16" height="42" rx="8" fill={`url(#${gradTeloId})`} stroke={OBRYS} strokeWidth="1.5" />
      {/* rukavice v barvě doplňku — propojuje postavičku s jejím akcentem */}
      <circle cx="26" cy="108" r="9" fill={p.akcent} stroke={OBRYS} strokeWidth="1.5" opacity="0.92" />
      <circle cx="94" cy="118" r="9" fill={p.akcent} stroke={OBRYS} strokeWidth="1.5" opacity="0.92" />

      {/* hlava */}
      <circle cx="60" cy="40" r="24" fill={p.teloSvetle} stroke={OBRYS} strokeWidth="1.5" />
      <ellipse cx="51" cy="30" rx="7" ry="5" fill="#ffffff" opacity="0.35" />
      <circle cx="52" cy="40" r="3.5" fill="#0f172a" />
      <circle cx="68" cy="40" r="3.5" fill="#0f172a" />

      {/* postavu odlišující doplněk */}
      {postavaId === 'pyra' && (
        <path
          d="M60 6 L68 24 L60 19 L52 24 Z M45 11 L52 26 L43 23 Z M75 11 L68 26 L77 23 Z"
          fill={p.akcent}
          stroke={OBRYS}
          strokeWidth="1"
        />
      )}
      {postavaId === 'bulwark' && (
        <path d="M60 10 L83 23 L83 40 L60 32 L37 40 L37 23 Z" fill={p.akcent} stroke={OBRYS} strokeWidth="1" />
      )}
      {postavaId === 'volt' && (
        <path d="M63 6 L49 28 L58 28 L50 42 L74 18 L62 18 Z" fill={p.akcent} stroke={OBRYS} strokeWidth="1" />
      )}
      {postavaId === 'onyx' && (
        <path d="M96 40 L104 128 L96 132 L86 44 Z" fill={p.akcent} stroke="#1e1b4b" strokeWidth="1.5" />
      )}
    </svg>
  )
}
