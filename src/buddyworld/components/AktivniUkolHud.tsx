import React from 'react'
import { useVillageStore } from '../useVillageStore'
import { aktivniUkol } from '../questTracker'

/** Kompaktní orientace v příběhu i během hraní na telefonu. */
export const AktivniUkolHud: React.FC = () => {
  const stav = useVillageStore()
  const aktualni = aktivniUkol(stav.splneneUkoly, stav)
  return <section className="bw-quest-tracker" aria-label="Aktuální příběhový úkol" aria-live="polite">
    {aktualni ? <>
      <strong>📜 {aktualni.index}/{aktualni.celkem} · {aktualni.ukol.nazev}</strong>
      <span>{aktualni.ukol.cil}</span>
      <small>{aktualni.pripraveno ? '✓ Splněno – vyzvedni odměnu u NPC nebo v Úkolech' : `Postup: ${aktualni.postup}`}</small>
    </> : <><strong>🌅 Příběh dokončen</strong><span>Pokračuj v průzkumu a rozvoji města.</span></>}
  </section>
}
