import { CAMPAIGN, CHAPTERS, currentMission, useAdventureStore, type CampaignProgress } from '../adventure'
import { useBuddyWorldStore } from '../useBuddyWorldStore'

export function CampaignPanel({progress,inVillage,onNavigate}:{progress:CampaignProgress;inVillage:boolean;onNavigate:(id:string)=>void}) {
  const adventure=useAdventureStore()
  const mission=currentMission(adventure.campaign)
  return <section className="bw-campaign">
    <div className="bw-eyebrow">SEASON 1 · OZVĚNY ÚDOLÍ</div>
    <h2>{mission ? CHAPTERS[mission.chapter-1] : 'Údolí je opět vaším domovem.'}</h2>
    <div className="bw-progress-label"><span>Příběh</span><strong>{adventure.campaign.length} / {CAMPAIGN.length}</strong></div>
    <progress aria-label="Postup kampaně" value={adventure.campaign.length} max={CAMPAIGN.length}/>
    {mission ? <article className="bw-mission-card">
      <small>KAPITOLA {mission.chapter} · {mission.speaker}</small><h3>{mission.name}</h3>
      <p className="bw-story-copy">{mission.story}</p><p className="bw-goal"><strong>Tvůj úkol</strong><br/>{mission.goal}</p>
      <p className="bw-reward">+{mission.xp} XP · +{mission.coins} mincí</p>
      <div className="bw-button-row">
        <button className="bw-primary" disabled={!mission.done(progress)||(mission.id==='usvit'&&!inVillage)} onClick={()=>adventure.claim(mission.id,progress,inVillage)}>{mission.done(progress)?mission.id==='usvit'?'Uzavřít příběh':'Dokončit úkol':'Ještě na tom pracujeme'}</button>
        <button onClick={()=>onNavigate(mission.target)}>Ukázat cestu ↗</button>
      </div>
      {mission.id==='usvit'&&!inVillage&&<small>Pro závěrečný rozhovor se vrať do vesnice.</small>}
    </article> : <article className="bw-mission-card bw-ending">
      <div className="bw-ending-sun">✺</div><h3>Nový úsvit</h3>
      <p>Zvony znovu znějí údolím. Mira rozsvěcí poslední lucernu, Kael otevírá bránu a Elara pokládá na most první květinu. Buddy stojí vedle tebe.</p>
      <p>„Tentokrát jsme světlo neukryli do kamenů,“ říká Elara. „Dali jsme ho jeden druhému.“</p>
      <p className="bw-reward">Díky, že jste našli cestu domů.</p><p>Příběh Season 1 je dokončený. Svět zůstává otevřený pro stavění, průzkum a další chvíle s Buddym.</p>
    </article>}
    <details className="bw-chapter-list"><summary>Všechny kapitoly a splněné úkoly</summary>
      {CHAPTERS.map((name,i)=><section key={name}><h3>{i+1}. {name}</h3>{CAMPAIGN.filter(m=>m.chapter===i+1).map(m=><p key={m.id} className={m.id===mission?.id?'is-current':''}>{adventure.campaign.includes(m.id)?'✓':m.id===mission?.id?'→':'○'} {m.name}</p>)}</section>)}
    </details>
  </section>
}

export function Achievements({progress}:{progress:CampaignProgress}) {
  const a=useAdventureStore(),level=useBuddyWorldStore(s=>s.level)
  const badges=[
    ['První přátelství','Postarej se o Buddyho.',progress.care>=1,'♡'],
    ['Ruce stavitele','Umísti první vlastní objekt.',progress.placed>=1,'⌂'],
    ['Světlo mýtiny','Poraz Krystalového strážce.',progress.crystalBoss,'✦'],
    ['Paměť lesa','Objev všechny lesní krystaly.',progress.forestDiscoveries>=3,'♧'],
    ['Dědic strážců','Poraz Hlídače ruin.',progress.ruinsBoss,'◇'],
    ['Dobrý soused','Dokonči dva vedlejší úkoly.',progress.sideQuests>=2,'☷'],
    ['Tři pečetě','Aktivuj všechny relikvie.',progress.relics>=3,'△'],
    ['Strážce údolí','Poraz chrámového bosse.',progress.templeBoss,'⚔'],
    ['Krystalová paměť','Vyhraj paměťovou minihru.',a.puzzleWins>=1,'▦'],
    ['Nové město','Rozšiř osadu na úroveň 5.',progress.uroven>=5,'♜'],
    ['Dobrodruh','Dosáhni úrovně 20.',level>=20,'★'],
    ['Nový úsvit','Dokonči celý příběh.',a.campaign.length===CAMPAIGN.length,'☀'],
  ] as const
  return <section><div className="bw-eyebrow">TVÉ SPOLEČNÉ VZPOMÍNKY</div><h2>Úspěchy <span className="bw-muted">{badges.filter(b=>b[2]).length}/{badges.length}</span></h2><div className="bw-badges">{badges.map(([name,desc,done,icon])=><article key={name} className={done?'is-earned':''}><span>{icon}</span><div><strong>{name} {done?'✓':''}</strong><p>{desc}</p></div></article>)}</div></section>
}
