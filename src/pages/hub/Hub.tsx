import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useModulovyPrechod } from '@/core/navigation/useModulovyPrechod'
import { SocialIcon } from '@/social/components/SocialIcon'
import { AppBottomNav } from '@/components/AppBottomNav'
import { useBuddyVoice } from '@/buddy/useBuddyVoice'
import { BuddyOverlay } from '@/buddy/BuddyOverlay'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { useAppStore } from '@/core/store/useAppStore'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import { getLevelProgress, getXpForNextLevel } from '@/core/utils/gamificationUtils'
import {
  ProfilNotifications,
  useNotificationItems,
} from '@/pages/profil/components/ProfilNotifications'
// Panel upozornění je sdílený s profilem včetně svých stylů — Hub, stejně
// jako AppModule.tsx, ho nikdy nedostane "zadarmo" (na rozdíl od
// ProfilModule.tsx samotného), takže potřebuje tenhle import navíc, ať
// vyskakovací panel nezůstane bez vzhledu.
import '@/pages/profil/ProfilModule.css'
import './HubModule.css'

interface HubModuleProps {
  onOpenApps?: () => void
  onOpenProfile?: () => void
}

// Jeden paprsek kruhového menu — šest jich jde kolem prostředního
// "BUDDY CORE" tlačítka, viz HubModule.css's vlastní komentář u
// .hub-wheel-petal pro úhly/souřadnice. `uhel` je stejný úhlový rozpis
// (0° nahoře/AI, po 60° po směru hodinových ručiček), co appka má
// zapsaný i v CSS komentáři — tady ho appka potřebuje znovu jako
// skutečná čísla kvůli Kroku 6 (viz `najdiPaprsekPodleSmeru` níž).
interface KoloPaprsek {
  id: string
  nazev: string
  ikona: string
  uhel: number
  onClick: () => void
}

// Krok 7: appka při výběru nejdřív 350–500 ms "doehraje" zavírací
// efekt (viz `vybratPaprsek`/TRVANI_VYBERU_MS níž), teprve pak doopravdy
// naviguje. 400 ms sedí přesně doprostřed zadaného rozpětí.
const TRVANI_VYBERU_MS = 400

// Krok 8: klepnutí znovu na střed (appka POUZE zavírá, nic nevybírá)
// spustí obrácenou kaskádu — stejná šestice zpoždění jako při otevření
// (0,15–0,50 s po 0,07 s), ale REWARDS/SHOP/ROOMS/SOCIAL/APPS/AI, přesně
// naopak (viz šest nových .hub-wheel--zavira-se pravidel v HubModule.css).
// 850 ms appka počítá z nejdelšího zpoždění v tý obrácený kaskádě (AI,
// 0,50 s, stejná hodnota jako REWARDS měl při otevření) plus doby
// samotného přechodu (0,32 s, stejná, co paprsky používají odjakživa —
// viz .hub-wheel-petal's vlastní `transition` v HubModule.css) a malou
// rezervu navíc, ať appka nepřepne stav dřív, než CSS doopravdy dojede.
const TRVANI_ZAVIRANI_MS = 850

// Dvanáct drobných jiskřiček, co z prstenu "vybuchnou" směrem ven, než
// appka naviguje — appka si jejich směr (jednotkový vektor) spočítá
// jednou tady při startu modulu, ne znovu při každém vykreslení/výběru,
// stejný duch jako appčin komentář u `kolo` výš ("úhly jednou sama, ne
// za běhu"), jen přes krátkou smyčku místo ručního vypsání dvanácti
// dvojic čísel. `od`/`do` jsou rovnou hotová procenta pro CSS top/left
// (appka cestu nedělá přes transform: translate(%) — to by se počítalo
// vůči velikosti tečky samotné, ne kola, a jiskřička by tak urazila
// jen zlomek milimetru místo kus kola) — vnitřní poloměr 18 % sedí
// kousek za vnitřním prstencem, vnější 58 % přesně na poloměru
// vnějšího prstence (.hub-wheel-ring-outer's vlastní width), ať
// jiskřičky doopravdy vypadají jako rozpadlý prsten, ne náhodné tečky.
const POCET_CASTIC = 12
const CASTICE_SMERY = Array.from({ length: POCET_CASTIC }, (_, i) => {
  const uhel = ((360 / POCET_CASTIC) * i * Math.PI) / 180
  const x = Math.sin(uhel)
  const y = -Math.cos(uhel)
  return {
    odLeft: 50 + x * 18,
    odTop: 50 + y * 18,
    doLeft: 50 + x * 58,
    doTop: 50 + y * 58,
  }
})

