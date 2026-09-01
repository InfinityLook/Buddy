import React, { Suspense, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TvorbaPostavy } from './components/TvorbaPostavy'
import { VyberPostavy } from './components/VyberPostavy'
import { MapaSveta } from './components/MapaSveta'
import { Souboj } from './components/Souboj'
import { Obchod } from './components/Obchod'
import { Hrdina } from './components/Hrdina'
import { Questy } from './components/Questy'
import { Inventar } from './components/Inventar'
import { StoryDialog } from './components/StoryDialog'
import { useGameCharacter } from './useGameCharacter'
import { useQuestStore } from './useQuestStore'
import { POSTAVY } from './postavy'
import { Postava, PostavaId } from './types'
import { NEPRATELE_PODLE_LOKACE } from './combat/nepratele'
import { BOJOVY_CIL_PODLE_LOKACE, QUESTS } from './data/quests'
import { STORY } from './data/story'
import { LOKACE } from './lokace'
import './GameModule.css'

// 3D průzkum táhne three.js (viz explorace/usePlayerWorld.ts) — lazy,
// stejný důvod a stejný vzor jako u SocialModule/GameModule samotného
// v App.tsx: ať tu váhu zaplatí jen hráč, který doopravdy vstoupí do
// nějaké 'explorace' lokace, ne každý, kdo jen otevře /hra.
const Explorace3D = React.lazy(() =>
  import('./components/Explorace3D').then((m) => ({ default: m.Explorace3D }))
)

// ==========================================
// Herní hub — vstupní bod za tlačítkem Play v Hubu.
//
// Party (vytvořené postavy) se pamatuje trvale přes useGameCharacter;
// KDO se hraje tuhle návštěvu je čistě lokální React state tady dole —
// nepersistuje se, takže appka se ptá znovu při každém vstupu do /hra,
// přesně jak to má být ("vyzkoušej si víc postav").
//
// Stavy:
//  1) prázdná party      -> TvorbaPostavy (první postava)
//  2) party, nic zvoleno, rezim 'pridat' -> TvorbaPostavy (další postava)
//  3) party, nic zvoleno, rezim 'vyber'  -> VyberPostavy (za koho hrát)
//  4) zvoleno + souboj    -> Souboj
//  5) zvoleno + story      -> StoryDialog (jen po výhře, co dokončila quest)
//  6) zvoleno + obchod    -> Obchod
//  7) zvoleno + hrdina    -> Hrdina (postava, statistiky, vylepšení, dovednosti)
//  8) zvoleno + questy     -> Questy (quest log, viz Questy.tsx)
//  9) zvoleno + batoh      -> Inventar (loot, viz Inventar.tsx)
// 10) zvoleno + průzkum    -> Explorace3D (3D svět, viz níž)
// 11) zvoleno              -> MapaSveta
//
// Herní smyčka MAPA → LOKACE → 3D SVĚT → PRŮZKUM → SETKÁNÍ → SOUBOJ →
// ODMĚNA → QUEST SPLNĚN → XP → STORY → ZPĚT NA MAPU: MapaSveta u
// 'explorace' lokací (viz lokace.ts) nabízí "Vstoupit do světa" místo
// rovnou boje — teprve Explorace3D.onSetkani (hráč došel k nepříteli
// ve 3D světě) nastaví soubojLokaceId, který odsud dál běží úplně
// stejně jako soubojová/dungeonová lokace vždycky běžela. Výhra navíc
// přes BOJOVY_CIL_PODLE_LOKACE splní odpovídající cíl questu (viz
// useQuestStore.ts — quest se dokončí sám, jakmile jsou splněné
// všechny jeho cíle) a `splnitCil` vrátí true právě tehdy, když to byl
// poslední cíl — jen pak se spustí `dialogPriDokonceni` (Story krok).
// ==========================================

type Rezim = 'vyber' | 'pridat'

