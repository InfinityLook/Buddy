import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { VyberMaskota } from './components/VyberMaskota'
import { BuddyWorldHra } from './components/BuddyWorldHra'
import { useBuddyWorldStore } from './useBuddyWorldStore'
import { maskotPodleId } from './data/maskoti'
import { bossPodleId, VYCHOZI_BOSS_ID } from './data/bossove'
import { hracStavZUrovne } from './leveling'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { useVillageStore } from './useVillageStore'
import { useAdventureStore } from './adventure'
import './BuddyWorldModule.css'
import './release.css'

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
// requestAnimationFrame smyčku úplně sama, proto se k ní appka chová
// jako k černé skříňce: dá jí maskota a definici bosse, a zpátky
// dostane canvas ref a malou HUD strukturu, kterou jen zobrazí. Scéna
// si sama vybírá, s jakými běžnými nepřáteli se hráč utká (viz
// data/nepratele.ts's nahodnyNepritel). Pozice/kamera/souboj se tu v
// Reactovém stavu vůbec neřeší.
//
// Appka useBuddyWorldScene() VOLÁ JEN z appčiny samostatné komponenty
// components/BuddyWorldHra.tsx, ne tady — appčin skutečný reálný test
// na telefonu odhalil, že appčin useBuddyWorldScene() efekt běží jen
// JEDNOU (pevná appčina závislost [maskot, bossDef], appka obojí
// appčinu identitu nikdy nezmění), a tahle komponenta (BuddyWorldModule)
// je appkou namountovaná už od appčiny obrazovky 'vyber', dřív než
// appčin canvas div vůbec existuje. BuddyWorldHra appka namountuje
// poprvé teprve při přepnutí na 'hra' obrazovku, kdy už appčin canvas
// div v DOMu doopravdy existuje — viz komentář v tom souboru pro celé
// vysvětlení.
//
// Landscape, stejný postup jako Survival Night/BuddyZone/Souboj: appka
// se snaží telefon zamknout na šířku (screen.orientation.lock,
// best-effort — nefunguje mimo fullscreen a vůbec na iOS Safari), ale
// skutečnou zárukou je čistě CSS "otoč telefon" výzva v
// BuddyWorldModule.css přes @media (orientation: portrait), co skutečný
// obsah schová, dokud telefon doopravdy na šířku neleží.
//
// v41 (integrace "Ozvěny údolí") přidala plnou 24misijní/6kapitolovou
// kampaň a Buddyho pečovatelský/mincový systém (adventure.ts), vlastní
// prolog a nový soubor release.css. Ten se importuje až PO
// BuddyWorldModule.css, takže jeho pravidla (stejná specificita,
// pozdější pořadí ve zdroji) vyhrávají, kde se obě dotknou stejné
// třídy. Při integraci muselo celé release.css přejít z holých
// pravidel (`:root`, bare `button`/`input`/`:focus-visible`) na
// stejné, všude v souboru už dřív platné `.bw-page`-scoped pravidla —
// v dodávce byla tahle appka původně jediná, samostatná stránka (celý
// dokument), takže si tam `:root`/`button:focus-visible` mohla
// dovolit. Tady by to appčin vědomý celoappkový outline:none
// (viz styles/global.css) natrvalo přepsalo pro zbytek celé appky,
// protože Vite jednou vložený CSS chunk po odchodu z téhle routy
// nikdy neodstraní.
// ==========================================

type Obrazovka = 'vyber' | 'hra'

