import { assetUrl } from '../assetUrl'
import type { CSSProperties } from 'react'
import { MASKOTI } from '../data/maskoti'
import { useBuddyWorldStore } from '../useBuddyWorldStore'
import { CAMPAIGN, useAdventureStore } from '../adventure'
interface Props {aktivniMaskotId:string;odemceneMaskoty:string[];onVybrat:(id:string)=>void;onPokracovat:()=>void;onZpet:()=>void}
export function VyberMaskota({aktivniMaskotId,onVybrat,onPokracovat}:Props) {
 const level=useBuddyWorldStore(s=>s.level),a=useAdventureStore()
 return <main className="bw-title-screen">
  <header className="bw-title-nav"><span className="bw-wordmark">✦ BUDDY WORLD</span><span className="bw-title-version">SEASON 1 <i/> OZVĚNY ÚDOLÍ</span></header>
  <section className="bw-title-copy"><div className="bw-eyebrow">MALÝ SPOLEČNÍK. VELKÉ DOBRODRUŽSTVÍ.</div><h1>Každý svět potřebuje<br/><em>svého Buddyho.</em></h1><p>Vydej se do kouzelného údolí. Obnov svůj domov, odhal příběh strážců a najdi přítele na celou cestu.</p></section>
  <div className="bw-mascot-heading"><strong>Koho vezmeš s sebou?</strong><span>Čtyři povahy. Čtyři skutečné schopnosti.</span></div>
  <div className="bw-mascot-grid">{MASKOTI.map(m=><button type="button" key={m.id} onClick={()=>onVybrat(m.id)} aria-pressed={aktivniMaskotId===m.id} className={`bw-companion ${aktivniMaskotId===m.id?'is-selected':''}`} style={{'--companion':m.barvaJadro} as CSSProperties}><span className="bw-companion-number">0{MASKOTI.indexOf(m)+1}<b>{aktivniMaskotId===m.id?'✓':'↗'}</b></span><img src={assetUrl(`/buddyworld/koncept/mascots/${m.id}.svg`)} alt=""/><div className="bw-companion-name"><strong>{m.jmeno}</strong><span>{m.element}</span></div><p>{m.id==='ember'?'Ohnivý úder a hoření':m.id==='moss'?'Léčivý dotek přírody':m.id==='nyx'?'Silný magický výboj':'Ledový úder a zpomalení'}</p></button>)}</div>
  <footer className="bw-title-footer"><div><strong>{a.campaign.length?`Tvá výprava · úroveň ${level}`:'Nový příběh čeká na tebe.'}</strong><span>{a.campaign.length?`${a.campaign.length}/${CAMPAIGN.length} příběhových úkolů splněno`:'3D průzkum · budování města · souboje v reálném čase'}</span></div><button className="bw-primary" onClick={onPokracovat}>{a.seenIntro?'Pokračovat ve výpravě':'Začít dobrodružství'} <span>→</span></button></footer>
 </main>
}
