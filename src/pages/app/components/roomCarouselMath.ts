// Čistá matematika za RoomCarousel.tsx — žádný DOM, žádný React, ať se dá
// ověřit bez prohlížeče stejným způsobem jako appčiny jiné "engine"
// moduly (např. fighting/combat/engine.ts). Komponenta sama volá tyhle
// funkce, ne naopak.

// Kolik pixelů musí prst/kurzor ujet, než appka tažení bere jako
// skutečné potvrzení "přejít na dalšího/předchozího souseda", ne jen
// nedopatření/klik.
export const DRAG_PRAH_PX = 60

// Maximální náklon karty ve stupních při plném tažení přes celou šířku
// plochy — nikdy víc, ať karta nezačne vypadat, že se láme.
export const MAX_NAKLON_STUPNU = 10

/** Zacyklený index — appka na obou koncích řady přechází na druhý konec,
 *  stejné chování jako core/navigation/roomStranky.ts's sousedniRoom(),
 *  jen vyjádřené jako jedno číslo místo dvou sousedů. */
export const zacykliIndex = (index: number, delka: number): number => {
  if (delka <= 0) return 0
  return ((index % delka) + delka) % delka
}

/** Skutečně přejet dost daleko, aby to appka brala jako gesto, ne
 *  nedopatření — porovnává jen absolutní vzdálenost, žádný poměr os.
 *  Tenhle carousel je čistě vodorovný, žádné svislé scrollování s ním
 *  nesoupeří, takže appka na rozdíl od appčiných jiných swipe-jako
 *  mechanismů nepotřebuje ověřovat, že tažení vodorovnou dráhou
 *  výrazně převažuje nad svislou. */
export const melByPotvrditTazeni = (deltaX: number, prah: number = DRAG_PRAH_PX): boolean =>
  Math.abs(deltaX) >= prah

/** Procento, jak daleko se táhne vůči šířce plochy, vždy v rozsahu
 *  <-1, 1> — i kdyby prst ujel dál než šířka karty (appka to nenechá
 *  vizuálně "přetéct"). */
export const tazeniProcento = (deltaX: number, sirkaPlochy: number): number => {
  if (sirkaPlochy <= 0) return 0
  return Math.max(-1, Math.min(1, deltaX / sirkaPlochy))
}

/** Náklon aktivní karty během tažení — táhneš doleva (deltaX < 0,
 *  procento záporné), karta se nakloní doprava (kladný úhel), jako by
 *  ji prst odstrkoval pryč ve směru tažení. */
export const dragNaklonStupnu = (
  deltaX: number,
  sirkaPlochy: number,
  maxNaklon: number = MAX_NAKLON_STUPNU
): number => -tazeniProcento(deltaX, sirkaPlochy) * maxNaklon

/** Text živého štítku "naposledy navštíveno" na kartě Roomu —
 *  useAppStore.ts's `markAppOpened` (volané z RoomCarousel.tsx's
 *  onEnter) je appčin první skutečný zápis tohohle času pro Room, ne
 *  jen pro obyčejnou miniaplikaci přes setActiveAppId, takže
 *  chybějící/nulová hodnota je poctivý stav "appka to zatím nezná",
 *  ne 0 nebo vymyšlené číslo. Denní zrnitost, stejný důvod jako
 *  writerRoomFormat.ts's formatujNaposledyUpraveno (samostatná kopie,
 *  ne import odtamtud — appka do vlajkové appky z /apps stránky
 *  schválně nesahá, malá přijatá duplikace jako jinde u BARVY_UZLU). */
export const formatujNaposledyNavstiveno = (
  timestamp: number | null | undefined,
  ted: number = Date.now()
): string => {
  if (!timestamp) return 'Zatím nenavštíveno'

  const kdy = new Date(timestamp)
  const kdyDen = new Date(kdy.getFullYear(), kdy.getMonth(), kdy.getDate())
  const tedDatum = new Date(ted)
  const tedDen = new Date(tedDatum.getFullYear(), tedDatum.getMonth(), tedDatum.getDate())
  const rozdilDni = Math.round((tedDen.getTime() - kdyDen.getTime()) / 86_400_000)

  if (rozdilDni <= 0) return 'Dnes'
  if (rozdilDni === 1) return 'Včera'
  if (rozdilDni <= 6) return `Před ${rozdilDni} dny`

  const stejnyRok = kdy.getFullYear() === tedDatum.getFullYear()
  return kdy.toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: stejnyRok ? undefined : 'numeric',
  })
}
