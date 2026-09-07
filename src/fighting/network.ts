import { supabase } from '@/core/supabase/client'
import type { PostavaId } from './combat/postavy'
import type { SoubojStav } from './combat/types'
import type { EmotePayload, KonecZapasuPayload, PripojenoPayload, PripojitPayload, VstupPayload } from './types'

// ==========================================
// Párování telefon-ovladač <-> TV — čistě živý Supabase Realtime
// broadcast kanál pojmenovaný podle kódu místnosti, žádná databázová
// tabulka, žádná RLS. Stejný "broadcast na jmenovaném kanálu" vzor,
// jaký social/api.ts's sledovatPritomnost už používá pro psaní
// v chatu — místnost sama nikam neukládá stav, zmizí s posledním
// odpojeným účastníkem, appka žádný úklid nepotřebuje.
//
// Tahle hra na síti stojí a padá — na rozdíl od většiny appky, kde je
// cloud jen bonus, tady bez isSupabaseConfigured nejde hrát vůbec
// (obě strany si volání jen tiše odbydou, komponenty samy hlásí
// uživateli, že hra potřebuje cloud, viz FightingModule.tsx).
// ==========================================

let poradiKanalu = 0

// Bez I/O/0/1 — stejný důvod jako social/api.ts's friend_code: kód
// se často diktuje nahlas přes místnost.
const ABECEDA_KODU = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const vygenerujKodMistnosti = (delka = 4): string => {
  let kod = ''
  for (let i = 0; i < delka; i++) {
    kod += ABECEDA_KODU[Math.floor(Math.random() * ABECEDA_KODU.length)]
  }
  return kod
}

const nazevKanalu = (kod: string) => `souboj-mistnost-${kod.toUpperCase()}`

/** Sdílené napříč Ovladac.tsx (telefon-ovladač <-> TV) a od dvanáctého
 *  kola vylepšení taky OnlineLobby.tsx/OnlineHost.tsx/OnlineGuest.tsx
 *  (souboj na dálku) — obojí potřebuje jeden náhodný identifikátor
 *  hráče pro tuhle jednu relaci, dřív to bylo soukromé jen uvnitř
 *  Ovladac.tsx. */
export const vygenerujHracId = () => `hrac-${Math.random().toString(36).slice(2, 10)}`

interface HostHandlery {
  pripojilSe: (p: PripojitPayload) => void
  prisalVstup: (p: VstupPayload) => void
  /** Osmé kolo vylepšení — nepovinné, ať appka nemusí měnit každé
   *  dřívější volání hostujMistnost() jen kvůli novému, čistě
   *  kosmetickému kanálu. */
  prisalEmote?: (p: EmotePayload) => void
}

/** TV strana — otevře místnost pod daným kódem a naslouchá připojením
 *  i vstupům z ovladačů. `potvrdPripojeni` přidělí konkrétnímu hráči
 *  jeho slot (1/2), aby ovladač věděl, za koho hraje. */
export const hostujMistnost = (kod: string, handlery: HostHandlery) => {
  const klient = supabase
  if (!klient)
    return { potvrdPripojeni: () => {}, oznamKonecZapasu: () => {}, oznamStavZapasu: () => {}, zrusit: () => {} }

  const kanal = klient
    .channel(`${nazevKanalu(kod)}:${++poradiKanalu}`)
    .on('broadcast', { event: 'pripojit' }, ({ payload }) => handlery.pripojilSe(payload as PripojitPayload))
    .on('broadcast', { event: 'vstup' }, ({ payload }) => handlery.prisalVstup(payload as VstupPayload))
    .on('broadcast', { event: 'emote' }, ({ payload }) => handlery.prisalEmote?.(payload as EmotePayload))
    .subscribe()

  return {
    potvrdPripojeni: (p: PripojenoPayload) =>
      void kanal.send({ type: 'broadcast', event: 'pripojeno', payload: p }),
    oznamKonecZapasu: (p: KonecZapasuPayload) =>
      void kanal.send({ type: 'broadcast', event: 'konecZapasu', payload: p }),
    /** Dvanácté kolo vylepšení — souboj na dálku (OnlineHost.tsx).
     *  Na rozdíl od telefon-ovladač <-> TV páru (kde ovladač žádnou
     *  hru nevykresluje, jen posílá vstup) tady OBĚ strany zápas
     *  vidí na VLASTNÍM telefonu — hostující zařízení jediné skutečně
     *  simuluje (viz combat/engine.ts's krokSouboje), a po každém tiku
     *  rozešle hotový SoubojStav dál, aby ho druhá strana mohla čistě
     *  VYKRESLIT (Bojiste.tsx), ne počítat podruhé. Žádná nová
     *  databázová tabulka ani RLS — stejný "broadcast na jmenovaném
     *  kanálu" vzor jako zbytek tohohle souboru. */
    oznamStavZapasu: (stav: SoubojStav) => void kanal.send({ type: 'broadcast', event: 'stavZapasu', payload: stav }),
    zrusit: () => void klient.removeChannel(kanal),
  }
}

interface OvladacHandlery {
  pripojeno: (p: PripojenoPayload) => void
  konecZapasu: (p: KonecZapasuPayload) => void
  /** Dvanácté kolo vylepšení — nepovinné ze stejného důvodu jako
   *  HostHandlery's prisalEmote výš: appka nechce měnit Ovladac.tsx's
   *  (telefon-ovladač <-> TV) volání jen kvůli druhému, dálkovému
   *  režimu. */
  prisalStavZapasu?: (stav: SoubojStav) => void
}

