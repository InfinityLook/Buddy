import { create } from 'zustand'
import { useAccount } from '@/core/supabase/auth'
import { supabase } from '@/core/supabase/client'
import { showAppNotification } from '@/core/utils/notify'
import { nactiChaty, nactiProfil, sledovatVsechnyZpravy } from './api'

// ==========================================
// Nepřečtené zprávy napříč aplikací.
//
// Odběr uvnitř otevřeného rozhovoru nestačil: kdo byl jinde — v Hubu,
// v miniaplikaci — se o nové zprávě nedozvěděl, dokud sám neotevřel
// Social. Tenhle odběr běží po celou dobu, co je uživatel přihlášený,
// a drží jediné číslo: kolik zpráv čeká.
//
// Odběr se nefiltruje na konkrétní chaty. Realtime v Supabase uplatňuje
// stejná pravidla jako běžné čtení, takže se sem dostanou jen zprávy
// z chatů, kterých je uživatel členem.
// ==========================================

interface InboxState {
  neprectene: number
  /** Id chatu, do kterého se právě dívá — jeho zprávy se nepočítají */
  otevrenyChat: string | null
}

export const useInbox = create<InboxState>(() => ({
  neprectene: 0,
  otevrenyChat: null,
}))

/** Řekne schránce, který chat je otevřený, ať do počtu nepadá. */
export const nastavOtevrenyChat = (chatId: string | null): void => {
  useInbox.setState({ otevrenyChat: chatId })
  if (chatId) void prepocitat()
}

/** Spočítá nepřečtené z databáze. Zdrojem pravdy je server, ne přírůstky. */
export const prepocitat = async (): Promise<void> => {
  if (useAccount.getState().status !== 'signed-in') {
    useInbox.setState({ neprectene: 0 })
    return
  }

  const chaty = await nactiChaty()
  const otevreny = useInbox.getState().otevrenyChat

  useInbox.setState({
    neprectene: chaty
      .filter((ch) => ch.id !== otevreny)
      .reduce((soucet, ch) => soucet + ch.neprectene, 0),
  })
}

let zrusitOdber: (() => void) | null = null
let sleduje = false

/**
 * Zapne sledování. Volá se jednou ze startu aplikace.
 *
 * Odběr se zakládá až po přihlášení a při odhlášení se ruší — kanál
 * otevřený pod starou relací by po přepnutí účtu doručoval cizí zprávy.
 */
export const startInbox = (): void => {
  if (sleduje || !supabase) return
  sleduje = true

  const nastav = (prihlasen: boolean) => {
    zrusitOdber?.()
    zrusitOdber = null

    if (!prihlasen) {
      useInbox.setState({ neprectene: 0 })
      return
    }

    zrusitOdber = sledovatVsechnyZpravy((zprava) => {
      // Vlastní zprávy se nepočítají a zprávy z otevřeného chatu taky ne
      const { otevrenyChat } = useInbox.getState()
      if (zprava.odesilatelId === useAccount.getState().userId) return
      if (zprava.chatId === otevrenyChat) return

      useInbox.setState((s) => ({ neprectene: s.neprectene + 1 }))

      // Systémová notifikace — stejná podmínka jako počítadlo výš (ne
      // vlastní zpráva, ne chat, co má uživatel zrovna otevřený), jen
      // navíc potřebuje jméno odesílatele, které živé doručení neposílá.
      // tag: `social-${chatId}` — druhá zpráva ze stejného chatu předchozí
      // notifikaci nahradí místo hromadění, stejně jako Pomodoro dělá
      // s tagem 'pomodoro'.
      void nactiProfil(zprava.odesilatelId).then((profil) => {
        void showAppNotification(
          `💬 ${profil?.displayName ?? 'Nová zpráva'}`,
          zprava.text,
          `social-${zprava.chatId}`
        )
      })
    })

    void prepocitat()
  }

  let posledni = useAccount.getState().status === 'signed-in'
  nastav(posledni)

  useAccount.subscribe((stav) => {
    const prihlasen = stav.status === 'signed-in'
    if (prihlasen === posledni) return
    posledni = prihlasen
    nastav(prihlasen)
  })

  // Návrat k aplikaci: zprávy, které přišly, když byl telefon uspaný,
  // odběrem nedorazily — přepočet je dohledá.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void prepocitat()
  })
}
