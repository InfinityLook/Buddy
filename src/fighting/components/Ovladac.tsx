import React, { useEffect, useRef, useState } from 'react'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { useWalletStore } from '@/core/store/useWalletStore'
import { VirtualniJoystick } from '@/game/components/VirtualniJoystick'
import { pripojSeJakoOvladac } from '../network'
import { zavibrujProhru, zavibrujRemizu, zavibrujTlacitko, zavibrujVyhru } from '../haptika'
import { useSoubojStatistikyStore } from '../useSoubojStatistikyStore'
import { POSTAVY, VSECHNY_POSTAVY } from '../combat/postavy'
import type { PostavaId } from '../combat/postavy'
import { RYCHLE_EMOTE } from '../types'
import type { KonecZapasuPayload, PripojenoPayload, Smer, Tlacitko } from '../types'
import { VyberPostavy } from './VyberPostavy'
import '../FightingModule.css'

interface Props {
  onZpet: () => void
}

const vygenerujHracId = () => `hrac-${Math.random().toString(36).slice(2, 10)}`

const IKONA_TLACITKA: Record<Tlacitko, string> = { udar: '👊', kop: '🦵', blok: '🛡️', specialni: '✨' }
const PORADI_TLACITEK: Tlacitko[] = ['udar', 'kop', 'blok', 'specialni']

/** Kolik má joystick vychýlit ze středu, než ho appka bere jako
 *  "vlevo"/"vpravo" — malé chvění palce kolem středu tak nespustí
 *  falešný pohyb. */
const PRAH_JOYSTICKU = 0.3

/** Vylepšení — XP/kredity za odehraný zápas. Výhra jde přes
 *  recordAction (bumpne counters.souboj + zkontroluje ring_mistr
 *  odznak), prohra/remíza jen přes bare addXp — účastnický drobeček,
 *  co záměrně NENÍ počítaný k odznaku (ten má znamenat "vyhraj 5
 *  zápasů", ne "odehraj 5 zápasů", stejné rozlišení jako Buddyheimův
 *  arena_champion). */
const XP_VYHRA = 25
const KREDITY_VYHRA = 15
const XP_UCAST = 8

type StavSpojeni = 'zadavani' | 'vyberPostavy' | 'pripojovani' | 'pripojeno'

// ==========================================
// Telefon strana — zadání kódu místnosti, pak (Fáze 3, lokálně, bez
// sítě) výběr postavy, pak teprve skutečné síťové připojení, a nakonec
// joystick + čtyři akční tlačítka na šířku (viz CLAUDE.md — appka
// dřív měla d-pad na výšku, vylepšení ho nahradilo). Výběr postavy je
// schválně zařazený PŘED "pripojovani" — viz VyberPostavy.tsx a
// types.ts's PripojitPayload — takže se pošle rovnou s prvním
// broadcastem, žádný druhý krok navíc na síti. Vstupy tlačítek se
// posílají na pointerdown/pointerup, ne na klik — hra potřebuje
// vědět, jak dlouho je tlačítko drženo, ne jen že bylo stisknuto.
// ==========================================

