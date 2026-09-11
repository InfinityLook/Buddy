import { showAppNotification } from '@/core/utils/notify'
import { useFormCheckStore } from '@/miniapps/form-check/useFormCheck'
import { useFitnessCil } from './useFitnessCil'

// ==========================================
// Připomenutí tréninku — stejný "modulový" vzor jako Planerovo
// setupStudyPlannerReminders (useStudyPlanner.ts): kontroluje se hned
// při startu a pak znovu při každém návratu do appky, ne jen když je
// Fitness Room zrovna otevřený.
//
// Žije jako VLASTNÍ soubor, ne uvnitř useFormCheck.ts — core/utils/
// notify.ts přes registerSW.ts's virtual:pwa-register kontaminuje
// testovatelnost čehokoli, co ho importuje (stejná past, co si appka
// musela vyřešit u Financí/Goal Trackeru), a useFormCheck.ts je dneska
// bezpečně testovatelný (tests/unit/fitness-validation.test.ts z něj
// přímo importuje sanitizujSezeni) — tenhle soubor si notify.ts dovolí
// importovat jen proto, že ho žádný test neimportuje.
// ==========================================

let remindersStarted = false

const todayIso = (): string => new Date().toISOString().slice(0, 10)

const checkFitnessReminder = (): void => {
  const formState = useFormCheckStore.getState()
  const today = todayIso()
  // Nejvýš jedno upozornění za den — bez týhle podmínky by se kontrola
  // spouštěla při každém návratu do appky.
  if (formState.lastReminderDate === today) return

  // Nechceme otravovat hned ráno — připomenutí dává smysl až večer, kdy
  // je jasné, že se dnešní trénink ještě nestihl, ne v poledne, kdy na
  // něj ještě může dojít.
  if (new Date().getHours() < 17) return

  const trenovalDnes = formState.sezeni.some((s) => new Date(s.createdAt).toISOString().slice(0, 10) === today)
  if (trenovalDnes) return

  useFormCheckStore.setState({ lastReminderDate: today })

  const cilMin = useFitnessCil.getState().cilTreninkMin
  const zprava = cilMin
    ? `Dnešní cíl ${cilMin} min tréninku ještě čeká.`
    : 'Dnešní trénink ve Fitness Roomu ještě čeká.'

  void showAppNotification('🏋️ Fitness Room', zprava, 'fitness-room')
}

/** Zapne kontrolu. Volá se jednou ze startu aplikace (App.tsx). */
export const setupFitnessReminders = (): void => {
  if (remindersStarted) return
  remindersStarted = true

  checkFitnessReminder()

  // Nový kalendářní den mohl začít i bez toho, aby appka prošla plným
  // znovunačtením — telefon jen probudil PWA na pozadí.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkFitnessReminder()
  })
  window.addEventListener('focus', checkFitnessReminder)
  window.addEventListener('online', checkFitnessReminder)
}