export const GameModule: React.FC = () => {
  const navigate = useNavigate()
  const postavyId = useGameCharacter((s) => s.postavy)
  const vytvoritPostavu = useGameCharacter((s) => s.vytvoritPostavu)
  const smazatPostavu = useGameCharacter((s) => s.smazatPostavu)

  const [rezim, setRezim] = useState<Rezim>('vyber')
  const [hrajeJako, setHrajeJako] = useState<PostavaId | null>(null)
  const [soubojLokaceId, setSoubojLokaceId] = useState<string | null>(null)
  const [obchodOtevren, setObchodOtevren] = useState(false)
  const [hrdinaOtevren, setHrdinaOtevren] = useState(false)
  const [questyOtevreny, setQuestyOtevreny] = useState(false)
  const [inventarOtevren, setInventarOtevren] = useState(false)
  const [exploraceLokaceId, setExploraceLokaceId] = useState<string | null>(null)
  const [storyId, setStoryId] = useState<string | null>(null)
  const splnitCil = useQuestStore((s) => s.splnitCil)

  const party = postavyId
    .map((id) => POSTAVY.find((p) => p.id === id))
    .filter((p): p is Postava => !!p)

  // 1) Prázdná party — tvorba první postavy
  if (party.length === 0) {
    return (
      <TvorbaPostavy
        dostupnePostavy={POSTAVY}
        nadpis="Vyber si postavu"
        podnadpis="Posuň karty stranou a vyber si první postavu — později můžeš vytvořit další a přepínat mezi nimi."
        zpetText="Zpět do her"
        onZpet={() => navigate('/hra')}
        onVytvoreno={(id) => {
          vytvoritPostavu(id)
          setHrajeJako(id)
        }}
      />
    )
  }

  const aktivniPostava = hrajeJako ? POSTAVY.find((p) => p.id === hrajeJako) : undefined
  const nepratele = soubojLokaceId ? NEPRATELE_PODLE_LOKACE[soubojLokaceId] : undefined
  const lokaceSouboje = soubojLokaceId ? LOKACE.find((l) => l.id === soubojLokaceId) : undefined

  // 4) Souboj má přednost, dokud probíhá — ať se do něj vstoupilo
  // rovnou z pinu (aréna/dungeon), nebo přes setkání v 3D průzkumu
  // (viz Explorace3D.onSetkani níž). Odchod proto zavírá i případně
  // otevřený průzkum, ať se hráč po souboji vrátí na mapu, ne zpátky
  // do 3D světa.
  const bojovyCilSouboje = soubojLokaceId ? BOJOVY_CIL_PODLE_LOKACE[soubojLokaceId] : undefined
  if (aktivniPostava && nepratele) {
    return (
      <Souboj
        postava={aktivniPostava}
        nepratele={nepratele}
        nazevMista={lokaceSouboje?.nazev ?? ''}
        ikonaMista={lokaceSouboje?.ikona ?? '🗡️'}
        onOdejit={() => {
          setSoubojLokaceId(null)
          setExploraceLokaceId(null)
        }}
        onVyhra={
          bojovyCilSouboje
            ? () => {
                const dokonceno = splnitCil(bojovyCilSouboje.questId, bojovyCilSouboje.cilId)
                if (!dokonceno) return
                const dokoncenyQuest = QUESTS.find((q) => q.id === bojovyCilSouboje.questId)
                if (dokoncenyQuest?.dialogPriDokonceni) setStoryId(dokoncenyQuest.dialogPriDokonceni)
              }
            : undefined
        }
      />
    )
  }

  // 5) Story má přednost, dokud je nastavený — nastaví se jen výhrou,
  // co dokončila quest (viz onVyhra výš), takže se zobrazí přesně
  // jednou, mezi opuštěním souboje a návratem na mapu.
  if (aktivniPostava && storyId) {
    return <StoryDialog sekvence={STORY[storyId]} postava={aktivniPostava} onDokonceno={() => setStoryId(null)} />
  }

  // 6) Obchod má přednost, dokud je otevřený
  if (aktivniPostava && obchodOtevren) {
    return <Obchod postava={aktivniPostava} onOdejit={() => setObchodOtevren(false)} />
  }

  // 7) Hrdina má přednost, dokud je otevřený (obchod nad ním má
  // přednost — viz krok 6 výš — takže "Otevřít tržiště" v sekci
  // Vylepšení nechá hrdinaOtevren beze změny a po zavření obchodu se
  // uživatel vrátí zpátky sem, ne rovnou na mapu).
  if (aktivniPostava && hrdinaOtevren) {
    return (
      <Hrdina
        postava={aktivniPostava}
        onOdejit={() => setHrdinaOtevren(false)}
        onOtevritObchod={() => setObchodOtevren(true)}
      />
    )
  }

  // 8) Questy mají přednost, dokud jsou otevřené
  if (aktivniPostava && questyOtevreny) {
    return <Questy onOdejit={() => setQuestyOtevreny(false)} />
  }

  // 9) Batoh má přednost, dokud je otevřený
  if (aktivniPostava && inventarOtevren) {
    return <Inventar onOdejit={() => setInventarOtevren(false)} />
  }

  // 10) Průzkum má přednost, dokud probíhá — jen tady se odblokuje
  // setSoubojLokaceId, které pak výš (krok 4) na dalším renderu
  // přepne na Souboj, aniž by Explorace3D o Souboj.tsx cokoli vědělo.
  const lokaceExplorace = exploraceLokaceId ? LOKACE.find((l) => l.id === exploraceLokaceId) : undefined
  if (aktivniPostava && lokaceExplorace) {
    return (
      <Suspense fallback={<div className="game-lazy-fallback">Načítám 3D svět…</div>}>
        <Explorace3D
          postava={aktivniPostava}
          lokace={lokaceExplorace}
          onSetkani={() => setSoubojLokaceId(exploraceLokaceId)}
          onOdejit={() => setExploraceLokaceId(null)}
        />
      </Suspense>
    )
  }

  // 11) Zvoleno, za koho se hraje — mapa
  if (aktivniPostava) {
    return (
      <MapaSveta
        postava={aktivniPostava}
        onVstoupitDoBoje={setSoubojLokaceId}
        onVstoupitDoObchodu={() => setObchodOtevren(true)}
        onVstoupitDoSveta={setExploraceLokaceId}
        onOtevritHrdinu={() => setHrdinaOtevren(true)}
        onOtevritQuesty={() => setQuestyOtevreny(true)}
        onOtevritInventar={() => setInventarOtevren(true)}
      />
    )
  }

  // 2) Přidávání další postavy do party
  if (rezim === 'pridat') {
    const zbyvajici = POSTAVY.filter((p) => !postavyId.includes(p.id))
    return (
      <TvorbaPostavy
        dostupnePostavy={zbyvajici}
        nadpis="Přidat postavu"
        podnadpis="Posuň karty stranou a vyber další postavu, kterou chceš mít po ruce."
        zpetText="Zpět na výběr"
        onZpet={() => setRezim('vyber')}
        onVytvoreno={(id) => {
          vytvoritPostavu(id)
          setRezim('vyber')
        }}
      />
    )
  }

  // 3) Výběr, za koho se hraje tahle návštěva
  return (
    <VyberPostavy
      postavy={party}
      mozneVytvoritDalsi={postavyId.length < POSTAVY.length}
      onZvolit={setHrajeJako}
      onSmazat={smazatPostavu}
      onPridatDalsi={() => setRezim('pridat')}
    />
  )
}

export default GameModule
