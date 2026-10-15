import React, { useEffect } from 'react'
import { useBuddyWorldScene } from '../scene/useBuddyWorldScene'
import { VirtualniJoystick } from '@/game/components/VirtualniJoystick'
import { HUD } from './HUD'
import { MaskotDef, BuddyWorldHracStav } from '../types'
import { BossDef } from '../data/bossove'

// ==========================================
// Buddy World — "hra" obrazovka appka vytáhla do SAMOSTATNÉ komponenty
// ze stejného důvodu, co appka už jednou vyřešila u Buddyho Trhu
// (useCtyriKralovstviScene.ts/HerniDeska): useBuddyWorldScene() si
// svůj Threejs renderer/scénu/RAF smyčku postaví jen JEDNOU, uvnitř
// useEffectu s pevnou závislostí [maskot, bossDef] — a appčin
// canvas-container div (.bw-arena-canvas) existuje v DOMu jen na téhle
// obrazovce, ne na appčině dřívější obrazovce výběru maskota.
//
// Dřív appka volala useBuddyWorldScene() přímo z BuddyWorldModule.tsx,
// co je namountovaný od prvního appčina vykreslení (appčina obrazovka
// 'vyber') — appčin useEffect se tak spustil JEDNOU, s
// containerRef.current === null (appčin canvas div na 'vyber'
// obrazovce vůbec neexistuje), tiše appku vrátil (`if (!container)
// return`) a appka ho PAK UŽ NIKDY ZNOVU NESPUSTILA: appčin maskot i
// bossDef jsou appkou stabilní reference (maskotPodleId/bossPodleId
// appku vrací přímo appčin objekt z appčina modulového pole, ne nový
// klon), appka proto React effect depsů nikdy "nezmění identitu", i
// když appka obrazovku přepne na 'hra'. Výsledek na reálném appčině
// telefonu: renderer/scéna/RAF smyčka appku nikdy nevznikly, appčin
// canvas zůstal prázdný div a appka viděla jen zamrzlý, appkou
// nehýbající se obraz — appčina chyba appku nikdy neukázala v appčině
// sandboxu, protože appčina dřívější komponentová ověřovací appka
// mountovala appku už přímo na 'hra', ne přes appčin skutečný tok
// (appka mountuje nejdřív na 'vyber', appka přepne teprve po klikutí).
//
// Fix: appka tuhle komponentu namountuje poprvé přesně tehdy, kdy
// appka přepne na 'hra' — appčin canvas div v tu chvíli UŽ existuje
// (React appku připojí ref dřív, než appka spustí efekty téhož
// commitu), takže appčin useBuddyWorldScene() efekt teď poprvé běží
// se skutečným, správně rozměřeným containerem.
// ==========================================

interface Props {
  maskot: MaskotDef
  bossDef: BossDef
  pocatecniHracStav: BuddyWorldHracStav
  onZabitiNepritele: (xpOdmena: number) => void
  onZabitiBosse: (xpOdmena: number) => void
  onPostupZmena: (level: number, xp: number) => void
  onZpet: () => void
}

export const BuddyWorldHra: React.FC<Props> = ({
  maskot,
  bossDef,
  pocatecniHracStav,
  onZabitiNepritele,
  onZabitiBosse,
  onPostupZmena,
  onZpet,
}) => {
  const { containerRef, selhalo, nastavJoystick, utocit, obranit, vyzvatBosse, obnovitPoSmrti, hud } = useBuddyWorldScene({
    maskot,
    bossDef,
    pocatecniHracStav,
    onZabitiNepritele,
    onZabitiBosse,
  })

  // appka uloží appčin postup (level/XP), jakmile se doopravdy změní
  // — appčina komponenta existuje jen na téhle obrazovce, appka proto
  // nepotřebuje dřívější "if (obrazovka !== 'hra') return" appčinu
  // podmínku, appčin efekt se stejně spustí jen, dokud appka tahle
  // komponenta zůstává namountovaná.
  useEffect(() => {
    onPostupZmena(hud.hrac.level, hud.hrac.xp)
  }, [hud.hrac.level, hud.hrac.xp, onPostupZmena])

  return (
    <div className="bw-arena">
      <div className="bw-arena-canvas" ref={containerRef}>
        {selhalo && (
          <div className="bw-arena-selhalo">
            <p>3D vykreslení se na tomhle zařízení nepovedlo spustit.</p>
          </div>
        )}
      </div>

      <HUD
        hud={hud}
        maskot={maskot}
        bossDef={bossDef}
        onUtocit={utocit}
        onObranit={obranit}
        onVyzvatBosse={vyzvatBosse}
        onZpet={onZpet}
        onZkusitZnovu={obnovitPoSmrti}
      />

      <VirtualniJoystick onZmena={nastavJoystick} />
    </div>
  )
}

export default BuddyWorldHra
