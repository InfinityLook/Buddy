import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isSupabaseConfigured } from '@/core/supabase/client'
import { TvHost } from './components/TvHost'
import { Ovladac } from './components/Ovladac'
import { LocalniZapas } from './components/LocalniZapas'
import { Navod } from './components/Navod'
import { UvodniTutorial } from './components/UvodniTutorial'
import { Zebricek } from './components/Zebricek'
import { TurnajLokalni } from './components/TurnajLokalni'
import { RychlyStart } from './components/RychlyStart'
import { OnlineLobby } from './components/OnlineLobby'
import { jeTutorialZobrazen } from './tutorial'
import { precistKodZOdkazu } from './qrOdkaz'
import { odemkniZvuk } from './sound'
import './FightingModule.css'

// ==========================================
// Souboj — pracovní název, druhá hra v rozcestníku her
// (pages/games/GamesHubModule.tsx). TV<->telefon párování
// (network.ts), skutečná herní grafika a pravidla souboje
// (combat/engine.ts) i řada dalších režimů (žebříček proti botům,
// lokální turnaj, souboj na dálku) přibyly postupně přes všechny
// zdokumentované "kola vylepšení" v CLAUDE.md.
//
// Dvanácté kolo vylepšení přidalo tři věci na tuhle úvodní obrazovku:
// (1) úvodní tutorial (UvodniTutorial.tsx), zobrazený JEDNOU při
// úplně prvním otevření (tutorial.ts) PŘED čímkoli jiným; (2) QR
// párování — appka při startu přečte `?pripojit=` z adresy (qrOdkaz.ts,
// TvHost.tsx zakóduje stejnou hodnotu do QR obrázku) a rovnou skočí na
// ovladač s předvyplněným kódem, žádné ruční přepisování čtyř znaků;
// (3) "Rychlý start" — jedno tlačítko, co appka rovnou hodí do zápasu
// proti botovi s náhodnou postavou/arénou, žádný výběr navíc.
// ==========================================

type Role =
  | 'vyber'
  | 'tvOvladac'
  | 'tv'
  | 'ovladac'
  | 'lokalne'
  | 'navod'
  | 'rychlyStart'
  | 'zebricek'
  | 'turnaj'
  | 'online'

