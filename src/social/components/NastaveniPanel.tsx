import React, { useState } from 'react'
import { SocialIcon } from './SocialIcon'
import { BlokovaniPanel } from './BlokovaniPanel'
import { ModeracePanel } from './ModeracePanel'
import { TajnyChatPanel } from './TajnyChatPanel'
import type { SocialStav } from '../useSocial'
import type { TajnyChatStav } from '../useTajnyChat'

type Sekce = 'blokovani' | 'hlaseni' | 'tajne'

interface Props {
  stav: SocialStav
  tajnyStav: TajnyChatStav
  onOtevritTajnyChat: (chatId: string) => void
}

const POLOZKY: { id: Sekce; popis: string; ikona: string; jenSTajnymChatem?: boolean }[] = [
  { id: 'blokovani', popis: 'Blokovaní', ikona: 'block' },
  { id: 'hlaseni', popis: 'Hlášení', ikona: 'flag' },
  { id: 'tajne', popis: 'Tajný chat', ikona: 'lock', jenSTajnymChatem: true },
]

// ==========================================
// Nastavení Social — vlastní menu jen pro tuhle část appky (Blokovaní,
// Hlášení, Tajný chat), ne appkové /nastaveni. Stejný vzor jako
// AdminModule.tsx: menu řádků, klepnutí otevře sekci na celou
// obrazovku s vlastním tlačítkem zpět, ne rovnou vykreslený obsah
// všech sekcí najednou.
//
// Tajný chat sem přibyl z bývalé páté (podmíněné) položky spodní
// navigace — ta teď má pevně čtyři položky pro každého, místo aby se
// VIP/moderátorům/adminům měnil počet ikon pod palcem podle role. Kdo
// oprávnění nemá, řádek v tomhle menu vůbec neuvidí, stejně jako dřív
// neviděl tu pátou záložku.
// ==========================================

export const NastaveniPanel: React.FC<Props> = ({ stav, tajnyStav, onOtevritTajnyChat }) => {
  const [sekce, setSekce] = useState<Sekce | null>(null)

  const polozky = POLOZKY.filter((p) => !p.jenSTajnymChatem || tajnyStav.smim)

  if (sekce) {
    return (
      <div className="social-panel">
        <button className="social-back-btn" onClick={() => setSekce(null)}>
          ← Zpět do nastavení
        </button>
        {sekce === 'blokovani' && <BlokovaniPanel stav={stav} />}
        {sekce === 'hlaseni' && <ModeracePanel stav={stav} />}
        {sekce === 'tajne' && tajnyStav.smim && (
          <TajnyChatPanel tajnyStav={tajnyStav} rekni={stav.rekni} onOtevrit={onOtevritTajnyChat} />
        )}
      </div>
    )
  }

  return (
    <div className="social-panel">
      <section className="social-card">
        {polozky.map((p) => (
          <button key={p.id} className="social-nastaveni-radek" onClick={() => setSekce(p.id)}>
            <SocialIcon name={p.ikona} size={18} />
            <span className="social-nastaveni-popis">{p.popis}</span>
            {p.id === 'tajne' && tajnyStav.cekajiciNaMe > 0 && (
              <span className="social-odznak">{tajnyStav.cekajiciNaMe}</span>
            )}
            <SocialIcon name="arrow-left" size={15} className="social-nastaveni-sipka" />
          </button>
        ))}
      </section>
    </div>
  )
}
