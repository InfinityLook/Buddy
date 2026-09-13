import React from 'react'
import { useFullscreen } from '@/core/hooks/useFullscreen'
import './FullscreenToggle.css'

// ==========================================
// Globální přepínač celoobrazovkového režimu (viz core/hooks/
// useFullscreen.ts) — vykreslený jednou z App.tsx vedle
// NetworkStatusBanneru, stejným "jedna komponenta, viditelná na
// každé routě bez ohledu na přihlášení" vzorem, ne řešení schované
// v jedné appce. Zapíná fullscreen nad celou stránkou (document.
// documentElement), ne nad jednou miniaplikací.
//
// Vykreslený jako malý "štítek" zapuštěný přímo do pravého horního
// rohu obrazovky (position: fixed, top/right: 0), ne jako další kruh
// v řadě s hlavičkovými ikonami appky (zvonek/avatar apod.) — ty
// vždycky sedí uvnitř odsazeného kontejneru stránky (.app-container/
// .hub-container/…), takže roh viditelné plochy samotné zůstává
// volný na každé obrazovce v appce.
//
// Když prohlížeč Fullscreen API vůbec nepodporuje (iOS Safari), appka
// tlačítko rovnou nevykreslí — žádná falešná náhrada, stejná
// disciplína jako u BarcodeDetector/MediaRecorder/Vibration API.
// ==========================================

export const FullscreenToggle: React.FC = () => {
  const { podporovano, jeFullscreen, prepnout } = useFullscreen()

  if (!podporovano) return null

  const popisek = jeFullscreen ? 'Ukončit celou obrazovku' : 'Celá obrazovka'

  return (
    <button
      type="button"
      className="fullscreen-toggle-btn"
      onClick={() => void prepnout()}
      aria-label={popisek}
      title={popisek}
    >
      {jeFullscreen ? (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3v3a2 2 0 0 1-2 2H4" />
          <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
          <path d="M3 16h3a2 2 0 0 1 2 2v3" />
          <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3" />
          <path d="M16 3h3a2 2 0 0 1 2 2v3" />
          <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
          <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      )}
    </button>
  )
}
