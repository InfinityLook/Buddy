import React, { useState } from 'react'
import { SocialIcon } from './SocialIcon'
import { BlokovaniPanel } from './BlokovaniPanel'
import { ModeracePanel } from './ModeracePanel'
import type { SocialStav } from '../useSocial'

type Sekce = 'blokovani' | 'hlaseni'

interface Props {
  stav: SocialStav
}

const POLOZKY: { id: Sekce; popis: string; ikona: string }[] = [
  { id: 'blokovani', popis: 'Blokovaní', ikona: 'block' },
  { id: 'hlaseni', popis: 'Hlášení', ikona: 'flag' },
]

// ==========================================
// Menu Blokovaní/Hlášení — stejný vzor jako AdminModule.tsx: menu
// řádků, klepnutí otevře sekci na celou obrazovku s vlastním tlačítkem
// zpět, ne rovnou vykreslený obsah všech sekcí najednou.
//
// Dřív žilo jako Social's vlastní čtvrtá záložka "Nastavení" ve
// SocialModule.tsx; teď je jediný volající appčino skutečné /nastaveni
// (SettingsModule.tsx, přes lazy SocialniNastaveniSekce.tsx — viz jeho
// komentář, proč lazy) — appka tak má jen jedno "Nastavení", ne dvě
// různá pod stejným jménem. Komponenta sama se stěhováním nezměnila,
// jen kdo ji volá.
//
// Tajný chat tu dřív byl taky (přesunut sem z bývalé páté podmíněné
// položky spodní navigace), ale založit/otevřít ho je akce, ne
// nastavení — přestěhoval se pod "+ Nový" v ChatyPanel.tsx, vedle
// Chatu a Skupiny, kam patří logičtěji.
// ==========================================

export const NastaveniPanel: React.FC<Props> = ({ stav }) => {
  const [sekce, setSekce] = useState<Sekce | null>(null)

  if (sekce) {
    return (
      <div className="social-panel">
        <button className="social-back-btn" onClick={() => setSekce(null)}>
          ← Zpět do nastavení
        </button>
        {sekce === 'blokovani' && <BlokovaniPanel stav={stav} />}
        {sekce === 'hlaseni' && <ModeracePanel stav={stav} />}
      </div>
    )
  }

  return (
    <div className="social-panel">
      <section className="social-card">
        {POLOZKY.map((p) => (
          <button key={p.id} className="social-nastaveni-radek" onClick={() => setSekce(p.id)}>
            <SocialIcon name={p.ikona} size={18} />
            <span className="social-nastaveni-popis">{p.popis}</span>
            <SocialIcon name="arrow-left" size={15} className="social-nastaveni-sipka" />
          </button>
        ))}
      </section>
    </div>
  )
}
