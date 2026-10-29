import { showAppNotification } from '@/core/utils/notify'
import { Udalost, najdiDalsiPripominkuKalendare } from './types'
import { useKalendarStore } from './useKalendar'

// ==========================================
// Vlastní připomínky Kalendáře — žije jako VLASTNÍ soubor, ne uvnitř
// useKalendar.ts, stejný "core/utils/notify.ts přes registerSW.ts's
// virtual:pwa-register kontaminuje testovatelnost čehokoli, co ho
// importuje" důvod, co appka musela vyřešit u Rozvrhu/Financí/Goal
// Trackeru/Fitness Roomu — tenhle soubor si notify.ts dovolí importovat
// jen proto, že ho žádný test neimportuje. Samotné pure jádro
// (najdiDalsiPripominkuKalendare) proto žije v types.ts, ne tady,
// přesně tou samou disciplínou jako appčino Rozvrhovo
// najdiDalsiPripominku — tests/unit/kalendar.test.ts z types.ts
// importuje přímo, bez tohohle souboru.
//
// Na rozdíl od Planerova/Growth Roomova/Fitness Roomova "kontroluj jen
// jednou denně" vzoru tahle připomínka potřebuje skutečnou minutovou
// přesnost (uživatel si může zvolit "10 minut předem"), ne jen denní
// gate — proto místo prostého denního zámku plánuje JEDEN přesný
// časovač na nejbližší připomínku napříč všemi událostmi (stejný
// "absolutní cíl, ne countdown" idiom jako appčino Rozvrhovo
// najdiDalsiPripominku i Pomodorovo endsAt), znovu naplánovaný při
// každém návratu do appky i po každé odeslané připomínce.
// ==========================================

let timer: ReturnType<typeof setTimeout> | null = null
let remindersStarted = false
// Klíč "id události::datum výskytu" poslední odeslané připomínky — ať
// appka nepošle druhou notifikaci na ten samý výskyt, jen protože se
// mezitím znovu spustilo naplánování (návrat do appky v posledních pár
// minutách před připomínkou).
let naposledyOznamenoKlic: string | null = null

const zrusTimer = (): void => {
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
}

const oznamKlicPro = (u: Udalost, ted: Date): string =>
  `${u.id}::${ted.getFullYear()}-${ted.getMonth()}-${ted.getDate()}-${Math.floor(ted.getTime() / 60_000)}`

const naplanuj = (): void => {
  zrusTimer()
  const ted = new Date()
  // Smazanou (deletedAt) událost appka drží v úložišti dál jen kvůli
  // synchronizaci mezi zařízeními — sama nesmí spustit připomínku,
  // najdiDalsiPripominkuKalendare na ni ale tenhle filtr nepotřebuje
  // (vlastní uvnitř už kontroluje deletedAt), appka ho tu přidává jen
  // pro jasnost, stejná dvojitá jistota jako Rozvrhova vlastní appka.
  const aktivniUdalosti = useKalendarStore.getState().udalosti.filter((u) => !u.deletedAt)
  const dalsi = najdiDalsiPripominkuKalendare(aktivniUdalosti, ted)
  if (!dalsi) return

  const klic = oznamKlicPro(dalsi.udalost, ted)
  const spustit = (): void => {
    if (naposledyOznamenoKlic !== klic) {
      naposledyOznamenoKlic = klic
      void showAppNotification(
        '🗓 Blíží se událost',
        dalsi.udalost.celodenni
          ? dalsi.udalost.nazev
          : `${dalsi.udalost.nazev}${dalsi.udalost.casOd ? ` v ${dalsi.udalost.casOd}` : ''}`,
        'kalendar-udalost'
      )
    }
    // Naplánuj další — dřív nebo později se prostě nenajde žádná
    // další budoucí připomínka a naplanuj() se sám ukončí.
    naplanuj()
  }

  if (dalsi.zaKolikMs <= 0) spustit()
  else timer = setTimeout(spustit, dalsi.zaKolikMs)
}

/** Zapne kontrolu. Volá se jednou ze startu aplikace (App.tsx). */
export const setupKalendarReminders = (): void => {
  if (remindersStarted) return
  remindersStarted = true

  naplanuj()

  // Uživatel mohl přidat/upravit/smazat událost (nebo nastavit novou
  // připomínku) v jiné kartě/relaci appky — appka proto znovu plánuje
  // i na každou změnu storu, ne jen na návrat z pozadí.
  useKalendarStore.subscribe(naplanuj)

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') naplanuj()
  })
  window.addEventListener('focus', naplanuj)
  window.addEventListener('online', naplanuj)
}
