// ==========================================
// VIP-exkluzivní pevná sada finančních tipů, stejný tvar jako Fitness
// Roomovo data/koucovaciTipy.ts — appka nemá AI generátor rad, jde o
// ručně napsaný, pevný seznam. Den se z něj vybírá deterministicky
// podle dne v roce (viz EconomyRoomModule.tsx's financniTipDne), ne
// náhodně při každém načtení, ať se všem VIP účtům ve stejný den ukáže
// ten samý tip a ten samý se neukáže dvakrát za sebou jen náhodou.
// ==========================================
export const FINANCNI_TIPY: string[] = [
  'Pravidlo 50/30/20: 50 % příjmů na potřeby, 30 % na chtíče, 20 % na spoření — hrubý, ale funkční start rozpočtu.',
  'Než utratíš neplánovanou odměnu (dárek, prémie), počkej 24 hodin — impulzivní nákupy se v klidu často rozmyslí.',
  'Nastav si opakující se platbu na spoření hned po výplatě, ne až na konci měsíce — co zbyde, se totiž málokdy spoří.',
  'Rozpočet na kategorii má smysl, jen když ho appka doopravdy sleduje — nastav si limit u kategorie, kde nejčastěji přestřelíš.',
  'Malý nouzový polštář (i pár tisíc) na vlastní peněžence pomůže víc než řešit tu samou nečekanou výdaj až dodatečně dluhem.',
  'Sleduj trend víc měsíců dopředu, ne jen tenhle — jeden dražší měsíc (dovolená, dárky) nic nevypovídá o dlouhodobém návyku.',
  'Spořicí simulátor počítá se skutečným úrokem — vklad dřív má vždycky větší váhu než vklad později, i kdyby byl menší.',
  'Splácej nejdřív dluh s nejvyšším úrokem (metoda laviny), pokud ti nejde hlavně o rychlou psychologickou výhru z uzavřeného účtu.',
  'Opakující se platby appka umí zaznamenat samy — jednou nastavené předplatné se pak nezapomene zapsat ani jeden měsíc.',
  'Finanční cíl s termínem appku donutí spočítat, kolik měsíčně reálně potřebuješ — bez termínu zůstává jen přáním.',
  'Přesun mezi vlastními peněženkami appka nepočítá jako výdaj ani příjem — klidně si peníze rozděl na "běžný účet" a "spoření" bez obav o zkreslené statistiky.',
  'Účtenku vyfoť hned po nákupu — appka ji umí přiložit přímo k transakci, ať ji nemusíš hledat týden zpátky.',
]
