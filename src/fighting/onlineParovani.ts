import type { PritomnostVLobby } from './network'

// ==========================================
// Dvanácté kolo vylepšení — čisté funkce pro párování v online lobby
// (network.ts's pripojDoLobby), stejná disciplína jako combat/engine.ts:
// žádný React, žádná síť, jde otestovat na obyčejných objektech. Obě
// strany volají STEJNÉ funkce na STEJNÝCH vstupních datech
// (presenceState() sdílený přes Realtime) a musí tak dojít ke stejnému
// závěru bez jediné zprávy "ty jsi spárovaný s tímhle" — žádný
// centrální rozhodčí (viz network.ts's vlastní komentář, proč a s
// jakým rizikem).
// ==========================================

/** Deterministicky seřadí čekající podle toho, kdo čeká NEJDÉLE (a při
 *  shodě `od` — prakticky nemožné, ale appka to i tak ošetřuje —
 *  podle hracId, ať je pořadí vždycky jednoznačné). */
const serazeni = (pritomni: PritomnostVLobby[]): PritomnostVLobby[] =>
  [...pritomni].sort((a, b) => a.od - b.od || a.hracId.localeCompare(b.hracId))

/** Vrátí dvojici dvou nejdéle čekajících hráčů, nebo null, pokud jich
 *  je míň než dva. Appka páruje vždycky jen tuhle jednu, nejstarší
 *  dvojici — kdokoli další v lobby zůstává čekat na svůj vlastní další
 *  přepočet, jakmile se tahle dvojice odpojí (viz OnlineLobby.tsx). */
export const vyberDvojici = (pritomni: PritomnostVLobby[]): [PritomnostVLobby, PritomnostVLobby] | null => {
  const serazeno = serazeni(pritomni)
  if (serazeno.length < 2) return null
  return [serazeno[0], serazeno[1]]
}

/** Kdo ze dvojice bude "hostem" (skutečně simuluje zápas, viz
 *  OnlineHost.tsx) — čistě podle abecedního pořadí ID, ať obě strany
 *  dojdou nezávisle ke stejnému závěru. Host je vždycky enginový slot
 *  0 (postava0), host je vždycky slot 1 (postava1) — stejná dvojice
 *  slotů, jakou zbytek souboru (KonecZapasuPayload) používá odjakživa. */
export const jeHostem = (mujId: string, souperId: string): boolean => mujId < souperId

/** Odvodí sdílený název místnosti ze dvou ID hráčů — obě strany na
 *  stejném vstupu spočtou identický výstup, žádný náhodně generovaný
 *  kód (jaký appka jinak používá pro ruční zadávání, viz
 *  vygenerujKodMistnosti) tady nedává smysl, protože ho nikdo
 *  nezadává, jen appka sama ho posílá do hostujMistnost()/
 *  pripojSeJakoOvladac() jako jméno kanálu. */
export const odvodKodMistnosti = (idA: string, idB: string): string => [idA, idB].sort().join('_')
