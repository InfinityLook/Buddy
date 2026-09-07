// ==========================================
// Vylepšení — úvodní tutorial pro nováčky (UvodniTutorial.tsx). Čistě
// kosmetický "už jsem to viděl" příznak, ne herní/gamifikační stav —
// obyčejný localStorage, ne secureStorage (appka ho neregistruje v
// BACKUP_STORES ze stejného důvodu, jako appka nezálohuje třeba
// "poslední otevřenou záložku" nikde jinde: ztráta tohohle příznaku při
// obnově zálohy by nanejvýš znamenala, že appka tutorial ukáže znovu,
// ne žádnou ztrátu skutečných dat). Obalené v try/catch — appka nechce
// spadnout jen proto, že localStorage není dostupný (soukromé okno,
// zakázaná úložiště webu).
// ==========================================

const KLIC = 'souboj-tutorial-v1-zobrazen'

export const jeTutorialZobrazen = (): boolean => {
  try {
    return localStorage.getItem(KLIC) === '1'
  } catch {
    return true // appka radši tutorial přeskočí, než aby appka kvůli němu spadla
  }
}

export const oznacTutorialZaZobrazeny = (): void => {
  try {
    localStorage.setItem(KLIC, '1')
  } catch {
    // Nic — appka to jen zkusí znovu příště, žádná ztráta dat v sázce.
  }
}
