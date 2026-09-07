import React from 'react'
import type { PostavaId, VariantaPostavy } from '../combat/postavy'
import type { VizualniStavBojovnika } from '../combat/loop'
import './PostavaGrafika.css'

interface Props {
  postavaId: PostavaId
  size?: number
  /** Jemné dýchavé pohupování — jen pro výběr postavy na ovladači
   *  (VyberPostavy.tsx), NE pro token v aréně (Bojiste.tsx), kde stav
   *  bojovníka (idle/útok/hitstun/blok/ko) už řídí vlastní animaci na
   *  obalovém <div> a dvě animace na sobě by se rvaly o transform. */
  animovana?: boolean
  className?: string
  /** Osmé kolo vylepšení — odemykatelná varianta barvy (kosmetika.ts).
   *  Výchozí 'vychozi' = beze změny oproti kterékoli dřívější fázi. */
  varianta?: VariantaPostavy
  /** Grafika (asset pack) — která z osmi póz (viz POZY níž) se má
   *  ukázat. Volající (SoubojArena2D/3D.tsx) tohle už dřív počítaly
   *  pro `className` na obalovém <div> (vizualniStavBojovnika/jeChyt/
   *  jeVitez) — appka jen znovu použije tytéž hotové hodnoty, žádný
   *  nový výpočet. Chybí-li (VyberPostavy.tsx, TvHost.tsx's úvodní
   *  "VS" obrazovka), padne na klidové 'idle'. */
  vizualniStav?: VizualniStavBojovnika
  jeChyt?: boolean
  jeVitez?: boolean
}

interface PaletaPostavy {
  /** Barva zářivého pozadí za postavičkou (dřívější "aura" ellipse v
   *  SVG) — jediné, co appka od skutečné grafiky ještě přebarvuje,
   *  viz komentář k Grafice níž. */
  aura: string
  /** Barva doplňku pro Jiskry.tsx (zásahové jiskry podle útočníkovy
   *  postavy/elementu) — nezávislá na vzhledu samotné postavičky. */
  akcent: string
}

// ==========================================
// Grafika — náhrada Fáze 6/druhého kola SVG ilustrací za skutečný,
// zdarma dostupný sprite pack: Kenney "Toon Characters" (CC0), přes
// GitHub zrcadlo github.com/shorepine/kenney (kenney.nl/itch.io/
// opengameart.org appka z tohoto sandboxu nemůže přímo stáhnout —
// síťová politika je blokuje; GitHub ne). Appka sáhla přímo k
// AskUserQuestion, než začala cokoli stahovat/integrovat (appčin
// vlastní "diskutuj, pak stav" postup pro velké vizuální rozhodnutí)
// — nabízela tři cesty (najít free asset pack / uživatel si vygeneruje
// vlastní obrázky / jen vylepšit SVG) a "najdi free asset pack" bylo
// zvolené, pak "GitHub zrcadlo Kenneyho" jako konkrétní zdroj, jakmile
// se ukázalo, že kenney.nl/itch.io/opengameart.org samy jsou odsud
// nedosažitelné (403 na síťové bráně, ne dočasná chyba — appka to
// ověřila přímým dotazem, ne odhadem).
//
// Balíček "Toon Characters" byl vybraný ze všech Kenneyho postavových
// balíčků (Character Pack, Platformer Characters, Robot Pack, Animal
// Pack, ...) proto, že jediný nese PŘESNĚ tu sadu pojmenovaných póz,
// co Souboj potřebuje: idle/attack0/attack1/attackKick/hurt/hit/
// duck/down/fallDown/cheer0/cheer1 — beze zbytku sedí na appčin už
// existující stavový model (combat/loop.ts's VizualniStavBojovnika),
// takže appka nemusela stavět žádnou frame-by-frame animaci ani nový
// rendering pipeline, jen POZY (viz níž) — jednu statickou pózu na
// stav, přesně jak to dělal dřívější ruční SVG (jeden tvar, animovaný
// transformem/filtrem na obalovém <div> v FightingModule.css, beze
// změny — viz .souboj-bojovnik--* pravidla tam). Balíček nabízí šest
// postav (Female/Male adventurer, Female/Male person, Robot, Zombie),
// appka použila čtyři podle SILUETY/TÉMATU, ne podle namalované
// barvy: Robot (obrněný/mechanický) → Bulwark, Zombie (temný/přízračný)
// → Onyx, zbylé dvě lidské postavy → Pyra/Volt. Barevná identita
// postavy (aura záře za figurkou, barva jisker) zůstala přesně tam,
// kde byla i u SVG — na PALETY níž, ne na obrázku samotném — takže
// appka nemusí (a nezkouší) přebarvovat hotový sprite filtrem, jen
// mu podkládá stejně barevnou záři jako dřív.
//
// Soubory appka stáhla a nahrála sama pod public/souboj/postavy/
// <postavaId>/<poza>.png (~8 KB/soubor, 32 souborů celkem, ~300 kB) —
// vyloučené z instalační precache (vite.config.ts's globIgnores),
// dotahují se líně přes CacheFirst při prvním otevření Souboje, stejná
// disciplína jako mediapipe/**, mapa-sveta.jpg a postavy/** pro RPG.
// ==========================================

