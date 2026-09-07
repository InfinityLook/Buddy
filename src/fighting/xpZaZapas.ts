import { useGamificationStore } from '@/core/store/useGamificationStore'
import { useWalletStore } from '@/core/store/useWalletStore'
import { zavibrujProhru, zavibrujRemizu, zavibrujVyhru } from './haptika'
import { useSoubojStatistikyStore } from './useSoubojStatistikyStore'
import type { PostavaId } from './combat/postavy'

// ==========================================
// Vylepšení — sdílené vyhodnocení "co dostanu za tenhle zápas", dřív
// jen uvnitř Ovladac.tsx's konecZapasu handleru, teď vytažené sem,
// jakmile ho potřebuje druhý volající: ProtiPocitaci.tsx (Rychlý
// start/Žebříček — sólo vs. bot na JEDNOM zařízení, žádná síť) a
// OnlineHost.tsx/OnlineGuest.tsx (souboj na dálku, dva telefony) obě
// odměňují stejným způsobem jako zápas přes telefon-ovladač <-> TV —
// všechny tři jsou "porazil jsi skutečného soupeře", jen se liší v
// tom, ODKUD ten soupeřův tah přišel (lokální AI, nebo síť). Stejné
// "promuj do sdíleného modulu, jakmile ho potřebuje druhý vlastník"
// pravidlo jako combat/loop.ts's HIT_STOP_MS/INTRO_MS.
// ==========================================

const XP_VYHRA = 25
const KREDITY_VYHRA = 15
const XP_UCAST = 8

/** `mujSlot` je 1/2 stejně jako network.ts's KonecZapasuPayload —
 *  volající vždycky ví, jestli ve dvojici hraje jako "hráč 1"
 *  (postava0) nebo "hráč 2" (postava1). Vrací hotový text pro
 *  zobrazení, appka si sama žádnou logiku nezopakovává. */
export const zpracujVysledekZapasu = (
  mujSlot: 1 | 2,
  vitezSlot: 1 | 2 | null,
  postava0: PostavaId,
  postava1: PostavaId
): string => {
  const mojePostava = mujSlot === 1 ? postava0 : postava1
  const souperId = mujSlot === 1 ? postava1 : postava0

  if (vitezSlot === null) {
    useGamificationStore.getState().addXp(XP_UCAST)
    useSoubojStatistikyStore.getState().zaznamenejVysledek(mojePostava, 'remiza', souperId)
    zavibrujRemizu()
    return `Remíza — +${XP_UCAST} XP`
  }

  if (vitezSlot === mujSlot) {
    useGamificationStore.getState().recordAction('souboj', XP_VYHRA)
    useWalletStore.getState().credit(KREDITY_VYHRA)
    useSoubojStatistikyStore.getState().zaznamenejVysledek(mojePostava, 'vyhra', souperId)
    zavibrujVyhru()
    return `Vyhrál jsi! +${XP_VYHRA} XP, +${KREDITY_VYHRA} kreditů`
  }

  useGamificationStore.getState().addXp(XP_UCAST)
  useSoubojStatistikyStore.getState().zaznamenejVysledek(mojePostava, 'prohra', souperId)
  zavibrujProhru()
  return `Prohrál jsi — +${XP_UCAST} XP`
}
