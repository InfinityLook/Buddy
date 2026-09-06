import React from 'react'

/** Šest pevných úhlů pro jiskry z jednoho zásahu — viz komentář na
 *  komponentě níž. */
const UHLY_JISKER = [0, 60, 120, 180, 240, 300]

interface Props {
  /** Desáté kolo vylepšení — barva jisker podle ÚTOČNÍKOVY postavy
   *  (viz PostavaGrafika.tsx's barvaAkcentuPostavy), ne jedna
   *  univerzální bílá. Chybí-li (starší volání), padne appka na
   *  stejnou bílou, jakou CSS mělo napevno předtím. */
  barva?: string
}

// ==========================================
// Jiskry při zásahu — sdílené mezi SoubojArena2D.tsx a
// SoubojArena3D.tsx (obě rendrují stejný "zasazen" stav ze stejného
// místa v Bojiste.tsx), aby markup i konstanta úhlů žily na jednom
// místě, ne duplicitně ve dvou arénách. Šest pevných úhlů, ne
// trigonometrie v CSS — širší podpora prohlížečů, žádný výpočet navíc.
// ==========================================

export const Jiskry: React.FC<Props> = ({ barva }) => (
  <div className="souboj-impact" aria-hidden="true">
    {UHLY_JISKER.map((uhel) => (
      <span
        key={uhel}
        className="souboj-impact-jiskra"
        style={{ '--uhel': `${uhel}deg`, ...(barva ? { '--barva': barva } : {}) } as React.CSSProperties}
      />
    ))}
  </div>
)
