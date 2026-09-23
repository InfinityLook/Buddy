import { showAppNotification } from '@/core/utils/notify'
import { mistniDatum } from '@/core/utils/date'
import { usePitnyRezim } from './usePitnyRezim'

// ==========================================
// Připomenutí pitného režimu — stejný "modulový" vzor jako
// fitnessReminders.ts vedle: kontroluje se hned při startu a pak
// znovu při každém návratu do appky, ne jen když je Fitness Room
// zrovna otevřený.
//
// Žije jako VLASTNÍ soubor, ne uvnitř usePitnyRezim.ts — core/utils/
// notify.ts přes registerSW.ts's virtual:pwa-register kontaminuje
// testovatelnost čehokoli, co ho importuje, stejný důvod jako
// fitnessReminders.ts's vlastní hlavičkový komentář.
//
// Na rozdíl od Fitness Roomova tréninkového připomenutí appka nemá
// nastavitelný čas — jeden pevný okamžik odpoledne, kdy pitný režim
// dne už reálně běží, ne teprve ráno.
// ==========================================

const PRIPOMENUTI_OD_HODINY = 14

let remindersStarted = false

const checkPitnyRezimReminder = (): void => {
  if (new Date().getHours() < PRIPOMENUTI_OD_HODINY) return

  const today = mistniDatum()
  const pitnyRezim = usePitnyRezim.getState()
  if (pitnyRezim.posledniPripomenutyDen === today) return

  const cil = pitnyRezim.cilSklenic
  const dnesniPocet = pitnyRezim.pocty[today] ?? 0
  // Cíl už splněn — appka dál neotravuje, i kdyby se odpoledne
  // ještě neposlalo žádné dřívější připomenutí.
  if (cil !== null && dnesniPocet >= cil) return

  pitnyRezim.oznacPripomenuto(today)

  const zprava =
    cil !== null
      ? `Dneska zatím ${dnesniPocet} z ${cil} sklenic. Nezapomeň pít.`
      : 'Nezapomeň dneska pít dost vody.'

  void showAppNotification('💧 Pitný režim', zprava, 'pitny-rezim')
}

/** Zapne kontrolu. Volá se jednou ze startu aplikace (App.tsx). */
export const setupPitnyRezimReminders = (): void => {
  if (remindersStarted) return
  remindersStarted = true

  checkPitnyRezimReminder()

  // Nový kalendářní den (nebo jen odpoledne) mohl začít i bez toho,
  // aby appka prošla plným znovunačtením — telefon jen probudil PWA
  // na pozadí.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkPitnyRezimReminder()
  })
  window.addEventListener('focus', checkPitnyRezimReminder)
  window.addEventListener('online', checkPitnyRezimReminder)
}
