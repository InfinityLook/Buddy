import { useRef, useState } from 'react'
import { useAdventureStore } from '../adventure'
import { vytvorZalohu, obnovZalohu, overZalohu } from '../saveBackup'
export function GameSettings({inVillage,onRest,onExit}:{inVillage:boolean;onRest:()=>void;onExit:()=>void}) {
  const a=useAdventureStore(),file=useRef<HTMLInputElement>(null)
  const [message,setMessage]=useState(''),[pending,setPending]=useState<unknown>(null)
  const download=()=>{
    try {const backup=vytvorZalohu(localStorage),url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='BuddyWorld-ulozeny-postup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);setMessage('Záloha stažena. Obsahuje postavu, osadu, příběh i Buddyho.')} catch {setMessage('Stažení zálohy se nepodařilo.')}
  }
  return <section className="bw-settings"><div className="bw-eyebrow">PODLE TVÉHO TEMPA</div><h2>Nastavení a uložený postup</h2>
    <label>Obtížnost<select value={a.difficulty} onChange={e=>a.preferences({difficulty:e.target.value as typeof a.difficulty})}><option value="normalni">Dobrodruh · standardní souboje</option><option value="pribehova">Příběh · slabší útoky nepřátel</option></select></label>
    <p className="bw-muted">Obtížnost mění skutečné poškození hráče u běžných nepřátel a velkých bossů. Příběh a odměny zůstávají stejné.</p>
    <label className="bw-toggle"><span>Zvukové efekty</span><input type="checkbox" checked={a.sound} onChange={e=>a.preferences({sound:e.target.checked})}/></label>
    <label className="bw-toggle"><span>Větší text</span><input type="checkbox" checked={a.largeText} onChange={e=>a.preferences({largeText:e.target.checked})}/></label>
    <label className="bw-toggle"><span>Omezit pohyb prostředí</span><input type="checkbox" checked={a.reducedMotion} onChange={e=>a.preferences({reducedMotion:e.target.checked})}/></label>
    <h3>Odpočinek a záloha</h3><p>Postup se ukládá automaticky do tohoto prohlížeče. Poloha a životy každých 5 sekund a při odchodu. Ve vesnici se můžeš uzdravit.</p>
    <div className="bw-button-row"><button disabled={!inVillage} onClick={()=>{onRest();setMessage('Odpočinek připraven. Po zavření panelu se uzdravíš a uložíš.')}}>Odpočinout a uložit</button><button onClick={download}>Stáhnout zálohu</button><button onClick={()=>file.current?.click()}>Načíst zálohu</button></div>
    {!inVillage&&<small>Odpočinek je dostupný uvnitř vesnice.</small>}
    <input ref={file} hidden type="file" accept="application/json,.json" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>2_000_000){setMessage('Záloha je příliš velká.');return}try{const data:unknown=JSON.parse(await f.text());if(!overZalohu(data))throw Error();setPending(data);setMessage('Záloha je připravená k načtení.')}catch{setMessage('Tento soubor není platná záloha Buddy Worldu.')}e.target.value=''}}/>
    {pending!==null&&<div className="bw-import-confirm"><p>Načtení nahradí současný postup. Nejdříve si můžeš stáhnout jeho zálohu.</p><button onClick={()=>{if(obnovZalohu(pending,localStorage))location.reload();else setMessage('Obnova se nezdařila. Ponech si soubor zálohy pro další pokus.')}}>Nahradit postup a načíst</button><button onClick={()=>setPending(null)}>Zrušit</button></div>}
    <h3>Ovládání</h3><p><kbd>WASD</kbd> nebo šipky: pohyb · tažení myší / prstem: kamera · <kbd>Mezerník</kbd>: útok · <kbd>Shift</kbd>: obrana / úhyb · <kbd>Q</kbd>: Buddy · <kbd>E</kbd>: sběr / interakce · <kbd>Esc</kbd>: pauza.</p><p>Na telefonu používej joystick a tlačítka vpravo. Hra podporuje hraní na šířku.</p>
    <button onClick={()=>document.documentElement.requestFullscreen?.().catch(()=>setMessage('Prohlížeč nepovolil celou obrazovku.'))}>Celá obrazovka</button>
    <button className="bw-secondary" onClick={onExit}>Uložit a zpět k výběru Buddyho</button><p role="status">{message}</p>
  </section>
}
