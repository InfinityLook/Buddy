// ==========================================
// Krok 14a (Hubův "Osobní pozdrav") — čistá funkce, co appka otestuje
// bez hodin/data v reálném čase. Appka jméno NEohýbá do 5. pádu
// (vokativu) — appka by si na to musela stavět vlastní české skloňování
// jmen, co appka nemá nikde jinde v kódu a se jménem zadaným volně
// uživatelem by to šlo snadno špatně (stejná "appka jméno bere tak, jak
// je zadáno, žádné domýšlení" tolerance, co appka má i u Writer's
// Roomova přejmenování). Appka proto píše jméno v 1. pádě za čárkou
// ("Dobré ráno, Petr 👋") — běžný, neformální tvar, co česká UI appky
// appka takhle zjednodušuje běžně.
// ==========================================

export const pozdravPodleCasu = (hodina: number = new Date().getHours()): string => {
  if (hodina >= 5 && hodina < 12) return 'Dobré ráno'
  if (hodina >= 12 && hodina < 18) return 'Dobré odpoledne'
  if (hodina >= 18 && hodina < 22) return 'Dobrý večer'
  return 'Dobrou noc'
}
