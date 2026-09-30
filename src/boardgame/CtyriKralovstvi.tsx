import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CENA_RIZIKA,
  Hrac,
  HraStav,
  KRALOVSTVI,
  KralovstviId,
  MAX_HRACU,
  MIN_HRACU,
  POCET_POLI,
  POZICE_TRUNU,
  TYPY_POLI,
  TypPole,
  hodKostkou,
  konecneProadi,
  skoreHrace,
  vytvorHrace,
  vytvorHruStav,
} from './ctyriKralovstviTypes'
import './CtyriKralovstvi.css'

// ==========================================
// Čtyři království — "Souboj o trůn". Appka staví jen na jednom
// zařízení (appka to tak i popisuje v GamesHubModule.tsx — pass-and-
// -play mezi lidmi u jednoho telefonu/tabletu, žádná síť), stejně
// jako Buddyho Trh vedle ní ve stejné složce.
//
// Appka záměrně NEDÁVÁ za odehranou hru žádné XP — appka nemá jak
// poznat, jestli za jedním zařízením sedí čtyři skuteční kamarádi
// nebo jeden člověk, co si "hraje" sám za všechna čtyři království,
// stejná úvaha, co Souboj používá pro svůj vlastní lokální režim
// (LocalniZapas.tsx) a co Buddyho Trh ve stejné složce potvrzuje tím,
// že žádné volání recordAction/addXp nikde nemá.
//
// Grafika: appka nemá nástroj na generování obrázků, takže appka
// použila skutečné volné assety ze stejného Kenney zrcadla
// (github.com/shorepine/kenney, CC0), co appka poprvé použila na
// postavy v Souboji — figurky/hrady ze sady "Boardgame Pack" (barevné
// verze přesně pro čtyři barvy království) a kostky/korunu ze sady
// "Board Game Icons" (bílé ikony, appka je nechává bílé — hodí se na
// appčino tmavé pozadí bez přebarvování).
// ==========================================

type Krok = 'nastaveni' | 'hra'

interface Sedadlo {
  jeBot: boolean
  jmeno: string
}

const BARVA_PODLE_KRALOVSTVI: Record<KralovstviId, string> = {
  ohnive: 'red',
  vodni: 'blue',
  lesni: 'green',
  pousti: 'yellow',
}

const ikonaPole = (typ: TypPole): string => {
  switch (typ) {
    case 'zlato':
      return '🪙'
    case 'drahokam':
      return '💎'
    case 'osud':
      return '🎴'
    default:
      return ''
  }
}

const vytvorSedadla = (pocet: number): Sedadlo[] =>
  Array.from({ length: pocet }, (_, i) => ({ jeBot: i > 0, jmeno: '' }))

// Deska bývala jeden vodorovný pás zabalený přes flex-wrap — přesně to
// hráč popsal jako "nudné". Appka místo toho pole rozestaví do
// hadovité (serpentinové) cesty přes CSS Grid, stejný vzor, jaký
// běžné deskové hry (Had a žebřík, Candy Land) používají — 4 sloupce,
// řádky se střídavě čtou zleva doprava a zprava doleva, takže sousední
// pole (i a i+1) mají VŽDY buď stejný řádek (vodorovná cesta), nebo
// stejný sloupec na hranici řádků (svislá "zatáčka"). Appka to počítá,
// ne generuje náhodně — TYPY_POLI zůstává to samé pevné pole, jen se
// jinak rozmístí na desce.
const CK_SLOUPCU = 4
const CK_RADKU = Math.ceil(POCET_POLI / CK_SLOUPCU)

/** Grid pozice pole s indexem 0..POCET_POLI-1 — sudý řádek jde zleva
 *  doprava, lichý zprava doleva, ať navazující pole na konci/začátku
 *  řádku vždycky sedí ve stejném sloupci (proto appka dole umí
 *  zatáčku nakreslit jedním svislým pruhem, ne zvlášť pro každé pole). */
const pozicePole = (index: number): { gridRow: number; gridColumn: number } => {
  const radek = Math.floor(index / CK_SLOUPCU)
  const vRadku = index % CK_SLOUPCU
  const sloupec = radek % 2 === 0 ? vRadku : CK_SLOUPCU - 1 - vRadku
  return { gridRow: radek + 1, gridColumn: sloupec + 1 }
}

