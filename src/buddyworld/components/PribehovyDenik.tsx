import { NPC_UDALOSTI } from '../npcUdalosti'
import { VEDLEJSI_UKOLY, lzePrevzitVedlejsiOdmenu } from '../sideQuests'
import React from 'react'
import { UKOLY } from '../quests'
import { scenaUkolu } from '../storyScenes'
import { useVillageStore } from '../useVillageStore'
import { aktivniUkol } from '../questTracker'
import { STAVY_KAPITOL } from '../storyChapters'

/** Deník používá stejný postup jako NPC a HUD; neuděluje odměny podruhé. */
export const PribehovyDenik: React.FC = () => {
  const vesnice = useVillageStore()
  const aktivni = aktivniUkol(vesnice.splneneUkoly, vesnice)
  const splnene = new Set(vesnice.splneneUkoly)
  return <details className="bw-story-journal">
    <summary>📖 Zakázky osady {splnene.size}/{UKOLY.length}</summary>
    <div className="bw-story-journal-content">
      <h3>Season 1 · Kronika údolí</h3>
      <p>Prozkoumávej svět, pomáhej obyvatelům a chraň rostoucí osadu.</p>
      {STAVY_KAPITOL.map(kapitola => <section key={kapitola.id}>
        <h4>{kapitola.nazev}</h4>
        <p>{kapitola.popis}</p>
        <ol start={kapitola.od + 1}>
          {UKOLY.slice(kapitola.od, kapitola.do).map(ukol => {
            const hotovo = splnene.has(ukol.id)
            const aktualni = aktivni?.ukol.id === ukol.id
            const zamceno = !hotovo && !aktualni
            return <li key={ukol.id} className={aktualni ? 'bw-story-current' : ''}>
              <strong>{hotovo ? '✓' : zamceno ? '🔒' : '➤'} {zamceno ? 'Neodhalený úkol' : ukol.nazev}</strong>
              {!zamceno && <><span>{ukol.cil}</span><small>Zadává: {ukol.zadavatel}</small>
                {aktualni && <small>{aktivni.pripraveno ? 'Hotovo – vyzvedni odměnu' : `Postup: ${aktivni.postup}`}</small>}
                <details className="bw-story-scene"><summary>📜 {hotovo ? 'Přečíst příběh' : 'Příběhová scéna'}</summary><p><em>{scenaUkolu(ukol.id).misto}</em></p>{scenaUkolu(ukol.id).pred.map((radek, i) => <p key={i}>{radek}</p>)}{hotovo && <><strong>Po dokončení</strong>{scenaUkolu(ukol.id).po.map((radek, i) => <p key={i}>{radek}</p>)}</>}</details>
                <small>Odměna: {ukol.odmena.drevo} 🪵 · {ukol.odmena.kamen} 🪨 · {ukol.odmena.krystaly} 💎</small>
              </>}
            </li>
          })}
        </ol>
      </section>)}
      <section className="bw-side-quests">
        <h4>🌿 Vedlejší úkoly · {vesnice.splneneVedlejsiUkoly.length}/{VEDLEJSI_UKOLY.length}</h4>
        <p>Výpravy obyvatel. Odměny lze vyzvednout jednou. Pro kapitolu Tváře našeho domova dokonči alespoň dvě.</p>
        {VEDLEJSI_UKOLY.map(ukol => {
          const splneno = vesnice.splneneVedlejsiUkoly.includes(ukol.id)
          const pripravena = lzePrevzitVedlejsiOdmenu(ukol.id, vesnice.splneneVedlejsiUkoly, vesnice)
          return <article className="bw-side-quest" key={ukol.id}>
            <strong>{splneno ? '✓ ' : pripravena ? '🎁 ' : '○ '}{ukol.nazev}</strong>
            <small>{ukol.zadavatel}</small>
            <p>{ukol.popis} {ukol.cil}</p>
            <small>Odměna: {ukol.odmena.drevo} 🪵 · {ukol.odmena.kamen} 🪨 · {ukol.odmena.krystaly} 💎</small>
            <button type="button" disabled={!pripravena} onClick={() => vesnice.prevzitVedlejsiOdmenu(ukol.id)}>
              {splneno ? 'Splněno' : pripravena ? 'Vyzvednout odměnu' : 'Nesplněno'}
            </button>
          </article>
        })}
      </section>
      <section className="bw-npc-chronicle" aria-label="Kronika přátelství">
        <h4>🤝 Kronika přátelství · {vesnice.zaznamenaneNpcUdalosti.length}/3</h4>
        <p>Osobní příběhy získáš po dosažení důvěry 2/2 a rozhovoru s obyvatelem.</p>
        {Object.values(NPC_UDALOSTI).map(udalost => {
          const zapsano = vesnice.zaznamenaneNpcUdalosti.includes(udalost.id)
          return <details key={udalost.id}>
            <summary>{zapsano ? '✓ ' + udalost.nazev : '🔒 Neodhalený osobní příběh'}</summary>
            {zapsano && <><p>{udalost.uvod}</p>{udalost.radky.map((radek, i) => <p key={i}>{radek}</p>)}<p>{udalost.zaver}</p></>}
          </details>
        })}
      </section>
      {!aktivni && <p role="status">✓ Zakázky osady dokončeny. Pokračuj v panelu Příběh.</p>}
    </div>
  </details>
}
