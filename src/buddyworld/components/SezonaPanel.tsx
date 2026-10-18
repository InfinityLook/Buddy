import {useState} from 'react'
import {stavPlaytestu} from '../playtestChecklist'
import {statistikaSouboje} from '../combatAnalytics'
import {KODEX, najdiVKodexu} from '../worldCodex'
import {vyhodnotMilniky, procentaMilniku, type Pokrok} from '../milestones'
import {vyzvaProDatum} from '../dailyChallenges'
import {KROKY_SEZONY} from '../seasonRoadmap'
import {nactiPredvolby,ulozPredvolby,type Predvolby} from '../accessibility'
import {vytvorZalohu,obnovZalohu,overZalohu} from '../saveBackup'
import {upravPoskozeni,type Obtiznost} from '../combatBalancing'
import {pridejZaznam,souhrnBoje,type ZaznamBoje} from '../combatJournal'
import {dalsiNapoveda} from '../questHints'
import {novyTrenink,zaznamenejTrenink,uspesnostTreninku} from '../combatPractice'
import {OBJEVY} from '../explorationChecklist'
import {cilProCas} from '../sessionGoals'
import {chybejiciSuroviny} from '../resourcePlanner'
import {popisSignalu} from '../combatTelegraph'
import {proverUloziste} from '../saveHealth'
import {shrnutiPostupu} from '../progressSummary'
import {vyhodnotDiagnostiku,diagnostikaOK} from '../releaseDiagnostics'