/** Telefon strana — připojí se do místnosti pod kódem a hned po
 *  skutečném navázání spojení (SUBSCRIBED, ne dřív — jinak by zpráva
 *  odešla do prázdna) se jednou přihlásí; pak jen posílá vstupy. */
export const pripojSeJakoOvladac = (
  kod: string,
  mujHracId: string,
  jmeno: string,
  postavaId: PostavaId,
  handlery: OvladacHandlery
) => {
  const klient = supabase
  if (!klient) return { poslatVstup: () => {}, poslatEmote: () => {}, zrusit: () => {} }

  const kanal = klient
    .channel(`${nazevKanalu(kod)}:${++poradiKanalu}`)
    .on('broadcast', { event: 'pripojeno' }, ({ payload }) => {
      const p = payload as PripojenoPayload
      if (p.hracId === mujHracId) handlery.pripojeno(p)
    })
    .on('broadcast', { event: 'konecZapasu' }, ({ payload }) => handlery.konecZapasu(payload as KonecZapasuPayload))
    .on('broadcast', { event: 'stavZapasu' }, ({ payload }) => handlery.prisalStavZapasu?.(payload as SoubojStav))
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        void kanal.send({
          type: 'broadcast',
          event: 'pripojit',
          payload: { hracId: mujHracId, jmeno, postavaId } satisfies PripojitPayload,
        })
      }
    })

  return {
    poslatVstup: (payload: VstupPayload) => void kanal.send({ type: 'broadcast', event: 'vstup', payload }),
    poslatEmote: (emote: string) =>
      void kanal.send({
        type: 'broadcast',
        event: 'emote',
        payload: { hracId: mujHracId, emote } satisfies EmotePayload,
      }),
    zrusit: () => void klient.removeChannel(kanal),
  }
}

// ==========================================
// Dvanácté kolo vylepšení — online matchmaking (souboj na dálku, každý
// hráč na VLASTNÍM telefonu, žádná sdílená TV). Bez centrálního
// rozhodčího a bez nové databázové tabulky — appka reálně jen
// znovupoužívá Realtime PRESENCE (na rozdíl od zbytku souboru, co
// stojí čistě na broadcastu) na jednom pevně pojmenovaném kanálu
// ("lobby"), kam se každý hledající hráč sám "zapíše" (`track()`).
// Kdo je s kým spárovaný appka počítá DETERMINISTICKY z toho samého,
// všem společně viditelného stavu (presenceState()) — viz
// onlineParovani.ts's vyberDvojici/jeHostem — takže obě strany dojdou
// nezávisle na sobě ke stejnému závěru, bez jediné zprávy "ty jsi
// spárovaný s tímhle", jaká by centrální rozhodčí posílal.
//
// Poctivě přiznaný limit: appka nemá jak zaručit, že dva klienti vidí
// naprosto identický presenceState() ve stejném okamžiku (Realtime
// presence se šíří asynchronně) — u přesně dvou čekajících hráčů to
// není problém, u třetího a dalšího, co dorazí ve stejné chvíli, může
// dojít k závodu (víc klientů si na okamžik myslí, že jsou "ti dva
// nejdřívější"). Appka to neřeší žádným zámkem/rozhodčím — nejhorší
// důsledek je, že se spárování na jeden pokus nepovede a přepočítá se
// znovu na dalším presence sync, ne že by appka spadla nebo spároval
// špatnou dvojici napevno.
// ==========================================

const KANAL_LOBBY = 'souboj-online-lobby'

export interface PritomnostVLobby {
  hracId: string
  jmeno: string
  postavaId: PostavaId
  /** Kdy appka o tomhle hráči poprvé slyšela — appka páruje vždycky
   *  dva NEJDÉLE čekající, ať nikdo nečeká donekonečna, zatímco noví
   *  zájemci naskakují a odcházejí kolem něj. */
  od: number
}

interface LobbyHandlery {
  zmenaPritomnosti: (pritomni: PritomnostVLobby[]) => void
}

/** Připojí appku do sdílené fronty hledajících hráčů — `track()` je
 *  sama o sobě žádost "hledám soupeře", `zmenaPritomnosti` appce dá
 *  vědět o KAŽDÉ změně (někdo přišel/odešel), ať si sama přepočítá
 *  spárování (viz onlineParovani.ts). Appka žádnou vlastní frontu
 *  nedrží — pravda je vždycky v `presenceState()` samotném. */
export const pripojDoLobby = (
  hracId: string,
  jmeno: string,
  postavaId: PostavaId,
  handlery: LobbyHandlery
) => {
  const klient = supabase
  if (!klient) return { odejit: () => {} }

  const kanal = klient.channel(`${KANAL_LOBBY}:${++poradiKanalu}`)
  const precistPritomnost = () => {
    const stav = kanal.presenceState<{ hracId: string; jmeno: string; postavaId: PostavaId; od: number }>()
    const pritomni = Object.values(stav)
      .flat()
      .map((p) => ({ hracId: p.hracId, jmeno: p.jmeno, postavaId: p.postavaId, od: p.od }))
    handlery.zmenaPritomnosti(pritomni)
  }

  kanal
    .on('presence', { event: 'sync' }, precistPritomnost)
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        void kanal.track({ hracId, jmeno, postavaId, od: Date.now() })
      }
    })

  return { odejit: () => void klient.removeChannel(kanal) }
}
