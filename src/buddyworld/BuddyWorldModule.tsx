import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBuddyWorldScene } from './scene/useBuddyWorldScene'
import { VirtualniJoystick } from '@/game/components/VirtualniJoystick'
import { HUD } from './components/HUD'
import { VyberMaskota } from './components/VyberMaskota'
import { useBuddyWorldStore } from './useBuddyWorldStore'
import { maskotPodleId } from './data/maskoti'
import { bossPodleId, VYCHOZI_BOSS_ID } from './data/bossove'
import { hracStavZUrovne } from './leveling'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import './BuddyWorldModule.css'

// ==========================================
// Buddy World — orchestrátor obrazovek. Tahle hra je NOVÁ,
// samostatná route (/buddy-world), ne součást dřívější, dočasně
// schované sekce Hry (GamesHubModule) — rozhodnuto po
// AskUserQuestion s uživatelem, poté co audit App.tsx zjistil, že
// celá sekce Hry je kvůli blížícímu se Google Play v1 review
// schovaná. Jakmile se ta sekce před store submission odkryje
// zpátky, bude potřeba zvážit, jestli Buddy World patří tam, nebo
// zůstává mimo ni — to tahle appka záměrně neřeší, cílem bylo mít
// hru hned vyzkoušenou na mobilu.
//
// Vlastní 3D scéna (useBuddyWorldScene.ts) si drží svou jedinou
// requestAnimationFrame smyčku úplně sama, proto se k ní tahle
// komponenta chová jako k černé skříňce: dá jí maskota a definici
// bosse, a zpátky dostane canvas ref a malou HUD strukturu, kterou
// jen zobrazí. Scéna si sama vybírá, s jakými běžnými nepřáteli se
// hráč utká (viz data/nepratele.ts's nahodnyNepritel). Pozice/kamera/
// souboj se tu v Reactovém stavu vůbec neřeší.
//
// Landscape, stejný postup jako Survival Night/BuddyZone/Souboj: appka
// se snaží telefon zamknout na šířku (screen.orientation.lock,
// best-effort — nefunguje mimo fullscreen a vůbec na iOS Safari), ale
// skutečnou zárukou je čistě CSS "otoč telefon" výzva v
// BuddyWorldModule.css přes @media (orientation: portrait), co skutečný
// obsah schová, dokud telefon doopravdy na šířku neleží.
// ==========================================

type Obrazovka = 'vyber' | 'hra'

export const BuddyWorldModule: React.FC = () => {
  const navigate = useNavigate()
  const [obrazovka, setObrazovka] = useState<Obrazovka>('vyber')

  const level = useBuddyWorldStore((s) => s.level)
  const xp = useBuddyWorldStore((s) => s.xp)
  const aktivniMaskotId = useBuddyWorldStore((s) => s.aktivniMaskotId)
  const odemceneMaskoty = useBuddyWorldStore((s) => s.odemceneMaskoty)
  const vybratMaskota = useBuddyWorldStore((s) => s.vybratMaskota)
  const ulozPostup = useBuddyWorldStore((s) => s.ulozPostup)
  const recordAction = useGamificationStore((s) => s.recordAction)

  const maskot = maskotPodleId(aktivniMaskotId)
  const bossDef = bossPodleId(VYCHOZI_BOSS_ID)

  const { containerRef, selhalo, nastavJoystick, utocit, obranit, vyzvatBosse, obnovitPoSmrti, hud } = useBuddyWorldScene({
    maskot,
    bossDef,
    // appka tenhle hráčův stav spočte z trvale uloženého levelu/XP
    // (hracStavZUrovne v leveling.ts) jen jednou, při prvním
    // vykreslení scény (viz useBuddyWorldScene.ts's useEffect, který
    // běží jen při změně maskota/bossDef) — pozdější renderování
    // tuhle hodnotu ignoruje, appčin skutečný zdroj pravdy je od
    // téhle chvíle appčin hracStavRef uvnitř scény.
    pocatecniHracStav: hracStavZUrovne(level, xp),
    onZabitiNepritele: (xpOdmena) => recordAction('buddyworld', xpOdmena),
    // Poražení bosse appka zapisuje přes sdílený appčin kind 'boss',
    // ne 'buddyworld' — Buddyheim i Survival Night už svého prvního
    // bosse počítají přes tenhle stejný, existující odznak
    // (boss_slayer), appka proto znovupoužívá stejné počítadlo, ne
    // nový paralelní systém.
    onZabitiBosse: (xpOdmena) => recordAction('boss', xpOdmena),
  })

  // appka uloží appčin postup (level/XP), jakmile se doopravdy změní
  // — appka tak persistuje jen to, co appčin prototyp doopravdy
  // používá, přesně jak appka zadání žádá.
  useEffect(() => {
    if (obrazovka !== 'hra') return
    ulozPostup(hud.hrac.level, hud.hrac.xp)
  }, [obrazovka, hud.hrac.level, hud.hrac.xp, ulozPostup])

  useEffect(() => {
    // DOM lib netypuje `.lock()` (pořád experimentální metoda) — místní
    // cast stejný jako GamesHubModule.tsx/Ovladac.tsx/SurvivalModule.tsx
    // jinde v appce.
    const orientaceSZamkem = screen.orientation as ScreenOrientation & {
      lock?: (orientace: string) => Promise<void>
    }
    orientaceSZamkem.lock?.('landscape').catch(() => {})
  }, [])

  return (
    <div className="bw-page">
      <div className="bw-rotate-prompt" aria-hidden="true">
        <span className="bw-rotate-ikona">🔄</span>
        <p>Otoč telefon na šířku</p>
      </div>

      <div className="bw-shell">
        {obrazovka === 'vyber' && (
          <VyberMaskota
            aktivniMaskotId={aktivniMaskotId}
            odemceneMaskoty={odemceneMaskoty}
            onVybrat={vybratMaskota}
            onPokracovat={() => setObrazovka('hra')}
            onZpet={() => navigate('/hub')}
          />
        )}

        {obrazovka === 'hra' && (
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
              onZpet={() => navigate('/hub')}
              onZkusitZnovu={obnovitPoSmrti}
            />

            <VirtualniJoystick onZmena={nastavJoystick} />
          </div>
        )}
      </div>
    </div>
  )
}

export default BuddyWorldModule
