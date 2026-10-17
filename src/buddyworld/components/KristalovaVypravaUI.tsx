import React, { useState } from 'react'
import {
  type KristalovaVyprava, type VypravaAkce,
  popisVypravy, VYPRAVA_ODMENA,
} from '../kristalovaVyprava'
import { dialogElary } from '../kristalovaDialogy'

export interface KristalovaVypravaUIProps {
  stav: KristalovaVyprava
  region: string
  /** Dispatch into the existing quest state machine; rewards must be granted by the host only once. */
  onAkce: (akce: VypravaAkce) => void
}

export const KristalovaVypravaUI: React.FC<KristalovaVypravaUIProps> = ({ stav, region, onAkce }) => {
  const [denik, setDenik] = useState(false)
  const [dialog, setDialog] = useState(false)
  const elara = dialogElary(stav, region)
  return <div className="bw-kv-ui">
    <div className="bw-kv-actions">
      <button type="button" aria-expanded={denik} onClick={() => setDenik(v => !v)}>📜 Deník</button>
      {region === 'buddy_vesnice' && <button type="button" aria-expanded={dialog} onClick={() => setDialog(v => !v)}>💬 Elara</button>}
    </div>
    {denik && <section className="bw-kv-card" aria-label="Deník výpravy">
      <h3>Ztracené světlo</h3>
      <p>{popisVypravy(stav)}</p>
      <div className="bw-kv-progress" aria-label="Průběh výpravy">
        <span>💎 Úlomky: {stav.ulomky.length}/3</span>
        <span>⚔️ Nepřátelé: {stav.porazeni.length}/2</span>
      </div>
      <p className="bw-kv-reward">Odměna: {VYPRAVA_ODMENA.xp} XP · {VYPRAVA_ODMENA.krystaly} krystaly · {VYPRAVA_ODMENA.drevo} dřeva · {VYPRAVA_ODMENA.kamen} kameny</p>
      <button type="button" onClick={() => setDenik(false)}>Zavřít deník</button>
    </section>}
    {dialog && region === 'buddy_vesnice' && <section className="bw-kv-card" role="dialog" aria-modal="false" aria-label="Rozhovor se starostkou Elarou">
      <h3>{elara.nadpis}</h3>
      <p>{elara.zprava}</p>
      {elara.akce && <button type="button" onClick={() => { onAkce(elara.akce!); setDialog(false) }}>{elara.tlacitko}</button>}
      <button type="button" onClick={() => setDialog(false)}>Zavřít</button>
    </section>}
  </div>
}
