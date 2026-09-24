import { showAppNotification } from '@/core/utils/notify'
import { HodinaRozvrhu, najdiDalsiPripominku } from './types'
import { useRozvrhStore } from './useRozvrh'

// ==========================================
// Připomínka před hodinou — žije jako VLASTNÍ soubor, ne uvnitř
// useRozvrh.ts, stejný "core/utils/notify.ts přes registerSW.ts's
// virtual:pwa-register kontaminuje testovatelnost čehokoli, co ho
// importuje" důvod, co si appka musela vyřešit u Financí/Goal Trackeru/
// Fitness Roomu — tenhle soubor si notify.ts dovolí importovat jen
// proto, že ho žádný test neimportuje. Samotné pure jádro
// (najdiDalsiPripominku) proto žije v types.ts, ne tady, přesně tou
// samou "pure funkce jinam, tenhle soubor jen notify.ts" disciplínou,
// co si Finance/Goal Tracker musely osvojit — tests/unit/rozvrh-
// reminders.test.ts z types.ts importuje přímo, bez tohohle souboru.
//
// Na rozdíl od Planerova/Growth Roomova/Fitness Roomova "kontroluj jen
// jednou denně" vzoru tahle připomínka potřebuje skutečnou minutovou
// přesnost ("za 10 minut máš hodinu"), ne jen jednou denní gate — proto
// místo prostého denního zámku plánuje JEDEN přesný časovač na
// nejbližší dnešní hodinu (stejný "absolutní cíl, ne countdown" idiom
// jako Pomodorovo endsAt), znovu naplánovaný při každém návratu do
// appky i po každé odeslané připomínce.
// ==========================================

let timer: ReturnType<typeof setTimeout> | null = null
let remindersStarted = false
// Klíč "id hodiny::datum" poslední odeslané připomínky — ať appka
// nepošle druhou notifikaci na tu samou hodinu, jen protože se mezitím
// znovu spustilo naplánování (návrat do appky v posledních pár
// minutách před začátkem).
let naposledyOznamenoKlic: string | null = null

const zrusTimer = (): void => {
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
}

const oznamKlicPro = (h: HodinaRozvrhu, ted: Date): string =>
  `${h.id}::${ted.getFullYear()}-${ted.getMonth()}-${ted.getDate()}`

const naplanuj = (): void => {
  zrusTimer()
  const ted = new Date()
  // Smazaná (deletedAt) hodina appka drží v úložišti dál jen kvůli
  // synchronizaci mezi zařízeními — sama nesmí spustit připomínku,
  // stejný filtr jako useRozvrh()'s vlastní veřejný pohled.
  const aktivniHodiny = useRozvrhStore.getState().hodiny.filter((h) => !h.deletedAt)
  const dalsi = najdiDalsiPripominku(aktivniHodiny, ted)
  if (!dalsi) return

  const klic = oznamKlicPro(dalsi.hodina, ted)
  const spustit = (): void => {
    if (naposledyOznamenoKlic !== klic) {
      naposledyOznamenoKlic = klic
      void showAppNotification(
        '🗓 Za chvíli máš hodinu',
        `${dalsi.hodina.predmet} začíná v ${dalsi.hodina.casOd}${dalsi.hodina.mistnost ? ` · ${dalsi.hodina.mistnost}` : ''}`,
        'rozvrh-hodina'
      )
    }
    // Naplánuj další hodinu, co dnes ještě zbývá — dřív nebo později
    // se prostě nenajde žádná další a naplanuj() se sám ukončí.
    naplanuj()
  }

  if (dalsi.zaMs <= 0) spustit()
  else timer = setTimeout(spustit, dalsi.zaMs)
}

/** Zapne kontrolu. Volá se jednou ze startu aplikace (App.tsx). */
export const setupRozvrhReminders = (): void => {
  if (remindersStarted) return
  remindersStarted = true

  naplanuj()

  // Nový kalendářní den (a s ním nový rozvrh dneška) mohl začít i bez
  // toho, aby appka prošla plným znovunačtením — telefon jen probudil
  // PWA na pozadí.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') naplanuj()
  })
  window.addEventListener('focus', naplanuj)
  window.addEventListener('online', naplanuj)
}
