// ==========================================
// VIP-exkluzivní pevná sada koučovacích tipů. Appka nemá AI generátor
// rad — jde o ručně napsaný, pevný seznam. Den se z něj vybírá
// deterministicky podle dne v roce (viz FitnessRoomModule.tsx's
// tipDne), ne náhodně při každém načtení — stejný tip se tak neukáže
// dvakrát za sebou jen náhodou a všem VIP uživatelům se ve stejný den
// ukáže ten samý.
// ==========================================
export const KOUCOVACI_TIPY: string[] = [
  'Dej si pauzu mezi sériemi aspoň 60 vteřin — svaly se stihnou zregenerovat a další série bude silnější.',
  'Pomalejší sestup u dřepu (2–3 vteřiny dolů) zapojí svaly víc než rychlý pád do podřepu.',
  'Pij vodu i před tréninkem, ne jen po něm — dehydratace zhoršuje výkon dřív, než ji pocítíš.',
  'Krátká rozcvička před tréninkem snižuje riziko zranění — appka na ni má vlastní časovač.',
  'Postupné navyšování o jedno opakování týdně je udržitelnější než skok na maximum hned.',
  'Kvalitní spánek ovlivňuje regeneraci svalů stejně jako samotný trénink.',
  'Nádech při uvolnění, výdech při námaze — správné dýchání pomáhá udržet formu déle.',
  'I krátkých 10 minut pohybu je lepších než žádných — netlač na dokonalý trénink, jen na to, aby se stal.',
  'Zaznamenávej si náročnost sezení — pomůže ti to poznat, kdy si dát den volna.',
  'Strečink po tréninku zkracuje svalovou ztuhlost druhý den.',
  'Pestrost cviků (dřep, klik, výpad, prkno) zatěžuje tělo vyváženě, ne jen jednu skupinu svalů.',
  'Sleduj trend, ne jedno vážení — den ke dni váha kolísá i bez skutečné změny.',
]
