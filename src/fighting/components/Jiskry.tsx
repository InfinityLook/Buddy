import React from 'react'

/** Šest pevných úhlů pro jiskry z jednoho zásahu — viz komentář na
 *  komponentě níž. */
const UHLY_JISKER = [0, 60, 120, 180, 240, 300]

// ==========================================
// Jiskry při zásahu — sdílené mezi SoubojArena2D.tsx a
// SoubojArena3D.tsx (obě rendrují stejný "zasazen" stav ze stejného
// místa v Bojiste.tsx), aby markup i konstanta úhlů žily na jednom
// místě, ne duplicitně ve dvou arénách. Šest pevných úhlů, ne
// trigonometrie v CSS — širší podpora prohlížečů, žádný výpočet navíc.
// ==========================================

export const Jiskry: React.FC = () => (
  <div className="souboj-impact" aria-hidden="true">
    {UHLY_JISKER.map((uhel) => (
      <span key={uhel} className="souboj-impact-jiskra" style={{ '--uhel': `${uhel}deg` } as React.CSSProperties} />
    ))}
  </div>
)