const PALETY: Record<PostavaId, PaletaPostavy> = {
  pyra: { akcent: '#fed7aa', aura: 'rgba(249, 115, 22, 0.55)' },
  bulwark: { akcent: '#e2e8f0', aura: 'rgba(59, 130, 246, 0.45)' },
  volt: { akcent: '#fef9c3', aura: 'rgba(250, 204, 21, 0.55)' },
  onyx: { akcent: '#c4b5fd', aura: 'rgba(139, 92, 246, 0.5)' },
}

/** Osmé kolo vylepšení — jedna sdílená "prestižní" zlatá záře pro
 *  všechny čtyři postavy (viz kosmetika.ts's vlastní komentář, proč
 *  jedna sdílená místo čtyř bespoke). U SVG appka přebarvovala celou
 *  paletu těla; skutečnou grafiku appka nepřebarvuje pixel po pixelu
 *  (riziko zašpiněného výsledku u hotového art assetu) — 'zlata'
 *  varianta místo toho položí přes sprite jemný sépiový/zlatý CSS
 *  filtr (viz FILTR_ZLATA níž) a vymění záři za tuhle. Postavu pořád
 *  pozná podle siluety/postoje (sprite se dál vybírá podle postavaId),
 *  jen s teplejším, kovovým nádechem navrch. */
const AURA_ZLATA = 'rgba(251, 191, 36, 0.6)'
const FILTR_ZLATA = 'sepia(0.85) saturate(2.4) hue-rotate(-8deg) brightness(0.95)'

/** Desáté kolo vylepšení — barva jisker při zásahu (Jiskry.tsx) podle
 *  ÚTOČNÍKOVY postavy/elementu, ne jedna univerzální bílá. Schválně
 *  vždycky ZÁKLADNÍ paleta, ne zlatá záře — zlatá je jen kosmetický
 *  přebal samotné postavičky, jiskry mají zůstat podle postavy/
 *  elementu bez ohledu na zapnutou variantu. */
export const barvaAkcentuPostavy = (postavaId: PostavaId): string => PALETY[postavaId].akcent

/** Která pozovaná grafika (public/souboj/postavy/<id>/<soubor>.png)
 *  odpovídá aktuálnímu stavu bojovníka — jedna větev na skutečný stav
 *  enginu, `jeVitez` má přednost před vším (kolo skončilo výhrou),
 *  `jeChyt` jen jemně rozliší útok neblokovatelným chytem od
 *  obyčejného úderu/kopu (obojí je pořád `vizualniStav === 'utok'`). */
const vyberPozu = (vizualniStav: VizualniStavBojovnika | undefined, jeChyt: boolean, jeVitez: boolean): string => {
  if (jeVitez) return 'vitez'
  switch (vizualniStav) {
    case 'ko':
      return 'ko'
    case 'sraceny':
      return 'sraceny'
    case 'hitstun':
      return 'hitstun'
    case 'blok':
      return 'blok'
    case 'utok':
      return jeChyt ? 'utok-chyt' : 'utok'
    default:
      return 'idle'
  }
}

const PostavaGrafikaImpl: React.FC<Props> = ({
  postavaId,
  size = 72,
  animovana = false,
  className,
  varianta = 'vychozi',
  vizualniStav,
  jeChyt = false,
  jeVitez = false,
}) => {
  const p = PALETY[postavaId]
  const auraBarva = varianta === 'zlata' ? AURA_ZLATA : p.aura
  const poza = vyberPozu(vizualniStav, jeChyt, jeVitez)
  const vyska = Math.round((size * 128) / 96)

  return (
    <span
      className={`souboj-postava-obal ${animovana ? 'souboj-postava-obal--animovana' : ''} ${className ?? ''}`}
      style={{ width: size, height: vyska }}
    >
      <span
        className="souboj-postava-zar"
        style={{ background: `radial-gradient(circle, ${auraBarva} 0%, transparent 70%)` }}
        aria-hidden="true"
      />
      <img
        src={`/souboj/postavy/${postavaId}/${poza}.png`}
        alt=""
        aria-hidden="true"
        width={size}
        height={vyska}
        className="souboj-postava-svg"
        style={varianta === 'zlata' ? ({ '--souboj-postava-tint': FILTR_ZLATA } as React.CSSProperties) : undefined}
        draggable={false}
      />
    </span>
  )
}

/** Výkonová kontrola náročnosti Souboje — obě arény (SoubojArena2D/3D)
 *  vykreslují tuhle komponentu z rodiče, co volá setSoubojStav na
 *  KAŽDÝ herní tik (60×/s), i když se postavaId/size/varianta/póza
 *  bojovníka mezi tiky nejčastěji vůbec nemění — 2D aréna to bez
 *  memoizace přestavovala 2×/tik, 3D (dvě kamery × dva bojovníci) 4×/
 *  tik, čistě zbytečně. React.memo se shallow porovnáním primitiv ve
 *  Props stačí, ať appka tuhle práci dělá jen při skutečné změně. */
export const PostavaGrafika = React.memo(PostavaGrafikaImpl)