export const Ovladac: React.FC<Props> = ({ onZpet }) => {
  const { profile } = useProfileData()
  const [kodVstup, setKodVstup] = useState('')
  const [kod, setKod] = useState<string | null>(null)
  const [postavaId, setPostavaId] = useState<PostavaId | null>(null)
  const [slot, setSlot] = useState<1 | 2 | null>(null)
  const [stavSpojeni, setStavSpojeni] = useState<StavSpojeni>('zadavani')
  const [vysledekZapasu, setVysledekZapasu] = useState<string | null>(null)
  // Vylepšení — statistiky (viz useSoubojStatistikyStore.ts). Vlastní
  // boolean místo dalšího StavSpojeni kroku, protože appka na tuhle
  // obrazovku umí přijít jen z 'zadavani' a nikdy neovlivňuje síťové
  // připojení samotné.
  const [zobrazStatistiky, setZobrazStatistiky] = useState(false)
  const vysledky = useSoubojStatistikyStore((s) => s.vysledky)
  // Deváté kolo vylepšení — historie posledních zápasů (viz
  // useSoubojStatistikyStore.ts's vlastní komentář, proč bez soupeřovy
  // postavy — appka ji vůbec nezná).
  const historie = useSoubojStatistikyStore((s) => s.historie)
  const hracIdRef = useRef(vygenerujHracId())
  const spravaRef = useRef<ReturnType<typeof pripojSeJakoOvladac> | null>(null)
  // Handler konecZapasu se registruje jednou při připojení (viz efekt níž),
  // ale samotný slot přijde asynchronně až přes pripojeno — čtení `slot`
  // přímo by v uzávěru handleru zůstalo navždy null. Ref drží aktuální
  // hodnotu bez závislosti na běhu efektu.
  const slotRef = useRef<1 | 2 | null>(null)

  useEffect(() => {
    if (stavSpojeni !== 'pripojovani' || !kod || !postavaId) return

    const sprava = pripojSeJakoOvladac(kod, hracIdRef.current, profile.name || 'Hráč', postavaId, {
      pripojeno: (p: PripojenoPayload) => {
        slotRef.current = p.slot
        setSlot(p.slot)
        setStavSpojeni('pripojeno')
      },
      konecZapasu: (p: KonecZapasuPayload) => {
        const muj = slotRef.current
        if (p.vitezSlot === null) {
          useGamificationStore.getState().addXp(XP_UCAST)
          if (postavaId) useSoubojStatistikyStore.getState().zaznamenejVysledek(postavaId, 'remiza')
          setVysledekZapasu(`Remíza — +${XP_UCAST} XP`)
          zavibrujRemizu()
        } else if (p.vitezSlot === muj) {
          useGamificationStore.getState().recordAction('souboj', XP_VYHRA)
          useWalletStore.getState().credit(KREDITY_VYHRA)
          if (postavaId) useSoubojStatistikyStore.getState().zaznamenejVysledek(postavaId, 'vyhra')
          setVysledekZapasu(`Vyhrál jsi! +${XP_VYHRA} XP, +${KREDITY_VYHRA} kreditů`)
          zavibrujVyhru()
        } else {
          useGamificationStore.getState().addXp(XP_UCAST)
          if (postavaId) useSoubojStatistikyStore.getState().zaznamenejVysledek(postavaId, 'prohra')
          setVysledekZapasu(`Prohrál jsi — +${XP_UCAST} XP`)
          zavibrujProhru()
        }
        window.setTimeout(() => setVysledekZapasu(null), 4000)
      },
    })
    spravaRef.current = sprava
    return () => sprava.zrusit()
    // profile.name se čte jen v okamžiku připojení, ne živě po celou dobu hry —
    // proto v poli závislostí schválně chybí.
  }, [stavSpojeni, kod, postavaId])

  const posliSmer = (smer: Smer | null) => {
    spravaRef.current?.poslatVstup({ hracId: hracIdRef.current, typ: 'smer', smer })
  }

  // Osmé kolo vylepšení — rychlý emote (types.ts's RYCHLE_EMOTE), jen
  // směrem telefon → TV (viz network.ts's vlastní komentář u
  // poslatEmote), čistě kosmetické, žádný vliv na skóre/engine.
  const posliEmote = (emote: string) => {
    spravaRef.current?.poslatEmote(emote)
  }

  const posliTlacitko = (tlacitko: Tlacitko, stisknuto: boolean) => {
    // Krátké vibrační cvaknutí jen na STISK, ne na puštění — appka na
    // fyzickém ovladači nemá žádnou hmatovou zpětnou vazbu jinak, tohle
    // je jediné potvrzení, že se dotyk vůbec zaregistroval.
    if (stisknuto) zavibrujTlacitko()
    spravaRef.current?.poslatVstup({ hracId: hracIdRef.current, typ: 'tlacitko', tlacitko, stisknuto })
  }

  // Joystick hlásí spojitou výchylku (-1..1), engine ale pořád zná jen
  // diskrétní "vlevo"/"vpravo" (viz engine.ts's tikBojovnika) — appka
  // to tady jednou převede přes práh, ne že by se HracVstup/Smer měnily
  // kvůli novému fyzickému ovladači. `posledniSmer` posílá vstup po
  // síti jen při skutečné ZMĚNĚ, ne na každý pohyb palce o pixel —
  // joystick hlásí polohu mnohem častěji, než kolikrát se skutečně
  // mění, co appka chce poslat.
  const posledniSmerRef = useRef<Smer | null>(null)
  const zpracujJoystick = (x: number) => {
    const smer: Smer | null = x < -PRAH_JOYSTICKU ? 'vlevo' : x > PRAH_JOYSTICKU ? 'vpravo' : null
    if (smer === posledniSmerRef.current) return
    posledniSmerRef.current = smer
    posliSmer(smer)
  }

  // Nejlepší možný pokus otočit obrazovku natvrdo — Screen Orientation
  // lock ale mimo fullscreen (appka fullscreen záměrně nevynucuje,
  // vyžaduje by to vlastní gesto uživatele navíc) a na iOS Safari
  // vůbec nefunguje, takže appka na něm NESTAVÍ: skutečná záruka je
  // CSS výzva "Otoč telefon" (FightingModule.css), tohle je jen bonus
  // tam, kde to náhodou vyjde.
  useEffect(() => {
    if (stavSpojeni !== 'pripojeno') return
    // `lock` chybí v TS DOM typech (experimentální, vendor-specific
    // podpora) — stejný důvod jako speechTypes.d.ts/barcodeTypes.d.ts
    // jinde v appce, tady stačí místní cast, ne celý ambientní soubor
    // pro jedinou metodu jednoho volání.
    const orientaceSZamkem = screen.orientation as ScreenOrientation & {
      lock?: (orientace: string) => Promise<void>
    }
    orientaceSZamkem.lock?.('landscape').catch(() => {})
  }, [stavSpojeni])

  if (zobrazStatistiky) {
    return (
      <div className="souboj-page">
        <header className="souboj-top-bar">
          <button className="souboj-back-btn" onClick={() => setZobrazStatistiky(false)}>
            ← Zpět
          </button>
          <h1 className="souboj-title">Statistiky</h1>
        </header>

        <div className="souboj-statistiky-seznam">
          {VSECHNY_POSTAVY.map((p) => {
            const z = vysledky[p.id] ?? { vyhry: 0, prohry: 0, remizy: 0 }
            const celkem = z.vyhry + z.prohry + z.remizy
            return (
              <div key={p.id} className="souboj-statistiky-radek">
                <span className="souboj-statistiky-jmeno">
                  {p.ikona} {p.jmeno}
                </span>
                {celkem === 0 ? (
                  <span className="souboj-statistiky-prazdno">Zatím žádný zápas</span>
                ) : (
                  <span className="souboj-statistiky-cisla">
                    <span className="souboj-stat souboj-stat--vyhra">{z.vyhry} V</span>
                    <span className="souboj-stat souboj-stat--prohra">{z.prohry} P</span>
                    <span className="souboj-stat souboj-stat--remiza">{z.remizy} R</span>
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Deváté kolo vylepšení — historie posledních zápasů, pod
            přehledem podle postavy, nejnovější první. */}
        <p className="souboj-historie-nadpis">Poslední zápasy</p>
        {historie.length === 0 ? (
          <p className="souboj-statistiky-prazdno souboj-historie-prazdno">Zatím žádný odehraný zápas</p>
        ) : (
          <div className="souboj-historie-seznam">
            {historie.map((z, i) => (
              <div key={i} className={`souboj-historie-radek souboj-historie-radek--${z.vysledek}`}>
                <span className="souboj-historie-postava">
                  {POSTAVY[z.postavaId].ikona} {POSTAVY[z.postavaId].jmeno}
                </span>
                <span className="souboj-historie-vysledek">
                  {z.vysledek === 'vyhra' ? 'Výhra' : z.vysledek === 'prohra' ? 'Prohra' : 'Remíza'}
                </span>
                <span className="souboj-historie-cas">
                  {new Date(z.kdy).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (stavSpojeni === 'zadavani') {
    return (
      <div className="souboj-page">
        <header className="souboj-top-bar">
          <button className="souboj-back-btn" onClick={onZpet}>
            ← Zpět
          </button>
          <h1 className="souboj-title">Připojit se</h1>
        </header>

        <form
          className="souboj-kod-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (kodVstup.trim().length < 4) return
            setKod(kodVstup.trim().toUpperCase())
            setStavSpojeni('vyberPostavy')
          }}
        >
          <label className="souboj-kod-label">
            Kód místnosti z TV
            <input
              className="souboj-kod-input"
              value={kodVstup}
              onChange={(e) => setKodVstup(e.target.value.toUpperCase())}
              maxLength={4}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="např. K7QZ"
            />
          </label>
          <button className="souboj-kod-submit" type="submit" disabled={kodVstup.trim().length < 4}>
            Pokračovat
          </button>
        </form>

        <button type="button" className="souboj-statistiky-btn" onClick={() => setZobrazStatistiky(true)}>
          📊 Statistiky
        </button>
      </div>
    )
  }

  if (stavSpojeni === 'vyberPostavy') {
    return (
      <div className="souboj-page">
        <header className="souboj-top-bar">
          <button className="souboj-back-btn" onClick={() => setStavSpojeni('zadavani')}>
            ← Zpět
          </button>
          <h1 className="souboj-title">Připojit se</h1>
        </header>

        <VyberPostavy
          onVybrano={(id) => {
            setPostavaId(id)
            setStavSpojeni('pripojovani')
          }}
        />
      </div>
    )
  }

  if (stavSpojeni === 'pripojovani') {
    return (
      <div className="souboj-page">
        <header className="souboj-top-bar">
          <button className="souboj-back-btn" onClick={onZpet}>
            ← Zpět
          </button>
          <h1 className="souboj-title">Připojit se</h1>
        </header>
        <p className="souboj-sub">Připojuji…</p>
      </div>
    )
  }

  return (
    <div className="souboj-ovladac">
      <div className="souboj-ovladac-otoc" aria-hidden="true">
        <span className="souboj-ovladac-otoc-ikona">🔄</span>
        <p>Otoč telefon na šířku</p>
      </div>

      <span className={`souboj-ovladac-stav souboj-ovladac-stav--${slot}`}>Jsi Hráč {slot}</span>

      {vysledekZapasu && <div className="souboj-ovladac-vysledek">{vysledekZapasu}</div>}

      <div className="souboj-emote-radek" aria-label="Rychlý emote">
        {RYCHLE_EMOTE.map((emote) => (
          <button key={emote} type="button" className="souboj-emote-btn" onClick={() => posliEmote(emote)}>
            {emote}
          </button>
        ))}
      </div>

      <VirtualniJoystick onZmena={(x) => zpracujJoystick(x)} />

      {/* Desáté kolo vylepšení — chyt (grab). Žádné nové tlačítko,
          jen kombinace dvou existujících (viz combat/loop.ts's
          detekujAkci) — bez týhle nápovědy by nikdo netušil, že to
          jde. */}
      <p className="souboj-chyt-hint">👊 + 🛡️ = Chyt (neblokovatelný)</p>

      <div className="souboj-tlacitka">
        {PORADI_TLACITEK.map((tlacitko) => (
          <button
            key={tlacitko}
            type="button"
            className={`souboj-akcni-tlacitko souboj-akcni-tlacitko--${tlacitko}`}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              posliTlacitko(tlacitko, true)
            }}
            onPointerUp={() => posliTlacitko(tlacitko, false)}
            onPointerCancel={() => posliTlacitko(tlacitko, false)}
          >
            {IKONA_TLACITKA[tlacitko]}
          </button>
        ))}
      </div>
    </div>
  )
}
