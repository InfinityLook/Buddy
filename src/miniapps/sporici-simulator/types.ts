// ==========================================
// Spořicí/investiční simulátor — Economy Roomova nová appka. Čistá
// matematika složeného úročení, žádná závislost na reálných tržních
// datech (appka nikde nemá živý kurz/burzovní feed) — appka to sama
// hlásí přímo v UI jako simulaci s pevně zadaným úrokem, ne investiční
// radu. Čisté funkce, testovatelné bez store/komponenty, stejný důvod
// jako Financí vlastní types.ts (žádná závislost na core/utils/notify.ts,
// tahle appka notifikace vůbec nepoužívá).
// ==========================================

export interface RocniBodSporeni {
  /** Kolikátý rok simulace (1, 2, 3, ...). */
  rok: number
  /** Kolik bylo do konce tohoto roku celkem vloženo (počáteční vklad +
   *  součet měsíčních vkladů), bez úroku. */
  vlozeno: number
  /** Kolik z celkové částky ke konci tohoto roku tvoří úrok/zisk —
   *  celkem mínus vlozeno. */
  urok: number
  /** Celková částka ke konci tohoto roku (vlozeno + urok). */
  celkem: number
}

/** Simulace spoření se složeným úrokem, počítaná měsíc po měsíci a
 *  agregovaná po rocích pro zobrazení (appka nepotřebuje ukazovat
 *  všech 360 měsíců desetiletého plánu, jen roční mezisoučty). Úrok se
 *  připisuje měsíčně (rocniUrokProcenta / 12), ne jednou ročně — reálné
 *  spořicí účty/fondy taky obvykle úročí častěji než jednou za rok, a
 *  appka radši mírně nadhodnotí přesnost výpočtu než aby předstírala
 *  hrubší model. */
export const simulujSporeni = (
  pocatecniVklad: number,
  mesicniVklad: number,
  rocniUrokProcenta: number,
  pocetLet: number
): RocniBodSporeni[] => {
  const mesicniUrok = rocniUrokProcenta / 100 / 12
  let celkem = Math.max(0, pocatecniVklad)
  let vlozeno = Math.max(0, pocatecniVklad)
  const body: RocniBodSporeni[] = []

  for (let rok = 1; rok <= pocetLet; rok++) {
    for (let mesic = 0; mesic < 12; mesic++) {
      celkem = celkem * (1 + mesicniUrok) + Math.max(0, mesicniVklad)
      vlozeno += Math.max(0, mesicniVklad)
    }
    body.push({
      rok,
      vlozeno: Math.round(vlozeno),
      urok: Math.round(celkem - vlozeno),
      celkem: Math.round(celkem),
    })
  }

  return body
}

/** Kolik je potřeba měsíčně spořit, aby appka za `pocetLet` let se
 *  zadaným úrokem dosáhla `cilovaCastka` — obrácený výpočet ke
 *  simulujSporeni (řeší anuitní vzorec pro splátku M ze vztahu
 *  FV = P·(1+i)^n + M·((1+i)^n − 1)/i). Nulový úrok appka počítá
 *  zvlášť (dělení nulou by jinak vrátilo NaN) jako prostý lineární
 *  nedostatek rozdělený rovnoměrně do měsíců. Vrací 0, pokud počáteční
 *  vklad sám o sobě cíl už splňuje nebo ho přesahuje — appka nikdy
 *  nedoporučí zápornou měsíční splátku. */
export const vypocitejPotrebnyMesicniVklad = (
  cilovaCastka: number,
  pocatecniVklad: number,
  rocniUrokProcenta: number,
  pocetLet: number
): number => {
  const pocetMesicu = pocetLet * 12
  if (pocetMesicu <= 0) return 0

  const mesicniUrok = rocniUrokProcenta / 100 / 12
  const hodnotaPocatecnihoVkladu =
    mesicniUrok === 0 ? pocatecniVklad : pocatecniVklad * Math.pow(1 + mesicniUrok, pocetMesicu)

  const zbyva = cilovaCastka - hodnotaPocatecnihoVkladu
  if (zbyva <= 0) return 0

  if (mesicniUrok === 0) return Math.ceil(zbyva / pocetMesicu)

  const anuitniFaktor = (Math.pow(1 + mesicniUrok, pocetMesicu) - 1) / mesicniUrok
  return Math.ceil(zbyva / anuitniFaktor)
}

// ==========================================
// Uložené scénáře — appka si drží jen konfiguraci (vstupy), ne
// vypočtenou tabulku samotnou — ta se dopočítá znovu při každém
// otevření (simulujSporeni je levná čistá funkce), stejná "evaluate on
// read, never trust what's stored" úvaha jako jinde v appce.
// ==========================================

export interface SporiciScenar {
  id: string
  nazev: string
  pocatecniVklad: number
  mesicniVklad: number
  rocniUrokProcenta: number
  pocetLet: number
  createdAt: string
}
