import React, { lazy, Suspense } from 'react'
import type { Buddy3DOverlayProps } from '../buddy3d/Buddy3DOverlay'

// ==========================================
// Hubova "AI" paprsek dřív otevíral tenhle plochý 2D chat panel —
// appka ho teď nahradila skutečnou 3D postavičkou Buddyho (balíček
// "Buddy 3D — 5 motivů", viz src/buddy3d/). Import v Hub.tsx zůstal
// úplně stejný (`import { BuddyOverlay } from '@/buddy/BuddyOverlay'`),
// jen se za ním schovává jiná implementace — Hub.tsx nepotřeboval
// žádnou změnu kromě toho, jaké props mu teď podává (viz jeho vlastní
// komentář u themeId/baseUrl).
//
// Three.js/GLTFLoader/scéna (src/buddy3d/Buddy3DOverlay.tsx) se tu
// načítá přes React.lazy, ne jako obyčejný import — appka tím drží
// tu samou "zaplať jen ten, kdo doopravdy otevře AI" disciplínu, co
// má třeba Social's ambientní scéna (useAmbientScene.ts) nebo
// jakákoliv appčina 3D hra: Three.js (desítky kB gzip) se stáhne až
// v okamžiku kliknutí na AI, ne při každém prvním vykreslení Hubu.
// ==========================================

const Buddy3DOverlay = lazy(() => import('../buddy3d/Buddy3DOverlay'))

const Nacitani: React.FC<Pick<Buddy3DOverlayProps, 'voice' | 'onZavrit'>> = ({ voice, onZavrit }) => (
  <div
    role="status"
    style={{
      position: 'fixed',
      zIndex: 1800,
      bottom: 80,
      right: 16,
      padding: 15,
      borderRadius: 12,
      background: '#142033',
      color: '#fff',
    }}
  >
    Buddy přichází…{' '}
    <button
      onClick={() => {
        voice.zastavit()
        onZavrit()
      }}
    >
      Zavřít
    </button>
  </div>
)

export const BuddyOverlay: React.FC<Buddy3DOverlayProps> = (props) => (
  <Suspense fallback={<Nacitani voice={props.voice} onZavrit={props.onZavrit} />}>
    <Buddy3DOverlay {...props} />
  </Suspense>
)
