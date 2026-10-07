import { showAppNotification } from '@/core/utils/notify'
import { mistniDatum } from '@/core/utils/date'
import { sklonujDen } from '@/core/utils/text'
import { melaByUpozornitNaKonecSerie } from '@/core/utils/gamificationUtils'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { useStreakWarningStore } from '@/core/store/useStreakWarningStore'

// ==========================================
// Krok 14e — stejný "modulový" vzor jako fitnessReminders.ts: kontrola
// hned při startu a znovu při každém návratu do appky (resume
// triggery), ne jen když je Hub zrovna otevřený.
//
// Žije jako VLASTNÍ soubor, mimo useGamificationStore.ts — core/utils/
// notify.ts přes registerSW.ts's virtual:pwa-register kontaminuje
// testovatelnost čehokoli, co ho importuje, a useGamificationStore.ts
// je nejčtenější a nejtestovanější store v celé appce (skoro každý
// testovací soubor ho někde importuje) — importovat notify.ts přímo
// do něj by appku zbavilo testovatelnosti na místě, kde to bolí
// nejvíc.
// ==========================================

let remindersStarted = false

const checkStreakWarning = (): void => {
  const { streakDays, lastActiveDate } = useGamificationStore.getState()
  if (!melaByUpozornitNaKonecSerie(streakDays, lastActiveDate)) return

  const dnes = mistniDatum()
  const warningStore = useStreakWarningStore.getState()
  if (warningStore.posledniUpozorneneDatum === dnes) return
  warningStore.oznacUpozorneno(dnes)

  void showAppNotification(
    '🔥 Série v ohrožení!',
    `Dnes ještě nemáš zapsanou žádnou aktivitu — přijdeš o ${streakDays} ${sklonujDen(streakDays)} v řadě.`,
    'streak-warning'
  )
}

/** Zapne kontrolu. Volá se jednou ze startu aplikace (App.tsx). */
export const setupStreakWarningReminder = (): void => {
  if (remindersStarted) return
  remindersStarted = true

  checkStreakWarning()

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkStreakWarning()
  })
  window.addEventListener('focus', checkStreakWarning)
  window.addEventListener('online', checkStreakWarning)
}
