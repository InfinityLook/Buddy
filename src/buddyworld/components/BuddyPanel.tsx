import { assetUrl } from '../assetUrl'
import { useEffect, useRef, useState } from 'react'
import { careAt, memoryDeck, useAdventureStore } from '../adventure'
import type { MaskotDef } from '../types'
const symbols=['✦','☾','❖','❀','☀','♧']
export function BuddyPanel({maskot}:{maskot:MaskotDef}) {
  const a=useAdventureStore()
  const [now,setNow]=useState(Date.now),[notice,setNotice]=useState('')
  const [deck,setDeck]=useState(memoryDeck),[open,setOpen]=useState<number[]>([]),[matched,setMatched]=useState<number[]>([])
  const [turns,setTurns]=useState(0),[won,setWon]=useState(false)
  const lock=useRef(false)
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null)
  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>{clearInterval(t);if(timer.current)clearTimeout(timer.current)}},[])
  const flip=(index:number)=>{
    if(lock.current||won||open.includes(index)||matched.includes(index))return
    const next=[...open,index];setOpen(next)
    if(next.length!==2)return
    setTurns(t=>t+1);lock.current=true
    if(deck[next[0]]===deck[next[1]]) {
      const found=[...matched,...next];setMatched(found)
      timer.current=setTimeout(()=>{setOpen([]);lock.current=false},250)
      if(found.length===12){setWon(true);const rewarded=a.puzzleReward();setNotice(rewarded?'Všechny krystaly patří k sobě! Získáváš 12 mincí.':'Vítězství! Další mince můžeš získat po minutové přestávce.')}
    } else timer.current=setTimeout(()=>{setOpen([]);lock.current=false},750)
  }
  return <section className="bw-buddy-panel">
    <div className="bw-eyebrow">SPOLU V TOMHLE SVĚTĚ</div><h2>{maskot.jmeno}, tvůj společník</h2>
    <div className="bw-care-card"><img src={assetUrl(`/buddyworld/koncept/mascots/${maskot.id}.svg`)} alt={maskot.jmeno}/><div><strong>{careAt(a.care,a.careAt,now)>=75?'Dnes se cítí skvěle.':'Chvíle spolu udělá radost.'}</strong><p>{maskot.popis}</p><label>Spokojenost · {Math.round(careAt(a.care,a.careAt,now))}%<progress max="100" value={careAt(a.care,a.careAt,now)}/></label></div></div>
    <div className="bw-button-row"><button disabled={now-a.lastCare<5000} onClick={()=>{a.careForBuddy(false);setNotice(`${maskot.jmeno} se spokojeně přitulil.`)}}>♡ Pohladit</button><button disabled={a.food<1||now-a.lastCare<5000} onClick={()=>{a.careForBuddy(true);setNotice('Miska je prázdná a Buddy spokojený.')}}>Nakrmit · {a.food} porcí</button><button disabled={a.coins<5} onClick={()=>{if(a.buyFood())setNotice('Jedna porce přidána.')}}>Koupit jídlo · 5 mincí</button></div>
    <p className="bw-muted">Buddy na tebe počká. Spokojenost při odchodu klesá jen mírně a nikdy nebrání hraní.</p>
    <div className="bw-section-heading"><div><div className="bw-eyebrow">MALÁ PAUZA, VELKÁ PAMĚŤ</div><h3>Krystalová paměť</h3></div><span>{matched.length/2}/6 párů · {turns} tahů</span></div>
    <p>Otoč dva krystaly a najdi shodné dvojice. Za vítězství získáš 12 mincí, nejvýše jednou za minutu.</p>
    <div className="bw-memory" role="group" aria-label="Krystalová paměť">
      {deck.map((value,i)=>{const shown=open.includes(i)||matched.includes(i);return <button key={i} className={matched.includes(i)?'is-matched':shown?'is-open':''} disabled={matched.includes(i)||won} aria-label={`Karta ${i+1}${shown?`, ${symbols[value]}`:', skrytá'}`} onClick={()=>flip(i)}>{shown?symbols[value]:'◇'}</button>})}
    </div>
    <button className="bw-secondary" onClick={()=>{if(timer.current)clearTimeout(timer.current);lock.current=false;setDeck(memoryDeck());setMatched([]);setOpen([]);setTurns(0);setWon(false)}}>{won?'Hrát znovu':'Nové zamíchání'}</button>
    <p role="status" className="bw-notice">{notice}</p>
  </section>
}