export const HubModule: React.FC<HubModuleProps> = ({
  onOpenApps,
  onOpenProfile,
}) => {
  const navigate = useNavigate()
  // Jen tenhle jeden volání (Hub -> Social) — viz jeho vlastní komentář
  // a global.css's ::view-transition-*(root) pro proč jen dopředu.
  const prejit = useModulovyPrechod()
  const { profile, markNotificationRead } = useProfileData()

  // Skutečný náhled upozornění pod zvonkem — stejný sdílený panel a
  // stejná data (ProfilNotifications.tsx/useNotificationItems), jaké
  // appka už používá v AppModule.tsx/ProfilModule.tsx a v každé
  // vlajkové appce přes FlagshipShell.tsx. Zvonek dřív jen vedl do
  // Profilu s tečkou navíc — teď doopravdy ukáže poslední upozornění
  // rovnou tady, Profil zůstává jen pro "Zobrazit vše".
  const notifications = useNotificationItems()
  const maNeprectene = notifications.some((n) => !profile.readNotifications.includes(n.id))
  const [notifOpen, setNotifOpen] = useState(false)

  // Načtení gamifikačních dat ze storu
  const { level, xp, streakDays, recordActivity } = useGamificationStore()

  // Store aplikací — používáme pro deep-link do konkrétní miniaplikace
  const { setActiveAppId } = useAppStore()

  // Zaznamenání aktivity při otevření Hubu pro započítání streaku
  useEffect(() => {
    recordActivity()
  }, [recordActivity])

  const progressPercent = getLevelProgress(xp)
  const xpDoDalsi = getXpForNextLevel(level)

  const handleAppsClick = () => {
    if (onOpenApps) {
      onOpenApps()
      return
    }
    // Vyčistíme případnou dříve otevřenou miniaplikaci, ať se zobrazí přehled
    setActiveAppId(null)
    navigate('/apps')
  }

  const handleProfileClick = () => {
    if (onOpenProfile) {
      onOpenProfile()
      return
    }
    navigate('/profil')
  }

  // Rewards otevře samostatný modul s odměnami (úroveň, série, odznaky)
  const handleRewardsClick = () => {
    navigate('/odmeny')
  }

  // Hlasový Buddy — Hub si bere svou vlastní instanci useBuddyVoice
  // (stejně jako AppBottomNav na každé jiné obrazovce), ať paprsek "AI"
  // v kole jde otevřít přímo odtud, ne jen přes spodní lištu.
  const buddyVoice = useBuddyVoice()
  const [buddyOpen, setBuddyOpen] = useState(false)

  // Kolo je defaultně zavřené — jen prostřední "BUDDY CORE" tlačítko,
  // žádný paprsek. Klepnutí na střed teď přepíná otevřeno/zavřeno (dřív
  // vedlo rovnou do Profilu — appka pro to má avatar v hlavičce, druhá
  // cesta tam navíc nebyla potřeba). Vizuální sled (bliknutí středu →
  // objeví se prstenec → prstenec se otočí → paprsky vyjedou ven,
  // každý s vlastním zpožděním) je celý v CSS přes .hub-wheel.je-
  // otevrene, žádný JS časovač — appka jen přepne jednu třídu a nechá
  // CSS přechody udělat zbytek, viz HubModule.css's vlastní komentář
  // u .hub-wheel-petal.
  const [kolootevreno, setKolootevreno] = useState(false)

  // Krok 5/6: zvýraznění paprsku pod prstem/kurzorem — appka ho
  // schválně netrackuje přes CSS :hover (na dotykové obrazovce nic
  // takového spolehlivě neexistuje), ale přes sjednocené Pointer
  // Events, co fungují stejně pro myš i dotyk.
  const [zvyrazneneId, setZvyrazneneId] = useState<string | null>(null)

  // Krok 7: id právě vybraného paprsku, dokud appka "doehrává" zavírací
  // efekt (viz vybratPaprsek níž) — null znamená "nic se nevybírá,
  // kolo je buď zavřené, nebo normálně otevřené". Appka tímhle stavem
  // zároveň hlídá, ať se výběr nespustí dvakrát (druhé klepnutí/
  // uvolnění během těch pár set milisekund už žádný efekt nezpůsobí,
  // viz vybratPaprsek's vlastní guard).
  const [vybranyId, setVybranyId] = useState<string | null>(null)

  // Krok 8: appka "zavírá se" (obrácená kaskáda, viz zavritKolo níž),
  // dokud je true — na rozdíl od vybranyId appka tu nepotřebuje
  // konkrétní id, zavírání se vždycky týká CELÉHO kola naráz, jen
  // s různým zpožděním na KAŽDÉM paprsku zvlášť (to už appka řeší
  // čistě v CSS, viz .hub-wheel--zavira-se).
  const [zaviraSe, setZaviraSe] = useState(false)

  const otevritBuddyho = () => {
    buddyVoice.vycistit()
    setBuddyOpen(true)
  }

  // Krok 8: appka teď OTEVŘENÍ (okamžité, jako doteď) a ZAVŘENÍ
  // (obrácená, rozfázovaná kaskáda) řeší jako dvě různé věci, ne jeden
  // prostý toggle. `je-otevrene` zůstává nasazené po celou dobu
  // zavírání — appka ho sundá, teprve až se poslední paprsek (AI)
  // doopravdy vrátí ke středu, čímž se zároveň prostřední tlačítko
  // (pořád drženo na scale(1.08) celou tu dobu, viz HubModule.css's
  // .hub-wheel.je-otevrene .hub-wheel-center) vrátí ke svýmu klidovýmu
  // pulzu — to je to "a nakonec: BUDDY CORE znovu" ze zadání, appka
  // pro to nepotřebuje žádnou novou animaci navíc, jen správné pořadí.
  // `prefers-reduced-motion` appka čte přímo tady ze stejného důvodu
  // jako u vybratPaprsek — jde o JS časovač, kill-switch v global.css
  // sám o sobě zkrátí jen transition-duration/CSS animace, ne tenhle
  // setTimeout.
  const prepnoutKolo = () => {
    if (vybranyId !== null || zaviraSe) return
    if (!kolootevreno) {
      setKolootevreno(true)
      return
    }
    setZvyrazneneId(null)
    setZaviraSe(true)
    const zkraceno = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.setTimeout(
      () => {
        setKolootevreno(false)
        setZaviraSe(false)
      },
      zkraceno ? 0 : TRVANI_ZAVIRANI_MS,
    )
  }

  const zavritBuddyho = () => {
    buddyVoice.zastavit()
    setBuddyOpen(false)
  }

  // Šest paprsků kolem prostředního tlačítka — nahrazuje dřívější kartové
  // sekce "Prozkoumej"/"Tvůj pokrok" naráz (appka do nich schválně
  // nedává nic navíc, ať se Shop/Rewards nezobrazují dvakrát). Rooms a
  // Apps vedou na stejné místo schválně — appčiny vlajkové roomy dnes
  // žijí nahoře na /apps (RoomCarousel), appka tam nemá druhou, oddělenou
  // obrazovku jen pro ně. `uhel` musí přesně sedět s rozestavěním
  // v HubModule.css (0°=nahoře/AI, po 60° po směru hodinových ručiček) —
  // appka obě appku si drží schválně ručně synchronizované, ne jako
  // jednu sdílenou konstantu, protože CSS procenta (top/left) a JS úhly
  // (pro Krok 6 níž) jsou dva různé způsoby, jak vyjádřit totéž
  // rozestavění, a appka je nemá jak spočítat jedno z druhého bez
  // zbytečné komplikace navíc.
  const kolo: KoloPaprsek[] = [
    { id: 'ai', nazev: 'AI', ikona: '/icons/hub-wheel/ai.png', uhel: 0, onClick: otevritBuddyho },
    { id: 'apps', nazev: 'Apps', ikona: '/icons/hub-wheel/apps.png', uhel: 60, onClick: handleAppsClick },
    { id: 'shop', nazev: 'Shop', ikona: '/icons/hub-wheel/shop.png', uhel: 120, onClick: () => navigate('/obchod') },
    { id: 'rewards', nazev: 'Rewards', ikona: '/icons/hub-wheel/rewards.png', uhel: 180, onClick: handleRewardsClick },
    { id: 'rooms', nazev: 'Rooms', ikona: '/icons/hub-wheel/rooms.png', uhel: 240, onClick: handleAppsClick },
    { id: 'social', nazev: 'Social', ikona: '/icons/hub-wheel/social.png', uhel: 300, onClick: () => prejit('/social') },
  ]

  // Krok 6: appka teď paprsek pod prstem nehledá podle toho, nad kterým
  // DOM prvkem prst doopravdy je (document.elementFromPoint, Krok 5),
  // ale podle SMĚRU od STŘEDU kola — prst tak nemusí doputovat až na
  // skutečnou pozici paprsku, stačí i malý pohyb správným směrem
  // ("prst jde doprava: APPS se rozsvítí"). Blízko středu (uvnitř
  // kruhu prostředního tlačítka, mrtvá zóna = jeho vlastní poloměr,
  // 17 % šířky kola) appka schválně nic nehlásí — směr by tam byl
  // nejistý, a appka tím místem nechává projít obyčejné klepnutí na
  // střed (otevřít/zavřít kolo) beze změny.
  //
  // Úhel appka počítá v souřadnicích obrazovky (Y roste dolů), proto
  // +90° posun: atan2(dy,dx) dá "nahoru" = -90°, appka chce "nahoru" =
  // 0° (AI). Výsledek je čistá matematika, bez dalšího dotazu do DOM.
  const najdiPaprsekPodleSmeru = (x: number, y: number, rect: DOMRect): string | null => {
    const stredX = rect.left + rect.width / 2
    const stredY = rect.top + rect.height / 2
    const dx = x - stredX
    const dy = y - stredY
    const vzdalenost = Math.hypot(dx, dy)
    const mrtvaZona = rect.width * 0.17
    if (vzdalenost < mrtvaZona) return null

    // Přesně napůl mezi dvěma paprsky (čistě vodorovně doleva/doprava —
    // 270°/90° — leží přesně uprostřed mezi SOCIAL/ROOMS resp. APPS/SHOP,
    // oba po 30°) appka rozhodne podle pořadí v poli `kolo` výš (první
    // nalezený vyhrává, `<` ne `<=`) — ověřeno přímo v prohlížeči, že se
    // to doopravdy stává jen při matematicky přesně vodorovném gestu.
    // Appka to schválně neřeší zvlášť: žádný skutečný pohyb prstu/myši
    // není nikdy úplně přesně vodorovný, i malý svislý posun (viz appčin
    // vlastní test) nejednoznačnost spolehlivě rozlomí správným směrem.
    const uhel = ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360
    let nejblizsiId: string | null = null
    let nejmensiRozdil = Infinity
    for (const paprsek of kolo) {
      const rozdilSurovy = Math.abs(uhel - paprsek.uhel)
      const rozdil = Math.min(rozdilSurovy, 360 - rozdilSurovy)
      if (rozdil < nejmensiRozdil) {
        nejmensiRozdil = rozdil
        nejblizsiId = paprsek.id
      }
    }
    return nejblizsiId
  }

  const sledujKurzorNadKolem = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!kolootevreno || vybranyId !== null || zaviraSe) return
    setZvyrazneneId(najdiPaprsekPodleSmeru(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect()))
  }

  const zrusZvyrazneni = () => {
    setZvyrazneneId(null)
  }

  // Krok 7: appka tímhle místem vybrání paprsku vždycky prochází —
  // ať je vybráno uvolněním gesta (aktivovatNaUvolneni) nebo klávesnicí
  // (petal's vlastní onClick níž), výsledek je stejný: kolo se "stáhne"
  // zpátky ke středu, prsteny zmizí a prstenec "vybuchne" na jiskřičky
  // (celé přes CSS, viz .hub-wheel--vybira-se v HubModule.css), appka
  // jen po uplynutí tý doby doopravdy naviguje/spustí Buddyho/atd.
  //
  // Guard na `vybranyId !== null` brání druhému, nechtěnému spuštění,
  // kdyby gesto/klávesnice stihly vybrat něco ještě před doběhnutím
  // prvního efektu. `prefers-reduced-motion` appka čte přímo tady (ne
  // přes CSS kill-switch global.css's vlastní blok) ze stejného
  // důvodu, jako to dělá useModulovyPrechod.ts — appka totiž tenhle
  // časový posun řeší v JS (setTimeout), ne čistě v CSS přechodu/
  // animaci, takže ho kill-switch sám o sobě nezkrátí.
  const vybratPaprsek = (id: string) => {
    if (vybranyId !== null) return
    const paprsek = kolo.find((p) => p.id === id)
    if (!paprsek) return
    setZvyrazneneId(null)
    setVybranyId(id)
    const zkraceno = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.setTimeout(
      () => {
        paprsek.onClick()
        setVybranyId(null)
        setKolootevreno(false)
      },
      zkraceno ? 0 : TRVANI_VYBERU_MS,
    )
  }

  // Krok 6: "A když prst pustí → otevře se daná sekce." Appka tu
  // směr počítá znovu, přímo ze souřadnic uvolnění (ne jen ze starého
  // `zvyrazneneId` ve stavu) — stejná funkce, ale appka tak má jistotu,
  // že se aktivuje přesně to, co bylo vidět v okamžiku puštění, ne
  // nějaká o krůček stará hodnota. Mimo mrtvou zónu beze změru (prst
  // se vrátil ke středu, nebo kolo opustil pointerup bez pohybu) appka
  // nic nespustí — přesné klepnutí na prostřední tlačítko dál funguje
  // samo přes svůj vlastní onClick, nedotčené. Krok 7: aktivace teď
  // vede přes vybratPaprsek (zavírací efekt), ne přímo přes
  // paprsek.onClick().
  const aktivovatNaUvolneni = (e: React.PointerEvent<HTMLDivElement>) => {
    if (kolootevreno && vybranyId === null && !zaviraSe) {
      const paprsekId = najdiPaprsekPodleSmeru(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect())
      if (paprsekId) vybratPaprsek(paprsekId)
    }
    setZvyrazneneId(null)
  }

  return (
    <div className="hub-page">
      {/* Fixní pozadí — fotka soumraku nad horami + ztmavovací gradient
          kvůli čitelnosti hlavičky/karet, ne holý gradient appky jako
          dřív (viz hub-bg.css's vlastní komentář pro proč a jak moc
          přitmavené). */}
      <div className="hub-bg" aria-hidden="true" />
      <div className="hub-bg-overlay" aria-hidden="true" />
      {/* Krok 9: "Když menu otevřeš: pozadí lehce ztmavne... Když menu
          zavřeš: pozadí se zase rozjasní." — appka to řeší jako třetí,
          samostatnou vrstvu nad .hub-bg-overlay (ne přebarvováním jejího
          gradientu samotného — gradient appka přes transition spolehlivě
          neanimuje přes všechny prohlížeče, plochá barva s vlastním
          opacity přechodem ano). Appka drží ztmavení vázané čistě na
          `kolootevreno`, ne na vybranyId/zaviraSe — kolo samo (prostřední
          tlačítko, oba prstence, viz jejich vlastní komentáře v
          HubModule.css) zůstává ve svém "otevřeném" vzhledu po celou
          dobu i Kroku 7 (výběr), i Kroku 8 (zavírání), a appka chce, ať
          se pozadí rozjasní přesně ve stejnou chvíli, co se tyhle prvky
          doopravdy vrátí do klidu — jeden společný moment, ne dřívější
          rozjasnění pod ještě viditelně mizejícími paprsky. */}
      <div className={`hub-bg-dim${kolootevreno ? ' hub-bg-dim--aktivni' : ''}`} aria-hidden="true" />

      <div className="hub-container">
        {/* Header — vlčí/liščí maskot (stejná fotka, co appka má i jako
            prostřední tlačítko spodní lišty — public/maskot/buddy-vlk.png,
            žádný nový crop) místo dřívější ✦ značky, "BuddyZone" +
            podtitul "Lepší ty. Každý den." + dvě akce (zvonek/avatar).
            Lupa, co tu dřív byla jako třetí ikona, se přestěhovala dolů
            do sdílené spodní lišty (AppBottomNav) místo tlačítka
            "Social". Odhlášení je v Nastavení (settings-danger-btn tam),
            appka bez toho neměla jinou cestu ven z účtu. */}
        <header className="hub-header">
          <div className="hub-logo">
            <img src="/maskot/buddy-vlk.png" alt="" className="hub-logo-img" />
            <div className="hub-logo-text-col">
              <span className="hub-logo-text">BuddyZone</span>
              <span className="hub-logo-tagline">Lepší ty. Každý den.</span>
            </div>
          </div>

          <div className="hub-header-actions">
            <button className="hub-icon-btn" aria-label="Oznámení" onClick={() => setNotifOpen(true)}>
              <SocialIcon name="bell" size={19} />
              {maNeprectene && <span className="hub-icon-dot" aria-hidden="true" />}
            </button>

            <button className="hub-avatar-btn" aria-label="Profil" onClick={handleProfileClick}>
              <img src={profile.avatar} alt="" className="hub-avatar-img" />
              <span className="hub-avatar-dot" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Úroveň a série — appka dřív měla nad touhle řadou ještě celý
            hero panel s koulí maskota (a předtím ještě dřív rohové
            odznaky přes něj), obojí je pryč. Hlasový Buddy teď zase
            jde otevřít přímo z Hubu (paprsek "AI" v kole níž), vedle
            svých dalších vstupů ve spodní liště a na Apps/Profil/
            Nastavení — appka si pro něj bere vlastní instanci
            useBuddyVoice na každé z těchhle obrazovek zvlášť, žádná
            koule ke sdílení stavu mezi nimi není potřeba. */}
        <div className="hub-hero-stats-row">
          <div className="hub-hero-level" aria-label={`Úroveň ${level}, ${xp} z ${xpDoDalsi} XP`}>
            <span className="hub-level-hex" aria-hidden="true">
              <span className="hub-level-hex-num">{String(level).padStart(2, '0')}</span>
            </span>
            <div className="hub-level-info">
              <span className="hub-level-title">LEVEL {level}</span>
              <span className="hub-level-xp">
                {xp} / {xpDoDalsi} XP
              </span>
              <span className="hub-level-progress" aria-hidden="true">
                <span className="hub-level-progress-fill" style={{ width: `${progressPercent}%` }} />
              </span>
            </div>
          </div>

          <div className="hub-hero-streak" aria-label={`${streakDays} dní v řadě`}>
            <span className="hub-streak-flame" aria-hidden="true">🔥</span>
            <span className="hub-streak-num">{streakDays}</span>
            <span className="hub-streak-label">DAYS STREAK</span>
          </div>
        </div>

        {/* Kruhové menu — nahrazuje dřívější kartové sekce "Prozkoumej"
            a "Tvůj pokrok" naráz, viz appčin vlastní komentář u pole
            `kolo` výš. Zavřené kolo ukazuje prostřední "BUDDY CORE"
            tlačítko (B medailon) obklopené dvěma jemnými, pořád se
            otáčejícími prstenci ("energetické jádro") — klepnutí na
            střed kolo přepne na otevřené a paprsky vyjedou ven,
            jeden po druhém (viz HubModule.css pro přesné zpoždění u
            každého a pro to, proč prstence běží pořád, ne jen při
            otevření). Pohyb prstem/kurzorem kolem středu zvýrazní
            paprsek ve směru pohybu (nemusí na něj fyzicky doputovat)
            a uvolnění danou sekci rovnou otevře — viz appčin komentář
            u `najdiPaprsekPodleSmeru`/`aktivovatNaUvolneni` výš. */}
        <div className="hub-wheel-wrap">
          <div
            className={`hub-wheel${kolootevreno ? ' je-otevrene' : ''}${
              vybranyId !== null ? ' hub-wheel--vybira-se' : ''
            }${zaviraSe ? ' hub-wheel--zavira-se' : ''}`}
            onPointerMove={sledujKurzorNadKolem}
            onPointerDown={sledujKurzorNadKolem}
            onPointerUp={aktivovatNaUvolneni}
            onPointerCancel={zrusZvyrazneni}
            onPointerLeave={zrusZvyrazneni}
          >
            <span className="hub-wheel-ring-wrap" aria-hidden="true">
              <span className="hub-wheel-ring-outer" />
              <span className="hub-wheel-ring-inner" />
            </span>

            {/* Krok 7: dvanáct jiskřiček, co z prstenu "vybuchnou" ven —
                appka je vykresluje jen během přechodu (vybranyId !== null),
                ne pořád schované v DOM, ať appka nenosí 12 navíc prvků na
                stránce, dokud se kolo doopravdy nevybírá. Směr/vzdálenost
                appka počítá jen jednou při startu modulu (CASTICE_SMERY
                výš) — tady je jen přiřazuje na vlastní CSS proměnné, co
                @keyframes hub-castice-vybuch v HubModule.css animuje. */}
            {vybranyId !== null && (
              <span className="hub-wheel-castice" aria-hidden="true">
                {CASTICE_SMERY.map((smer, i) => (
                  <span
                    key={i}
                    className="hub-wheel-castice-bod"
                    style={{
                      '--cl-od': `${smer.odLeft}%`,
                      '--ct-od': `${smer.odTop}%`,
                      '--cl-do': `${smer.doLeft}%`,
                      '--ct-do': `${smer.doTop}%`,
                    } as React.CSSProperties}
                  />
                ))}
              </span>
            )}

            <button
              type="button"
              className="hub-wheel-center"
              onClick={prepnoutKolo}
              aria-label={kolootevreno ? 'Zavřít menu' : 'Otevřít menu'}
              aria-expanded={kolootevreno}
            >
              <img src="/icons/hub-wheel/buddy-core.png" alt="" />
            </button>

            {kolo.map((paprsek) => {
              const zvyrazneny = zvyrazneneId === paprsek.id
              const stazeny = zvyrazneneId !== null && !zvyrazneny
              return (
                <button
                  key={paprsek.id}
                  type="button"
                  data-paprsek-id={paprsek.id}
                  className={`hub-wheel-petal hub-wheel-petal--${paprsek.id}${
                    zvyrazneny ? ' hub-wheel-petal--aktivni' : stazeny ? ' hub-wheel-petal--stazeny' : ''
                  }`}
                  onClick={(e) => {
                    // Krok 6/7: myš/dotyk teď akci spouští centrálně přes
                    // uvolnění nad kolem (aktivovatNaUvolneni výš, podle
                    // směru od středu, ne nutně přesně na tomhle
                    // tlačítku) — tenhle onClick smí doopravdy spustit
                    // výběr jen pro klávesnici (Enter/Space na
                    // fokusovaném tlačítku, kde prohlížeč sám hlásí
                    // detail===0), jinak by myš/dotyk výběr spustily
                    // dvakrát, jednou odsud, jednou z gesta. I odtud ale
                    // jde přes vybratPaprsek, ne přímo paprsek.onClick() —
                    // klávesnice má na stejný zavírací efekt právo stejně
                    // jako dotyk/myš.
                    if (e.detail === 0) vybratPaprsek(paprsek.id)
                  }}
                  onFocus={() => {
                    if (vybranyId === null && !zaviraSe) setZvyrazneneId(paprsek.id)
                  }}
                  onBlur={() => setZvyrazneneId((cur) => (cur === paprsek.id ? null : cur))}
                  tabIndex={kolootevreno && !zaviraSe ? 0 : -1}
                >
                  <img src={paprsek.ikona} alt="" />
                  <span className="hub-wheel-petal-label">{paprsek.nazev}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Spodní navigace — Fáze 4 Social nav reworku vytáhla tenhle
            blok do sdílené komponenty (src/components/AppBottomNav.tsx),
            appka ji teď vykresluje i mimo Hub (Apps/Profil/Nastavení).
            Bez vlastního onTal propu — lišta si bere úplně svou vlastní
            instanci useBuddyVoice, nezávislou na Hubovu vlastní (paprsek
            "AI" v kole výš), stejně jako na každé jiné stránce. */}
        <AppBottomNav />

        <ProfilNotifications
          open={notifOpen}
          readIds={profile.readNotifications}
          onMarkRead={markNotificationRead}
          onClose={() => setNotifOpen(false)}
        />

        {buddyOpen && <BuddyOverlay voice={buddyVoice} onZavrit={zavritBuddyho} />}
      </div>
    </div>
  )
}

export default HubModule