export const BuddyWorldModule: React.FC = () => {
  const navigate = useNavigate()
  const [obrazovka, setObrazovka] = useState<Obrazovka>('vyber')
  const [intro, setIntro] = useState(false)

  const level = useBuddyWorldStore((s) => s.level)
  const xp = useBuddyWorldStore((s) => s.xp)
  const aktivniMaskotId = useBuddyWorldStore((s) => s.aktivniMaskotId)
  const odemceneMaskoty = useBuddyWorldStore((s) => s.odemceneMaskoty)
  const vybratMaskota = useBuddyWorldStore((s) => s.vybratMaskota)
  const recordAction = useGamificationStore((s) => s.recordAction)
  const zaznamenejVyhru = useVillageStore((s) => s.zaznamenejVyhru)
  const seenIntro = useAdventureStore((s) => s.seenIntro)
  const largeText = useAdventureStore((s) => s.largeText)
  const reducedMotion = useAdventureStore((s) => s.reducedMotion)
  const preferences = useAdventureStore((s) => s.preferences)

  const maskot = maskotPodleId(aktivniMaskotId)
  const bossDef = bossPodleId(VYCHOZI_BOSS_ID)

  useEffect(() => {
    // DOM lib netypuje `.lock()` (pořád experimentální metoda) — místní
    // cast stejný jako GamesHubModule.tsx/Ovladac.tsx/SurvivalModule.tsx
    // jinde v appce.
    const orientaceSZamkem = screen.orientation as ScreenOrientation & {
      lock?: (orientace: string) => Promise<void>
    }
    orientaceSZamkem.lock?.('landscape').catch(() => {})
  }, [])

  useEffect(() => {
    // Titulek záložky appka jinde nikde nemění (jediný výskyt
    // `document.title` v celém src/ mimo tenhle soubor) — statické
    // "Buddy" z index.html samo o sobě stačí, tady se jen krátce
    // nahradí hezčím, ať hráč na záložce prohlížeče uvidí, co hraje.
    // Při odchodu z téhle routy se musí vrátit zpátky, jinak by
    // "Buddy World · Ozvěny údolí" zůstalo trvale nalepené i po
    // návratu do Hubu. `document.documentElement.lang` tahle
    // komponenta nikdy neměnila (zůstává staticky 'cs' z index.html),
    // takže ho nemá co po sobě uklízet.
    const puvodniTitulek = document.title
    document.title = 'Buddy World · Ozvěny údolí'
    return () => {
      document.title = puvodniTitulek
    }
  }, [])

  return (
    <div className={`bw-page ${largeText ? 'bw-large-text' : ''} ${reducedMotion ? 'bw-reduced-motion' : ''}`}>
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
            onPokracovat={() => (seenIntro ? setObrazovka('hra') : setIntro(true))}
            onZpet={() => navigate('/hub')}
          />
        )}

        {obrazovka === 'hra' && (
          <BuddyWorldHra
            maskot={maskot}
            bossDef={bossDef}
            // appka tenhle hráčův stav spočte z trvale uloženého
            // levelu/XP (hracStavZUrovne v leveling.ts) jen jednou,
            // při prvním vykreslení BuddyWorldHra (appka ji mountuje
            // poprvé přesně teď) — pozdější renderování tuhle hodnotu
            // ignoruje, appčin skutečný zdroj pravdy je od téhle
            // chvíle appčin hracStavRef uvnitř scény.
            pocatecniHracStav={hracStavZUrovne(level, xp)}
            onZabitiNepritele={(xpOdmena) => {
              recordAction('buddyworld', xpOdmena)
              zaznamenejVyhru(false)
            }}
            // Poražení bosse appka zapisuje přes sdílený appčin kind
            // 'boss', ne 'buddyworld' — Buddyheim i Survival Night už
            // svého prvního bosse počítají přes tenhle stejný,
            // existující odznak (boss_slayer), appka proto
            // znovupoužívá stejné počítadlo, ne nový paralelní systém.
            onZabitiBosse={(xpOdmena) => {
              recordAction('boss', xpOdmena)
              zaznamenejVyhru(true)
            }}
            // v41 — tenhle prop appka vědomě nechává jako no-op, ne
            // omylem zapomenutý. useBuddyWorldStore.ulozPostup (prosté
            // set({level,xp}) přepsání) byl PŮVODNÍ, jediný způsob,
            // jak appka level/XP ukládala — v41 ho nahradila novým,
            // atomickým a odznámkovaným pridejXp(xp, id?) voláním
            // přímo z míst, kde XP doopravdy vzniká (tady, výš, i
            // uvnitř BuddyWorldHra.tsx u krystalů/bossů/expedic).
            // Znovu navázat ulozPostup na stejný tok by appce vrátilo
            // starou race/last-write-wins chybu ztráty XP, kterou
            // pridejXp's dedup přes odmenyXp zavřel.
            onPostupZmena={() => {}}
            onOdmenaVypravy={(xpOdmena) => recordAction('buddyworld', xpOdmena)}
            onZpet={() => navigate('/hub')}
          />
        )}

        {intro && (
          <div className="bw-intro-shade">
            <article className="bw-intro" role="dialog" aria-modal="true" aria-label="Prolog Ozvěny údolí">
              <div className="bw-eyebrow">PROLOG · OZVĚNY ÚDOLÍ</div>
              <h1>
                Všechno začíná
                <br />
                jedním světlem.
              </h1>
              <p>
                Údolí kdysi chránili tři strážci. Když jejich pečeť praskla, cesty zarostly a domovy
                ztichly. Lidé si přestali vyprávět příběhy o návratu.
              </p>
              <p>Pak ses na starém mostě objevil ty. A vedle tebe se rozzářil malý společník.</p>
              <p>„Nevíme, jestli dokážeme zachránit celý svět,“ řekla Elara. „Ale můžeme začít tímhle údolím.“</p>
              <p className="bw-intro-note">Šest kapitol. Nový domov. A Buddy, který půjde celou cestu s tebou.</p>
              <button
                className="bw-primary"
                onClick={() => {
                  preferences({ seenIntro: true })
                  setIntro(false)
                  setObrazovka('hra')
                }}
              >
                Vstoupit do údolí →
              </button>
              <button onClick={() => setIntro(false)}>Zpět k výběru</button>
            </article>
          </div>
        )}
      </div>
    </div>
  )
}

export default BuddyWorldModule