/** Jedna svislá "zatáčka" cesty za každý řádek — poslední spojuje
 *  poslední pole s trůnem, co appka kreslí jako vlastní, širší řádek
 *  hned pod nimi. Sloupec zatáčky appka nedostává z pozicePole (to by
 *  vyžadovalo znát poslední pole KAŽDÉHO řádku zvlášť) — odvozuje ho
 *  přímo ze stejné sudý/lichý logiky, protože se s ní vždycky shoduje. */
const CK_ZATACKY = Array.from({ length: CK_RADKU }, (_, radek) => ({
  gridRow: `${radek + 1} / span 2`,
  gridColumn: radek % 2 === 0 ? CK_SLOUPCU : 1,
}))

export const CtyriKralovstvi = () => {
  const navigate = useNavigate()
  const [krok, setKrok] = useState<Krok>('nastaveni')
  const [sedadla, setSedadla] = useState<Sedadlo[]>(() => vytvorSedadla(4))
  const [stav, setStav] = useState<HraStav | null>(null)
  const [riskovat, setRiskovat] = useState(false)
  const botTimeoutRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (botTimeoutRef.current !== null) window.clearTimeout(botTimeoutRef.current)
    },
    []
  )

  const zmenPocetSedadel = (novyPocet: number) => {
    setSedadla((stara) => {
      if (novyPocet <= stara.length) return stara.slice(0, novyPocet)
      return [...stara, ...vytvorSedadla(novyPocet - stara.length).map((s) => ({ ...s, jeBot: true }))]
    })
  }

  const spustitHru = () => {
    const hraci: Hrac[] = sedadla.map((sedadlo, i) => {
      const kralovstvi = KRALOVSTVI[i]
      const jmeno = sedadlo.jmeno.trim() || (sedadlo.jeBot ? `Bot (${kralovstvi.nazev})` : kralovstvi.nazev)
      return vytvorHrace(`hrac-${i}`, jmeno, kralovstvi.id, sedadlo.jeBot)
    })
    setStav(vytvorHruStav(hraci))
    setKrok('hra')
  }

  const novaHra = () => {
    if (botTimeoutRef.current !== null) window.clearTimeout(botTimeoutRef.current)
    setStav(null)
    setKrok('nastaveni')
  }

  const aktivniHrac = stav && stav.faze === 'hod' ? stav.hraci[stav.aktivniIndex] : null

  // Bota appka nechá hrát samo, po krátké pauze — stejný vzor jako
  // Deska.tsx u Buddyho Trhu, ať se boti neprovalí okamžitě a appka
  // dá lidem čas si přečíst, co se právě stalo.
  useEffect(() => {
    if (!stav || stav.faze !== 'hod') return
    const hrac = stav.hraci[stav.aktivniIndex]
    if (!hrac?.jeBot) return
    botTimeoutRef.current = window.setTimeout(() => {
      setStav((s) => (s ? hodKostkou(s, Math.random, false) : s))
    }, 900)
    return () => {
      if (botTimeoutRef.current !== null) window.clearTimeout(botTimeoutRef.current)
    }
  }, [stav])

  if (krok === 'nastaveni') {
    return (
      <main className="ck-page">
        <header className="ck-header">
          <button className="ck-back" onClick={() => navigate('/hra')}>
            ← Zpět ke hrám
          </button>
          <div>
            <p className="ck-kicker">BUDDYZONE · DESKOVÉ HRY</p>
            <h1>Čtyři království</h1>
            <p className="ck-podnadpis">
              Souboj o trůn — čtyři rody, jedna cesta. Sbírej zlato a drahokamy, dorazi k trůnu jako první pro bonus,
              ale vyhrává ten, kdo má na konci nejvíc bodů.
            </p>
          </div>
        </header>

        <section className="ck-nastaveni">
          <div className="ck-nastaveni-radek">
            <span>Počet království</span>
            <div className="ck-stepper">
              <button
                onClick={() => zmenPocetSedadel(Math.max(MIN_HRACU, sedadla.length - 1))}
                disabled={sedadla.length <= MIN_HRACU}
              >
                −
              </button>
              <strong>{sedadla.length}</strong>
              <button
                onClick={() => zmenPocetSedadel(Math.min(MAX_HRACU, sedadla.length + 1))}
                disabled={sedadla.length >= MAX_HRACU}
              >
                +
              </button>
            </div>
          </div>

          {sedadla.map((sedadlo, i) => {
            const kralovstvi = KRALOVSTVI[i]
            const barva = BARVA_PODLE_KRALOVSTVI[kralovstvi.id]
            return (
              <div className="ck-sedadlo" key={kralovstvi.id}>
                <img className="ck-sedadlo-ikona" src={`/deskova-hra/hrad-${barva}.png`} alt="" aria-hidden="true" />
                <div className="ck-sedadlo-text">
                  <strong style={{ color: kralovstvi.barva }}>
                    {kralovstvi.emoji} {kralovstvi.nazev}
                  </strong>
                  <input
                    type="text"
                    placeholder={sedadlo.jeBot ? 'Bot' : 'Tvoje jméno'}
                    value={sedadlo.jmeno}
                    disabled={sedadlo.jeBot}
                    onChange={(e) => {
                      const hodnota = e.target.value
                      setSedadla((s) => s.map((x, idx) => (idx === i ? { ...x, jmeno: hodnota } : x)))
                    }}
                  />
                </div>
                <button
                  className={`ck-typ-btn ${sedadlo.jeBot ? 'je-bot' : 'je-clovek'}`}
                  onClick={() =>
                    setSedadla((s) => s.map((x, idx) => (idx === i ? { ...x, jeBot: !x.jeBot } : x)))
                  }
                >
                  {sedadlo.jeBot ? '🤖 Bot' : '🧑 Člověk'}
                </button>
              </div>
            )
          })}

          <button className="ck-spustit-btn" onClick={spustitHru}>
            ▶ Spustit hru
          </button>
        </section>
      </main>
    )
  }

  if (!stav) return null

  if (stav.faze === 'konec') {
    const proradi = konecneProadi(stav.hraci)
    return (
      <main className="ck-page">
        <header className="ck-header">
          <button className="ck-back" onClick={() => navigate('/hra')}>
            ← Zpět ke hrám
          </button>
          <div>
            <p className="ck-kicker">BUDDYZONE · DESKOVÉ HRY</p>
            <h1>Hra skončila</h1>
          </div>
        </header>

        <section className="ck-konec">
          <img className="ck-konec-koruna" src="/deskova-hra/koruna.png" alt="Koruna" />
          <h2>
            {KRALOVSTVI.find((k) => k.id === proradi[0].kralovstviId)?.emoji} {proradi[0].jmeno} vyhrává!
          </h2>
          <div className="ck-vysledky">
            {proradi.map((hrac, poradi) => {
              const kralovstvi = KRALOVSTVI.find((k) => k.id === hrac.kralovstviId)!
              return (
                <div className={`ck-vysledek-radek ${poradi === 0 ? 'je-vitez' : ''}`} key={hrac.id}>
                  <span className="ck-vysledek-poradi">{poradi + 1}.</span>
                  <img
                    className="ck-vysledek-token"
                    src={`/deskova-hra/token-${BARVA_PODLE_KRALOVSTVI[kralovstvi.id]}.png`}
                    alt=""
                    aria-hidden="true"
                  />
                  <span className="ck-vysledek-jmeno" style={{ color: kralovstvi.barva }}>
                    {hrac.jmeno}
                    {hrac.jeBot && ' (bot)'}
                  </span>
                  <span className="ck-vysledek-detail">
                    🪙 {hrac.zlato} · 💎 {hrac.drahokamy}
                    {hrac.jeUchazecOTrun && ' · 👑 nárok na trůn'}
                  </span>
                  <strong className="ck-vysledek-skore">{skoreHrace(hrac)} b.</strong>
                </div>
              )
            })}
          </div>
          <button className="ck-spustit-btn" onClick={novaHra}>
            Nová hra
          </button>
        </section>
      </main>
    )
  }

  const muzeRiskovat = !!aktivniHrac && !aktivniHrac.jeBot && aktivniHrac.zlato >= CENA_RIZIKA

  return (
    <main className="ck-page">
      <header className="ck-header">
        <button className="ck-back" onClick={() => navigate('/hra')}>
          ← Zpět ke hrám
        </button>
        <div>
          <p className="ck-kicker">SOUBOJ O TRŮN</p>
          <h1>Čtyři království</h1>
        </div>
        <button className="ck-reset" onClick={novaHra}>
          Nová hra
        </button>
      </header>

      <section className="ck-content">
        <div className="ck-cesta-obal">
          <p className="ck-cesta-legenda">🏁 Start vlevo nahoře — cesta se kroutí až dolů k 👑 trůnu.</p>
          <div
            className="ck-cesta"
            aria-label="Cesta ke trůnu"
            style={{ gridTemplateColumns: `repeat(${CK_SLOUPCU}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: CK_RADKU }, (_, radek) => (
              <div key={`trasa-${radek}`} className="ck-trasa-radek" style={{ gridRow: radek + 1 }} aria-hidden="true" />
            ))}
            {CK_ZATACKY.map((zatacka, i) => (
              <div key={`zatacka-${i}`} className="ck-trasa-zatacka" style={zatacka} aria-hidden="true" />
            ))}

            {TYPY_POLI.map((typ, i) => {
              const cisloPole = i + 1
              const hraciNaPoli = stav.hraci.filter((h) => h.pozice === cisloPole)
              const { gridRow, gridColumn } = pozicePole(i)
              return (
                <div className={`ck-pole ck-pole--${typ}`} style={{ gridRow, gridColumn }} key={cisloPole}>
                  <span className="ck-pole-cislo">{cisloPole}</span>
                  <span className="ck-pole-ikona" aria-hidden="true">
                    {ikonaPole(typ)}
                  </span>
                  <div className="ck-pole-tokeny">
                    {hraciNaPoli.map((h) => (
                      <img
                        key={h.id}
                        className="ck-token"
                        src={`/deskova-hra/token-${BARVA_PODLE_KRALOVSTVI[h.kralovstviId]}.png`}
                        title={h.jmeno}
                        alt={h.jmeno}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
            <div className="ck-pole ck-pole--trun" style={{ gridRow: CK_RADKU + 1 }}>
              <span className="ck-pole-ikona ck-pole-ikona--trun" aria-hidden="true">
                <img src="/deskova-hra/koruna.png" alt="" />
              </span>
              <span className="ck-pole-cislo ck-pole-cislo--trun">Trůn</span>
              <div className="ck-pole-tokeny">
                {stav.hraci
                  .filter((h) => h.pozice === POZICE_TRUNU)
                  .map((h) => (
                    <img
                      key={h.id}
                      className="ck-token"
                      src={`/deskova-hra/token-${BARVA_PODLE_KRALOVSTVI[h.kralovstviId]}.png`}
                      title={h.jmeno}
                      alt={h.jmeno}
                    />
                  ))}
              </div>
            </div>
          </div>
        </div>

        <aside className="ck-panel">
          {aktivniHrac && (
            <div className="ck-tah">
              <span>Na tahu je</span>
              <strong style={{ color: KRALOVSTVI.find((k) => k.id === aktivniHrac.kralovstviId)?.barva }}>
                {aktivniHrac.jmeno}
                {aktivniHrac.jeBot && ' (bot)'}
              </strong>
            </div>
          )}

          {aktivniHrac && !aktivniHrac.jeBot && (
            <>
              <label className="ck-riziko-toggle">
                <input
                  type="checkbox"
                  checked={riskovat}
                  disabled={!muzeRiskovat}
                  onChange={(e) => setRiskovat(e.target.checked)}
                />
                Riskovat (−1 🪙, hoď 2 kostkami a vezmi vyšší)
              </label>
              <button
                className="ck-roll-btn"
                onClick={() => {
                  setStav((s) => (s ? hodKostkou(s, Math.random, riskovat) : s))
                  setRiskovat(false)
                }}
              >
                🎲 Hodit kostkou
              </button>
            </>
          )}

          {stav.posledniHod !== null && (
            <img
              className="ck-posledni-kostka"
              src={`/deskova-hra/kostka-${stav.posledniHod}.png`}
              alt={`Poslední hod: ${stav.posledniHod}`}
            />
          )}

          {stav.posledniUdalost && <p className="ck-udalost">{stav.posledniUdalost}</p>}

          <div className="ck-hraci">
            {stav.hraci.map((h, i) => {
              const kralovstvi = KRALOVSTVI.find((k) => k.id === h.kralovstviId)!
              return (
                <div className={`ck-hrac-radek ${i === stav.aktivniIndex ? 'je-aktivni' : ''}`} key={h.id}>
                  <img
                    className="ck-hrac-token"
                    src={`/deskova-hra/token-${BARVA_PODLE_KRALOVSTVI[kralovstvi.id]}.png`}
                    alt=""
                    aria-hidden="true"
                  />
                  <span className="ck-hrac-jmeno">
                    {h.jmeno}
                    {h.jeBot && ' 🤖'}
                  </span>
                  <span className="ck-hrac-body">
                    🪙{h.zlato} 💎{h.drahokamy} · {skoreHrace(h)}b.
                  </span>
                </div>
              )
            })}
          </div>
        </aside>
      </section>
    </main>
  )
}

export default CtyriKralovstvi
