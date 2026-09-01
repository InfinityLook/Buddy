import { supabase } from '@/core/supabase/client'
import type { PostavaId } from './combat/postavy'
import type { PripojenoPayload, PripojitPayload, VstupPayload } from './types'

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

interface HostHandlery {
  pripojilSe: (p: PripojitPayload) => void
  prisalVstup: (p: VstupPayload) => void
}

/** TV strana — otevře místnost pod daným kódem a naslouchá připojením
 *  i vstupům z ovladačů. `potvrdPripojeni` přidělí konkrétnímu hráči
 *  jeho slot (1/2), aby ovladač věděl, za koho hraje. */
export const hostujMistnost = (kod: string, handlery: HostHandlery) => {
  const klient = supabase
  if (!klient) return { potvrdPripojeni: () => {}, zrusit: () => {} }

  const kanal = klient
    .channel(`${nazevKanalu(kod)}:${++poradiKanalu}`)
    .on('broadcast', { event: 'pripojit' }, ({ payload }) => handlery.pripojilSe(payload as PripojitPayload))
    .on('broadcast', { event: 'vstup' }, ({ payload }) => handlery.prisalVstup(payload as VstupPayload))
    .subscribe()

  return {
    potvrdPripojeni: (p: PripojenoPayload) =>
      void kanal.send({ type: 'broadcast', event: 'pripojeno', payload: p }),
    zrusit: () => void klient.removeChannel(kanal),
  }
}

interface OvladacHandlery {
  pripojeno: (p: PripojenoPayload) => void
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
  if (!klient) return { poslatVstup: () => {}, zrusit: () => {} }

  const kanal = klient
    .channel(`${nazevKanalu(kod)}:${++poradiKanalu}`)
    .on('broadcast', { event: 'pripojeno' }, ({ payload }) => {
      const p = payload as PripojenoPayload
      if (p.hracId === mujHracId) handlery.pripojeno(p)
    })
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
    zrusit: () => void klient.removeChannel(kanal),
  }
}
