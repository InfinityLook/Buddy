import { useAccount } from '@/core/supabase/auth'
import { supabase } from '@/core/supabase/client'
import { showAppNotification } from '@/core/utils/notify'
import { useProfileStore } from '@/pages/profil/hooks/useProfileData'
import { nahlasZarizeni, sledovatNovaZarizeni, zdejsiZarizeniId } from './loginDevices'

// ==========================================
// "Upozornění na přihlášení" — dřív jen kosmetický přepínač v Nastavení
// (`profile.security.loginAlerts`), který nic nedělal (CLAUDE.md's own
// audit flagged it "equally inert" next to biometrics, before biometrics
// got fixed for real). Teď skutečně notifikuje — ale poctivě jen v mezích
// toho, co appka bez vlastního push serveru umí (viz core/utils/notify.ts's
// vlastní varování): dorazí jen na zařízení, které má appku zrovna
// otevřenou v tu chvíli, kdy se přihlásí nové. Není to náhrada za
// "e-mail o novém přihlášení" z velkých služeb, jen nejlepší bezplatná
// verze, jakou appka bez placeného backendu postavit umí.
// ==========================================

let sleduje = false
let zrusitOdber: (() => void) | null = null

export const startLoginNotify = (): void => {
  if (sleduje || !supabase) return
  sleduje = true

  const nastav = (prihlasen: boolean) => {
    zrusitOdber?.()
    zrusitOdber = null
    if (!prihlasen) return

    // Appka rovnou nahlásí tohle zařízení — poprvé to založí nový řádek
    // (a tím pádem vyšle Realtime INSERT jiné, už otevřené relaci
    // stejného účtu, viz níž), podruhé jen posune last_seen_at.
    void nahlasZarizeni()

    zrusitOdber = sledovatNovaZarizeni((deviceId, popis) => {
      // Vlastní zařízení appka o sobě notifikovat nemusí — to je přesně
      // ten řádek, který nahlasZarizeni() výš právě zapsala.
      if (deviceId === zdejsiZarizeniId()) return
      if (!useProfileStore.getState().profile.security.loginAlerts) return
      void showAppNotification('Nové přihlášení', `${popis} se právě přihlásilo k tvému účtu.`, 'login-alert')
    })
  }

  let posledni = useAccount.getState().status === 'signed-in'
  nastav(posledni)

  useAccount.subscribe((stav) => {
    const prihlasen = stav.status === 'signed-in'
    if (prihlasen === posledni) return
    posledni = prihlasen
    nastav(prihlasen)
  })
}
