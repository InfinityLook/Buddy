import type { Kniha } from '@/miniapps/book-writer/types'
import type { Scenar } from '@/miniapps/screenplay-writer/types'
import type { Komiks } from '@/miniapps/comic-writer/types'
import { najdiUryvek, obsahujeDotaz } from './writerRoomSearch'

// ==========================================
// Křížové hledání napříč VŠEMI knihami/scénáři/komiksy najednou — dřív
// appka uměla hledat jen uvnitř jednoho konkrétního díla (Osnova
// každé appky zvlášť), takže najít úryvek textu bez tušení, ve kterém
// konkrétním díle vlastně je, znamenalo otevírat jedno dílo za druhým
// a zkoušet to ručně. Tohle je jedna vrstva navíc nad
// writerRoomSearch.ts's obecnými najdiUryvek/obsahujeDotaz primitivami
// — ty samy zůstávají appkově "hloupé" (neví nic o Knize/Scénáři/
// Komiksu), tenhle soubor je to jediné místo, co ví, KDE se v které
// appce hledá (název/text/poznámka kapitoly; místo/čas/prvky scény;
// vizuál/řádky panelu).
//
// Výsledek je jen náhled (dílo, konkrétní kapitola/scéna/panel, krátký
// úryvek) — stejná "browse zde, akce ve appce, co to vlastně vlastní"
// zdrženlivost jako Growth Roomovo "Moje cíle" nebo Uloženo jinde v
// appce. Appka neumí (a nebuduje) skok přímo na konkrétní kapitolu ze
// dashboardu — otevře celou appku (Kniha/Scénář/Komiks), odkud si
// autor tu jednu položku najde sám, stejně jako by to udělal přes
// appčino vlastní tlačítko "Otevřít".
// ==========================================

export type DruhDilaHledani = 'kniha' | 'scenar' | 'komiks'

export interface VysledekHledaniNaprocVsim {
  druh: DruhDilaHledani
  dilaId: string
  dilaNazev: string
  // Konkrétní kapitola/scéna/panel, kde zásah padl — appka ho zobrazí
  // jako druhý řádek výsledku, ať autor ví, KDE v tom díle hledat, ne
  // jen ve kterém díle.
  polozka: string
  uryvek: string
}

// appka appku nezahltí desítkami výsledků na jeden obecný dotaz (např.
// "a") — stejný praktický strop jako appčino "20 výsledků" u
// hledej_podle_jmena()/hledej_podle_hashtagu() jinde v appce.
const MAX_VYSLEDKU_NAPROC_VSIM = 30

export const hledejNaprocVsim = (
  dotaz: string,
  knihy: Kniha[],
  scenare: Scenar[],
  komiksy: Komiks[]
): VysledekHledaniNaprocVsim[] => {
  const cistyDotaz = dotaz.trim()
  if (!cistyDotaz) return []

  const vysledky: VysledekHledaniNaprocVsim[] = []

  for (const kniha of knihy) {
    for (const kapitola of kniha.kapitoly) {
      const zasahVNazvu = obsahujeDotaz(kapitola.nazev, cistyDotaz)
      if (!zasahVNazvu && !obsahujeDotaz(kapitola.text, cistyDotaz) && !obsahujeDotaz(kapitola.stitky, cistyDotaz)) continue
      const uryvek = zasahVNazvu
        ? kapitola.text.trim() === ''
          ? '(prázdná kapitola)'
          : kapitola.text.slice(0, 70)
        : najdiUryvek(kapitola.text, cistyDotaz) ?? najdiUryvek(kapitola.stitky, cistyDotaz) ?? kapitola.text.slice(0, 70)
      vysledky.push({ druh: 'kniha', dilaId: kniha.id, dilaNazev: kniha.nazev, polozka: `Kapitola: ${kapitola.nazev}`, uryvek })
    }
  }

  for (const scenar of scenare) {
    scenar.sceny.forEach((scena, i) => {
      const zasahVMiste = obsahujeDotaz(scena.misto, cistyDotaz) || obsahujeDotaz(scena.cas, cistyDotaz) || obsahujeDotaz(scena.stitky, cistyDotaz)
      const prvekSeZasahem = scena.prvky.find(
        (p) => obsahujeDotaz(p.text, cistyDotaz) || (p.typ === 'dialog' && obsahujeDotaz(p.postava, cistyDotaz))
      )
      if (!zasahVMiste && !prvekSeZasahem) return
      const uryvek = prvekSeZasahem
        ? najdiUryvek(prvekSeZasahem.text, cistyDotaz) ?? prvekSeZasahem.text.slice(0, 70)
        : `${scena.typMista}. ${scena.misto} – ${scena.cas}`
      vysledky.push({ druh: 'scenar', dilaId: scenar.id, dilaNazev: scenar.nazev, polozka: `Scéna ${i + 1}`, uryvek })
    })
  }

  for (const komiks of komiksy) {
    for (const strana of komiks.strany) {
      strana.panely.forEach((panel, i) => {
        const zasahVeVizualu = obsahujeDotaz(panel.vizual, cistyDotaz)
        const radekSeZasahem = panel.radky.find((r) => obsahujeDotaz(r.text, cistyDotaz) || obsahujeDotaz(r.postava, cistyDotaz))
        if (!zasahVeVizualu && !radekSeZasahem) return
        const uryvek = zasahVeVizualu
          ? najdiUryvek(panel.vizual, cistyDotaz) ?? panel.vizual
          : (radekSeZasahem && najdiUryvek(radekSeZasahem.text, cistyDotaz)) || radekSeZasahem?.text || panel.vizual
        vysledky.push({
          druh: 'komiks',
          dilaId: komiks.id,
          dilaNazev: komiks.nazev,
          polozka: `Strana ${strana.cislo}, panel ${i + 1}`,
          uryvek,
        })
      })
    }
  }

  return vysledky.slice(0, MAX_VYSLEDKU_NAPROC_VSIM)
}
