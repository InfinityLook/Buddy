import React from 'react'
import { useNavigate } from 'react-router-dom'

interface Props {
  text: string
}

// Appka rozdělí text popisku na obyčejné kusy a #hashtagy a hashtagy
// vykreslí jako klikatelné — appka přitom žádné druhé hledání
// nevymýšlí, jen odemkne existující "#" hledání z VyhledavacPanel.tsx
// přímo z textu popisku (navigace nese hashtag v ?hashtag=, jednorázově
// přečtený v SocialModule.tsx stejně jako u sdíleného ?kod=).
//
// Jedna sdílená komponenta pro oba vstupní body (FeedPrispevek.tsx i
// PrispevekProhlizec.tsx) — appka nevykresluje hashtagy dvakrát, různě
// napsané. Vykresluje se jako <span>, ne <p> — appka ho tak může vložit
// i doprostřed cizího <p>, co má kolem popisku ještě tlačítko úpravy
// a "(upraveno)" (PrispevekProhlizec.tsx), ne jen jako samostatný odstavec
// (FeedPrispevek.tsx). \p{L}/\p{N} (unicode třídy), ne [a-zA-Z0-9] —
// appka píše česky, diakritika v hashtagu (#škola) musí fungovat stejně
// jako ASCII.
const HASHTAG_RE = /#[\p{L}\p{N}_]+/gu

export const HashtagovyText: React.FC<Props> = ({ text }) => {
  const navigate = useNavigate()

  if (!text.includes('#')) return <>{text}</>

  const casti = text.split(HASHTAG_RE)
  const hashtagy = text.match(HASHTAG_RE) ?? []

  return (
    <>
      {casti.map((kus, i) => (
        <React.Fragment key={i}>
          {kus}
          {hashtagy[i] && (
            <button
              type="button"
              className="social-hashtag"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/social?zalozka=vyhledavac&hashtag=${encodeURIComponent(hashtagy[i])}`)
              }}
            >
              {hashtagy[i]}
            </button>
          )}
        </React.Fragment>
      ))}
    </>
  )
}
