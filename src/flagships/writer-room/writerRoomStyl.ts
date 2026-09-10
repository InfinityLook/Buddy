// ==========================================
// Kontrola nadužívaných slov — sdílená napříč všemi třemi appkami
// Writer's Roomu (Kniha/Scénář/Komiks), protože jde o identickou
// analýzu obyčejného textu bez ohledu na to, z jaké appky pochází — na
// rozdíl od sestavText*/ziskejPostavy (writerRoomSearch.ts/
// writerRoomNahradit.ts je stejný případ), které pracují s appce
// vlastním tvarem dokumentu, tahle funkce bere jen hotové úseky textu,
// co si appka sama poskládá ze svých kapitol/scén/panelů.
// ==========================================

// Malá, pevná sada nejběžnějších českých spojek/předložek/zájmen/tvarů
// slovesa "být" — bez ní by "a"/"se"/"na"/"je" vždycky vyhrálo jako
// "nejnadužívanější slovo" v jakémkoli českém textu, což autorovi
// neřekne vůbec nic užitečného o jeho vlastním stylu. Není to
// lingvisticky úplný seznam, jen orientační filtr pro tenhle jeden účel.
const STOPSLOVA = new Set([
  'se', 'si', 'na', 'do', 'za', 'po', 'ze', 'ke', 've', 'so', 'ale', 'nebo',
  'jako', 'když', 'aby', 'proto', 'taky', 'ještě', 'jsem', 'jsi', 'jsme',
  'jste', 'jsou', 'byl', 'byla', 'bylo', 'byli', 'byly', 'bude', 'budu',
  'budeš', 'toho', 'tomu', 'tom', 'tou', 'této', 'tento', 'tato', 'toto',
  'jeho', 'její', 'jejich', 'mně', 'tebe', 'tobě', 'nás', 'vás', 'však',
  'které', 'který', 'která', 'kterou', 'kteří', 'pro', 'při', 'nad', 'pod',
  'před', 'mezi', 'bez', 'kolem', 'kde', 'kdy', 'proč', 'jeden', 'jedna',
  'jedno', 'nic', 'něco', 'někdo', 'všechno', 'všichni', 'potom', 'tady',
  'tedy', 'jenom', 'pouze', 'znovu', 'najednou', 'trochu', 'vůbec',
])

export interface NaduzivaneSlovo {
  slovo: string
  pocet: number
}

/** Najde slova opakující se v textu podezřele často. Bere pole úseků
 *  textu (appka je vždy skládá z vlastních polí — kapitol/scén/panelů —
 *  ne z jednoho velkého řetězce, ať se sem netahá appce vlastní
 *  sestavText*), spojí je, rozdělí na slova (unicode-aware, ať to
 *  funguje i s diakritikou), vynechá krátká slova (méně než 4 znaky,
 *  kde skoro každé bývá spojka/předložka) a pevnou sadu výš, a vrátí
 *  ta, co se objevila aspoň `min`-krát, seřazená od nejčastějšího,
 *  omezená na `top` položek. */
export const najdiNaduzivanaSlova = (useky: string[], min = 5, top = 8): NaduzivaneSlovo[] => {
  const pocty = new Map<string, number>()
  const spojeny = useky.join(' ').toLowerCase()
  const slova = spojeny.match(/\p{L}+/gu) ?? []
  for (const slovo of slova) {
    if (slovo.length < 4 || STOPSLOVA.has(slovo)) continue
    pocty.set(slovo, (pocty.get(slovo) ?? 0) + 1)
  }
  return [...pocty.entries()]
    .filter(([, pocet]) => pocet >= min)
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([slovo, pocet]) => ({ slovo, pocet }))
}