export const FightingModule: React.FC = () => {
  const navigate = useNavigate()
  const [role, setRole] = useState<Role>('vyber')
  const [tutorialHotovo, setTutorialHotovo] = useState(() => jeTutorialZobrazen())
  // QR párování — appka přečte parametr JEDNOU, hned při prvním
  // vykreslení, a hned potom ho z adresy odstraní (stejný "přečti a
  // ihned ukliď z URL" vzor jako SocialModule.tsx's `?kod=`), ať
  // obnovení stránky nebo návrat zpět neotevře appku na ovladači znovu.
  const [predvyplnenyKod] = useState(() => precistKodZOdkazu(window.location.search))

  useEffect(() => {
    if (!predvyplnenyKod) return
    window.history.replaceState({}, '', window.location.pathname)
    odemkniZvuk()
    setRole('ovladac')
  }, [predvyplnenyKod])

  if (!isSupabaseConfigured) {
    return (
      <div className="souboj-page">
        <header className="souboj-top-bar">
          <button className="souboj-back-btn" onClick={() => navigate('/hra')}>
            ← Zpět do her
          </button>
          <h1 className="souboj-title">Souboj</h1>
        </header>
        <p className="souboj-bez-cloudu">
          Tahle hra potřebuje připojení ke cloudu (spojuje telefon a TV přes síť) —
          v tomhle sestavení appky není nastavené.
        </p>
      </div>
    )
  }

  if (!tutorialHotovo) {
    return <UvodniTutorial onHotovo={() => setTutorialHotovo(true)} />
  }

  if (role === 'tv') return <TvHost onZpet={() => setRole('vyber')} />
  if (role === 'ovladac') return <Ovladac onZpet={() => setRole('vyber')} predvyplnenyKod={predvyplnenyKod ?? undefined} />
  if (role === 'lokalne') return <LocalniZapas onZpet={() => setRole('vyber')} />
  if (role === 'navod') return <Navod onZpet={() => setRole('vyber')} />
  if (role === 'zebricek') return <Zebricek onZpet={() => setRole('vyber')} />
  if (role === 'turnaj') return <TurnajLokalni onZpet={() => setRole('vyber')} />
  if (role === 'online') return <OnlineLobby onZpet={() => setRole('vyber')} />
  if (role === 'rychlyStart') return <RychlyStart onZpet={() => setRole('vyber')} />

  if (role === 'tvOvladac') {
    return (
      <div className="souboj-page">
        <header className="souboj-top-bar">
          <button className="souboj-back-btn" onClick={() => setRole('vyber')}>
            ← Zpět
          </button>
          <h1 className="souboj-title">TV a ovladač</h1>
        </header>
        <p className="souboj-sub">
          Jedno zařízení je obrazovka u televize, druhé ovladač v ruce — vyber, čím bude TOHLE zařízení.
        </p>

        <div className="souboj-vyber">
          <button
            className="souboj-volba"
            onClick={() => {
              // Vylepšení — zvuk (sound.ts) potřebuje AudioContext
              // odemčený uvnitř SKUTEČNÉHO gesta uživatele, jinak by ho
              // prohlížeč odmítl. Tohle je nejzazší bod, kde appka ještě
              // ví, že se chystá TV režim (a tedy bude chtít hrát zvuk) —
              // TvHost.tsx sám žádné vlastní kliknutí "spustit zápas"
              // nemá, zápas začíná automaticky, jakmile se připojí druhý
              // hráč.
              odemkniZvuk()
              setRole('tv')
            }}
          >
            <span className="souboj-volba-ikona" aria-hidden="true">📺</span>
            <span className="souboj-volba-text">
              <span className="souboj-volba-nazev">Hostovat na TV</span>
              <span className="souboj-volba-popis">
                Tohle zařízení ukáže hru — otevři na obrazovce u televize.
              </span>
            </span>
          </button>

          <button className="souboj-volba" onClick={() => setRole('ovladac')}>
            <span className="souboj-volba-ikona" aria-hidden="true">🎮</span>
            <span className="souboj-volba-text">
              <span className="souboj-volba-nazev">Připojit se jako ovladač</span>
              <span className="souboj-volba-popis">Telefon se změní na joystick a tlačítka.</span>
            </span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="souboj-page">
      <header className="souboj-top-bar">
        <button className="souboj-back-btn" onClick={() => navigate('/hra')}>
          ← Zpět do her
        </button>
      </header>

      {/* Jedenácté kolo vylepšení — vlastní titulní obrazovka místo
          holého textového nadpisu. Appka pořád nemá žádnou skutečnou
          grafickou identitu (žádný art pipeline pro tuhle hru, viz
          CLAUDE.md) — logo je proto stylizovaný text (gradient +
          souboj-logo-jiskra dekorace), ne obrázek, stejná "poctivě
          přiznaný, ne fingovaný" disciplína jako všude jinde v tomhle
          souboru, kde na skutečné assety nedošlo. */}
      <div className="souboj-titul" aria-label="Souboj">
        <span className="souboj-logo-jiskra souboj-logo-jiskra--1" aria-hidden="true" />
        <h1 className="souboj-logo">SOUBOJ</h1>
        <span className="souboj-logo-jiskra souboj-logo-jiskra--2" aria-hidden="true" />
      </div>

      {/* Dvanácté kolo vylepšení — Rychlý start, samostatně nahoře,
          jediné tlačítko, co appku rovnou hodí do rozehřátého zápasu
          bez jediné volby navíc. */}
      <button
        type="button"
        className="souboj-volba souboj-volba--rychly"
        onClick={() => {
          odemkniZvuk()
          setRole('rychlyStart')
        }}
      >
        <span className="souboj-volba-ikona" aria-hidden="true">⚡</span>
        <span className="souboj-volba-text">
          <span className="souboj-volba-nazev">Rychlý start</span>
          <span className="souboj-volba-popis">Okamžitý zápas proti počítači, náhodná postava i aréna.</span>
        </span>
      </button>

      <div className="souboj-vyber">
        {/* Šestnácté kolo vylepšení — "Hostovat na TV" a "Připojit se
            jako ovladač" bývaly dvě samostatné položky rovnou tady,
            přestože jde o dvě role JEDNÉ a TÉŽE herní sestavy (jedno
            zařízení obrazovka, druhé ovladač) — appka je teď sloučila
            do jednoho vstupu, co otevře malou podnabídku (role
            'tvOvladac' výš) s přesně těma dvěma tlačítky beze změny.
            Menu tak má o jednu položku míň, aniž by appka cokoli
            skutečně smazala. */}
        <button className="souboj-volba" onClick={() => setRole('tvOvladac')}>
          <span className="souboj-volba-ikona" aria-hidden="true">📺</span>
          <span className="souboj-volba-text">
            <span className="souboj-volba-nazev">TV a ovladač</span>
            <span className="souboj-volba-popis">
              Jedno zařízení hostuje na TV, druhé se připojí jako ovladač.
            </span>
          </span>
        </button>

        <button
          className="souboj-volba"
          onClick={() => {
            // Stejný důvod jako u "Hostovat na TV" výš — lokální zápas
            // taky hraje zvuk přímo z tohohle zařízení, potřebuje tedy
            // odemčený AudioContext ze stejného skutečného gesta.
            odemkniZvuk()
            setRole('lokalne')
          }}
        >
          <span className="souboj-volba-ikona" aria-hidden="true">🤝</span>
          <span className="souboj-volba-text">
            <span className="souboj-volba-nazev">Hrát lokálně (jedno zařízení)</span>
            <span className="souboj-volba-popis">
              Bez TV a druhého telefonu — oba hráči sdílí tohle zařízení.
            </span>
          </span>
        </button>

        {/* Dvanácté kolo vylepšení — Žebříček proti botům. */}
        <button
          className="souboj-volba"
          onClick={() => {
            odemkniZvuk()
            setRole('zebricek')
          }}
        >
          <span className="souboj-volba-ikona" aria-hidden="true">🏆</span>
          <span className="souboj-volba-text">
            <span className="souboj-volba-nazev">Žebříček proti botům</span>
            <span className="souboj-volba-popis">Poraz co nejvíc soupeřů v řadě, obtížnost roste s každou vlnou.</span>
          </span>
        </button>

        {/* Dvanácté kolo vylepšení — lokální turnaj "vítěz zůstává". */}
        <button
          className="souboj-volba"
          onClick={() => {
            odemkniZvuk()
            setRole('turnaj')
          }}
        >
          <span className="souboj-volba-ikona" aria-hidden="true">👑</span>
          <span className="souboj-volba-text">
            <span className="souboj-volba-nazev">Turnaj (3 a víc hráčů)</span>
            <span className="souboj-volba-popis">Vítěz zůstává, další vyzyvatel nastupuje — na jednom zařízení.</span>
          </span>
        </button>

        {/* Dvanácté kolo vylepšení — online matchmaking. */}
        <button
          className="souboj-volba"
          onClick={() => {
            odemkniZvuk()
            setRole('online')
          }}
        >
          <span className="souboj-volba-ikona" aria-hidden="true">🌐</span>
          <span className="souboj-volba-text">
            <span className="souboj-volba-nazev">Hrát online</span>
            <span className="souboj-volba-popis">Najdi si náhodného soupeře — každý na vlastním telefonu.</span>
          </span>
        </button>
      </div>

      {/* Jedenácté kolo vylepšení — movelist/tutorial (viz Navod.tsx),
          samostatné tlačítko mimo souboj-vyber's role — otevření
          návodu není "role", je to jen čtení, žádné síťové/lokální
          rozhodnutí. */}
      <button type="button" className="souboj-navod-btn" onClick={() => setRole('navod')}>
        📖 Návod — postavy, arény, techniky
      </button>
    </div>
  )
}

export default FightingModule
