import { showAppNotification } from '@/core/utils/notify'
import { najdiDalsiPripominkuProUdalost } from './types'
import { useKalendarStore } from './useKalendar'

const MAX_ZPOZDENI = 2_147_483_647

let timer: ReturnType<typeof setTimeout> | undefined
let spusteno = false
const posledniOznameni = new Map<string, number>()

function naplanuj() {
  if (timer !== undefined) clearTimeout(timer)
  timer = undefined

  const ted = Date.now()
  const udalosti = useKalendarStore.getState().udalosti
  const dalsi = udalosti.flatMap(udalost => {
    const poPosledni = (posledniOznameni.get(udalost.id) ?? -Infinity) + 1
    const od = Math.max(ted, poPosledni)
    const zpozdeni = najdiDalsiPripominkuProUdalost(udalost, new Date(od))
    return zpozdeni === null ? [] : [{ udalost, cas: od + zpozdeni }]
  })

  if (!dalsi.length) return

  const nejblizsi = dalsi.reduce(
    (cas, polozka) => Math.min(cas, polozka.cas),
    Infinity
  )
  const cekani = Math.max(0, nejblizsi - Date.now())

  // Delší interval se odpočítá po částech, aby prohlížeč nepřetekl
  // přes největší hodnotu podporovanou setTimeout.
  if (cekani > MAX_ZPOZDENI) {
    timer = setTimeout(naplanuj, MAX_ZPOZDENI)
    return
  }

  timer = setTimeout(() => {
    const aktualniCas = Date.now()

    for (const { udalost, cas } of dalsi) {
      if (
        cas > aktualniCas ||
        (posledniOznameni.get(udalost.id) ?? -Infinity) >= cas
      ) {
        continue
      }

      posledniOznameni.set(udalost.id, cas)

      const text = udalost.celodenni || !udalost.casOd
        ? udalost.nazev
        : `${udalost.nazev} v ${udalost.casOd}`

      void showAppNotification('Blíží se událost', text, `kalendar-${udalost.id}`)
    }

    naplanuj()
  }, cekani)
}

export function setupKalendarReminders() {
  if (spusteno) return
  spusteno = true

  useKalendarStore.subscribe(naplanuj)

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') naplanuj()
  })

  window.addEventListener('focus', naplanuj)
  window.addEventListener('online', naplanuj)
  naplanuj()
}