/** v20: player-facing, non-blocking companion panel. No automatic reward claims. */
export function SezonaPanel({pokrok}:{pokrok:Pokrok}) {
 const [dotaz,setDotaz]=useState('')
 const [predvolby,setPredvolby]=useState<Predvolby>(()=>nactiPredvolby(localStorage))
 const [zprava,setZprava]=useState('')
 const [obtiznost,setObtiznost]=useState<Obtiznost>('normalni')
 const [log,setLog]=useState<ZaznamBoje[]>([])
 const [zalohaText,setZalohaText]=useState('')
 const [trenink,setTrenink]=useState(novyTrenink)
 const [casHry,setCasHry]=useState(15)
 const [testUloziste,setTestUloziste]=useState('')
 const milniky=vyhodnotMilniky(pokrok)
 const dnes=new Date().toISOString().slice(0,10)
 const zmenPredvolby=(k:keyof Predvolby)=>{
  const dalsi={...predvolby,[k]:!predvolby[k]}
  if(ulozPredvolby(dalsi,localStorage)){setPredvolby(dalsi);setZprava('Nastavení uloženo.')}else setZprava('Nastavení se nepodařilo uložit.')
 }
 const exportuj=()=>{
  try {setZalohaText(JSON.stringify(vytvorZalohu(localStorage),null,2));setZprava('Záloha připravena. Zkopíruj ji na bezpečné místo.')}catch{setZprava('Zálohu se nepodařilo vytvořit.')}
 }
 const importuj=()=>{
  try {const data=JSON.parse(zalohaText);if(!overZalohu(data)){setZprava('Neplatný formát zálohy.');return}
   setZprava(obnovZalohu(data,localStorage)?'Záloha obnovena. Pro načtení změn restartuj hru.':'Obnova se nezdařila.')
  }catch{setZprava('Neplatný JSON.')} }
 return <details className="bw-lesni-objevy" aria-label="Průvodce sezónou">
  <summary>📜 Průvodce Season 1 · {procentaMilniku(pokrok)} % milníků</summary>
  <section aria-label="Milníky"><h3>Milníky</h3>{milniky.map(m=><p key={m.id}>{m.splneno?'✓':'◇'} {m.nazev}</p>)}</section>
  <section aria-label="Příběhová cesta"><h3>Příběhová cesta</h3>{KROKY_SEZONY.map((k,i)=><p key={k.id}>{i+1}. {k.nazev} — {k.podminka}</p>)}</section>
  <section aria-label="Denní inspirace"><h3>Dnešní výzva</h3><p>{vyzvaProDatum(dnes).nazev}: {vyzvaProDatum(dnes).popis}</p><small>Inspirace bez automatické odměny.</small></section>
  <section aria-label="Kodex"><h3>Kodex světa ({KODEX.length})</h3><label>Hledat v kodexu <input value={dotaz} onChange={e=>setDotaz(e.target.value)} /></label>{najdiVKodexu(dotaz).map(x=><p key={x.id}><strong>{x.nazev}</strong>: {x.popis}</p>)}</section>
  <section aria-label="Přístupnost"><h3>Přístupnost</h3>{([['omezitPohyb','Omezit pohyb'],['velkyText','Větší text'],['zobrazitNapovedu','Zobrazit nápovědu']] as const).map(([k,t])=><label key={k} style={{display:'block'}}><input type="checkbox" checked={predvolby[k]} onChange={()=>zmenPredvolby(k)}/>{t}</label>)}{predvolby.zobrazitNapovedu&&<p>Tyto předvolby se ukládají. Zobrazení panelu podporuje větší text a omezení přechodů.</p>}</section>
  <section aria-label="Nastavení souboje"><h3>Tréninková kalkulačka</h3><label>Obtížnost ukázky <select value={obtiznost} onChange={e=>setObtiznost(e.target.value as Obtiznost)}><option value="pribeh">Příběh</option><option value="normalni">Normální</option><option value="vyzva">Výzva</option></select></label><p>Ukázka zásahu 10 → {upravPoskozeni(10,obtiznost)}. Nastavení nemění živé souboje.</p><button type="button" onClick={()=>setLog(l=>pridejZaznam(l,'utok',Date.now()))}>Zaznamenat tréninkový útok</button><p>Tréninkové útoky: {souhrnBoje(log).utoky}</p></section>
  <section aria-label="Další kroky"><h3>Co dělat dál</h3><p>{dalsiNapoveda(pokrok)}</p><p>{shrnutiPostupu(pokrok)}</p><h4>Průzkumný seznam (návod, nikoli uložené splnění)</h4>{OBJEVY.map(x=><p key={x.id}>◇ {x.nazev}</p>)}</section>
  <section aria-label="Trénink reakcí"><h3>Trénink reakcí (bez herních odměn)</h3><p>{popisSignalu('kruh')} {popisSignalu('rychly')}</p><button type="button" onClick={()=>setTrenink(t=>zaznamenejTrenink(t,'uhyb'))}>Zaznamenat úhyb</button><button type="button" onClick={()=>setTrenink(t=>zaznamenejTrenink(t,'chyba'))}>Zaznamenat chybu</button><p>Úspěšnost: {uspesnostTreninku(trenink)} %</p></section>
  <section aria-label="Plánování"><h3>Plán výpravy</h3><label>Minuty na hraní <input type="number" min="5" max="120" value={casHry} onChange={e=>setCasHry(Math.max(5,Math.min(120,Number(e.target.value)||5)))}/></label><p>{cilProCas(casHry).text}</p><small>Ukázkový plán surovin: {JSON.stringify(chybejiciSuroviny({drevo:2,kamen:1,krystaly:0},{drevo:5,kamen:3,krystaly:1}))}. Nejde o skutečný inventář.</small></section>
  <section aria-label="Kontrolní seznam testování"><h3>Kontrolní seznam testování</h3><p>Ukázkový průchod: {stavPlaytestu([{id:"pohyb",hotovo:true},{id:"souboj",hotovo:false},{id:"ulozeni",hotovo:false}]).procenta} % kontrol označeno. Nejde o skutečný výsledek testování.</p><p>Ukázková statistika souboje: {statistikaSouboje(["utok","zasah"]).uspesnost} %.</p></section>
  <section aria-label="Diagnostika"><h3>Diagnostika úložiště</h3><button type="button" onClick={()=>{const vysledek=proverUloziste(localStorage);const kontrola=vyhodnotDiagnostiku([{nazev:'Zápis úložiště',ok:vysledek.zapis}]);setTestUloziste(`${vysledek.zprava} · ${diagnostikaOK(kontrola)?'Kontrola OK':'Kontrola selhala'}`)}}>Otestovat ukládání</button><p role="status">{testUloziste}</p></section>
  <section aria-label="Záloha"><h3>Záloha uloženého postupu</h3><button type="button" onClick={exportuj}>Připravit export</button><label style={{display:'block'}}>JSON zálohy<textarea rows={4} value={zalohaText} onChange={e=>setZalohaText(e.target.value)} /></label><button type="button" onClick={importuj}>Obnovit z JSON</button><small>Obnova přepíše stejnojmenné Buddy World klíče. Před importem si vytvoř vlastní zálohu.</small></section>
  <p role="status">{zprava}</p>
  <style>{`details[aria-label="Průvodce sezónou"] {font-size:${predvolby.velkyText?'1.15rem':'inherit'}} details[aria-label="Průvodce sezónou"] * {transition-duration:${predvolby.omezitPohyb?'0ms':'initial'} !important}`}</style>
 </details>
}
