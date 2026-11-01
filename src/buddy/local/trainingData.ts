import { normalizeIntentText } from './intentModel.ts'
import type { IntentExample } from './intentModel.ts'

// Data se používají při trénování. Telefon načítá výsledný model.
// Varianty oslovení nejsou další nezávisle nasbírané příklady.

export const BUDDY_INTENTS = [
  'greeting', 'identity', 'help', 'thanks', 'goodbye', 'small_talk',
  'open_module', 'create_note', 'create_task', 'start_pomodoro',
  'change_theme', 'cancel', 'unknown',
] as const

export type BuddyIntent = (typeof BUDDY_INTENTS)[number]

const lines = (text: string): string[] =>
  text.split(/[|\n]/).map((line) => line.trim()).filter(Boolean)

const trainingPhrases: Record<BuddyIntent, readonly string[]> = {
  greeting: lines(`
    Ahoj | Čau Buddy | Dobrý den | Dobré ráno
    Dobrý večer | Zdravím tě | Nazdar kamaráde | Ahojky
    Čauky | Tak jsem zase tady | Ahoj můj parťáku | Zdravíčko
    Nazdar | Čau | Zdar | Ahoj Buddy rád tě vidím
    Hezké ráno | Pěkný večer | Nazdárek | Zdravím svého asistenta
    Zdar parťáku | Tak ahoj jsem zpátky | Dobré poledne | Vítám tě kamaráde
  `),
  identity: lines(`
    Kdo jsi | Jak se jmenuješ | Řekni mi něco o sobě | Představ se mi
    Jsi Buddy | Jsi člověk nebo program | Co jsi zač | Jak ti mám říkat
    Jsi můj asistent | Jaké je tvoje jméno | Chci vědět kdo jsi | Pověz mi kdo jsi
    Pověz mi své jméno | Řekneš mi jak se jmenuješ | Kdo mi tady odpovídá | S kým mluvím
    Jak se představuješ | Jaké máš jméno | Kdo vlastně jsi | Co jsi za pomocníka
    Jak se jmenuje můj pomocník | Představ mi sebe | Řekni svoje jméno | Kdo je Buddy
  `),
  help: lines(`
    Co umíš | S čím mi pomůžeš | Potřebuji nápovědu | Jak tě mám používat
    Jaké příkazy znáš | Ukaž mi své možnosti | S čím mi můžeš pomoct | Jak funguje tvoje ovládání
    Vysvětli mi své funkce | Co po tobě mohu chtít | Poraď mi jak začít | Potřebuji pomoc s Buddym
    Nápověda | Pomoc | Ukaž dostupné příkazy | Jaké funkce nabízíš
    Vypiš co dokážeš | S čím mi dokážeš pomoci | Jak ti zadat požadavek | Co všechno zvládneš
    Jak se ovládá Buddy | Potřebuju poradit s ovládáním | Předveď svoje schopnosti | Jaké máš možnosti
  `),
  thanks: lines(`
    Děkuji | Díky moc | Dík | To mi pomohlo
    Děkuju za pomoc | Super díky | Paráda děkuji | Moc jsi mi pomohl
    Díky parťáku | Děkuji to je vše | To je skvělé díky | Děkuju Buddy
    Děkuju | Díky za pomoc | Velice děkuji | Mnohokrát děkuju
    To bylo užitečné díky | Díky povedlo se to | Děkuju moc za radu | Pomohl jsi mi děkuju
    Dík za tvoji radu | Super tohle pomohlo | Jsi šikovný děkuji | Děkuju to jsem potřeboval
  `),
  goodbye: lines(`
    Ahoj zatím | Měj se hezky | Na shledanou | Dobrou noc
    Tak zase příště | Zatím se loučím | Uvidíme se později | Musím jít tak ahoj
    Končím rozhovor | Pro dnešek se loučím | Zatím čau | Ozvu se později
    Zatím ahoj | Tak se měj | Loučím se | Už musím odejít
    Uvidíme se zítra | Přeji dobrou noc | Měj pěkný zbytek dne | Čau zase někdy
    Teď odcházím ahoj | Pro dnešek končím | Tak příště na viděnou | Jdu spát dobrou
  `),
  small_talk: lines(`
    Jak se máš | Jak se ti daří | Co právě děláš | Jsi tu se mnou
    Jaký máš den | Dnes mám dobrou náladu | Mám se dobře | Jsem trochu unavený
    Dnes jsem toho hodně zvládl | Rád tě vidím | Potřebuju trochu povzbudit | Děláš mi společnost
    Jak se dnes cítíš | Co je u tebe nového | Jak se vede | Jaký byl tvůj den
    Dneska se mi dařilo | Mám radost z dnešního dne | Dnes jsem unavená | Potřebuji povzbudit
    Jsem dnes bez energie | Mám za sebou náročný den | Chci si chvíli povídat | Dnes mám skvělou náladu
  `),
  open_module: lines(`
    Otevři chat | Přepni mě do zpráv | Ukaž můj profil | Otevři nastavení
    Jdi do aplikací | Vrať mě na hlavní obrazovku | Otevři poznámky | Zobraz plánovač úkolů
    Přejdi do School Roomu | Otevři Fitness Room | Ukaž mi Pomodoro | Otevři ji
    Otevři mi profil | Ukaž moje zprávy | Zobraz mi poznámky | Přejdi do nastavení
    Přepni mě do aplikací | Jdi do plánovače | Vrať mě domů | Otevři Economy Room
    Otevři Growth Room | Otevři Music Room | Otevři Writer Room | Zobraz feed
    Jdi do poznámek | Přejdi do poznámek | Ukaž poznámky | Otevři moje poznámky
    Zobraz mi uložené poznámky | Přepni mě do poznámek | Jdi do chatu | Zobraz mi profil
    Ukaž nastavení | Otevři plánovač | Jdi do Pomodora | Vrať mě na hub
  `),
  create_note: lines(`
    Vytvoř poznámku | Zapiš mi poznámku | Ulož novou poznámku | Potřebuji si něco poznamenat
    Chci novou poznámku | Napiš poznámku: zítra přinést notebook | Poznamenej mi nápad na projekt | Vytvoř mi poznámku o biologii
    Zapiš do poznámek že mám koupit sešit | Přidej poznámku: seznam knih | Ulož do poznámek tento text | Chci si zapsat myšlenku
    Vytvoř mi novou poznámku | Zapiš poznámku: nápady na víkend | Ulož poznámku: koupit mléko | Přidej novou poznámku
    Napiš mi poznámku | Založ poznámku o projektu | Potřebuju si zapsat nápad | Chci si něco poznamenat
    Poznamenej si seznam pomůcek | Zapiš do poznámek myšlenku | Vytvoř poznámku: recept na večeři | Ulož mi poznámku z přednášky
  `),
  create_task: lines(`
    Přidej úkol | Vytvoř nový úkol | Zapiš mi úkol do plánovače | Přidej úkol: dokončit prezentaci
    Naplánuj mi úkol na zítřek | Chci přidat úkol na matematiku | Ulož úkol: přečíst kapitolu | Vytvoř mi úkol na pátek
    Přidej do plánu odevzdání projektu | Potřebuji nový úkol | Založ úkol na učení | Chci si naplánovat domácí úkol
    Vytvoř mi úkol | Založ nový úkol | Přidej mi nový úkol do plánovače | Napiš úkol: procvičit slovíčka
    Zapiš úkol: uklidit stůl | Naplánuj úkol na pondělí | Potřebuju přidat úkol | Chci vytvořit úkol
    Přidej úkol s vysokou prioritou | Založ úkol: odevzdat seminárku | Vytvoř úkol na příští týden | Ulož nový úkol do plánovače
  `),
  start_pomodoro: lines(`
    Spusť pomodoro | Zapni časovač na 25 minut | Chci se soustředit 20 minut | Spusť soustředění na půl hodiny
    Nastartuj pomodoro na 15 minut | Začni pracovní blok | Spusť mi časovač soustředění | Zapni pomodoro na 45 minut
    Chci začít pomodoro | Nastav časovač soustředění na deset minut | Začni odpočítávat 30 minut práce | Pusť časovač na učení
    Zapni mi pomodoro | Spusť mi pomodoro na dvacet minut | Nastav pomodoro na třicet minut | Začni soustředění
    Chci se učit půl hodiny | Spusť pracovní blok na patnáct minut | Zapni soustředění na hodinu | Pusť pomodoro
    Začni pomodoro na 50 minut | Spusť časovač na 10 minut | Nastartuj soustředění na 40 minut | Zapni pracovní časovač
  `),
  change_theme: lines(`
    Změň vzhled | Přepni motiv na Zlatý soumrak | Nastav Neonovou noc | Chci motiv Polární záře
    Zapni vzhled Lesní klid | Změň motiv na Čistý den | Vyber jiný vzhled aplikace | Nastav mi nový motiv
    Přepni vzhled aplikace | Chci změnit barevný motiv | Použij motiv Zlatý soumrak | Změň vzhled na Neonovou noc
    Změň mi motiv | Nastav motiv Čistý den | Použij vzhled Lesní klid | Přepni aplikaci na Polární záři
    Chci vzhled Zlatý soumrak | Vyber motiv Neonová noc | Nastav mi Lesní klid | Změň společný motiv
    Přepni barevný vzhled | Použij jiný motiv aplikace | Nastav vzhled Zlatý soumrak | Chci přepnout na Čistý den
  `),
  cancel: lines(`
    Zruš to | Storno | Nech to být | Rozmyslel jsem si to
    Nic nedělej | Zruš rozpracovaný požadavek | Už to nechci | Přestaň s tím
    Zrušit | Zruš zadávání | Vraťme se zpátky | Teď to necháme
    Zruš aktuální požadavek | Stornuj zadání | Nechme to být | Rozmyslela jsem si to
    Zruš celou akci | Už nechci pokračovat | Ukonči zadávání | Zahoď rozpracované zadání
    Raději to zruš | Odvolej můj požadavek | Přeruš tento požadavek | Zruš poslední zadání
  `),
  unknown: lines(`
    Jaké bude zítra počasí | Kolik stojí bitcoin | Vysvětli mi kvantovou fyziku | Napiš mi dlouhý příběh
    Vypočítej složitý integrál | Objednej mi jídlo | Zaplať za mě nákup | Pošli zprávu kamarádovi
    Smaž všechny poznámky | Vymaž můj účet | Neotevírej chat | Nechci otevřít poznámky
    Nespouštěj pomodoro | Neukládej žádnou poznámku | Nepřidávej úkol | Neměň vzhled aplikace
    Co znamená příkaz otevři chat | Když řeknu spusť pomodoro tak nic nedělej | Kde koupím nový telefon | Přelož mi článek do japonštiny
    Otevři chat a pak smaž poznámky | Vypni běžící pomodoro | Napiš mi vlastní program | Kdo vyhrál poslední mistrovství světa
    Neotevírej nastavení | Nechci přidat žádný úkol | Nevytvářej poznámku | Nezapínej soustředění
    Neměň motiv | Nemaž moje poznámky | Smaž úkol z plánovače | Uprav poslední poznámku
    Označ všechny úkoly jako hotové | Pošli email učiteli | Otevři bankovnictví | Najdi mi levnou letenku
    Řekni mi dnešní zprávy ze světa | Kolik mám dnes úkolů | Vyhledej poznámku o chemii | Jak se používá příkaz vytvoř poznámku
    Jen vysvětli co znamená změň motiv | Otevři poznámky a pak spusť pomodoro | Zapiš poznámku a potom otevři chat | Kup mi lístek na vlak
    Stáhni soubor z internetu | Zavolej mému kamarádovi | Zapni pomodoro a potom změň motiv | Jaký je aktuální kurz eura
    Nechci motiv Neonová noc | Neměň vzhled na Zlatý soumrak | Nezapínej časovač na dvacet minut | Nespouštěj pomodoro na 45 minut
    Nechci spustit soustředění na hodinu | Neměň mi motiv na Čistý den | Nepřidávej úkol na zítřek | Neukládej poznámku o škole
    Neotevírej moje zprávy | Nechci jít do profilu | Jen vysvětli příkaz spusť časovač | Co znamená požadavek změň vzhled
  `),
}

const conversationIntents = new Set<BuddyIntent>([
  'greeting', 'identity', 'help', 'thanks', 'goodbye', 'small_talk',
])

const buildTrainingExamples = (): IntentExample[] => {
  const examples: IntentExample[] = []
  const seen = new Map<string, BuddyIntent>()

  for (const intent of BUDDY_INTENTS) {
    for (const phrase of trainingPhrases[intent]) {
      const variants = [
        phrase,
        `Buddy, ${phrase}`,
        conversationIntents.has(intent)
          ? `${phrase}, Buddy`
          : `Prosím, ${phrase}`,
      ]

      for (const text of variants) {
        const normalized = normalizeIntentText(text)
        const previous = seen.get(normalized)

        if (previous !== undefined && previous !== intent) {
          throw new Error(`Rozporný trénovací příklad: ${text}`)
        }

        if (previous === undefined) {
          seen.set(normalized, intent)
          examples.push({ text, intent })
        }
      }
    }
  }

  return examples
}

export const TRAINING_EXAMPLES: IntentExample[] = buildTrainingExamples()

// Tyto formulace zůstávají mimo trénování. Slouží k průběžnému ověřování.
// Nejde o nezávislý benchmark ani záruku rozpoznání libovolné češtiny.
const validationPhrases: Record<BuddyIntent, readonly string[]> = {
  greeting: lines(`
    Ahoj příteli | Hezký dobrý večer Buddy | Zdravím svého parťáka
  `),
  identity: lines(`
    Můžeš se mi představit | Připomeň mi svoje jméno | S kým si právě píšu
  `),
  help: lines(`
    V čem mi dokážeš pomoct | Potřebuji vysvětlit jak tě ovládat | Ukaž přehled svých schopností
  `),
  thanks: lines(`
    Díky za tvoji pomoc | Tohle mi hodně pomohlo | Mockrát ti děkuju
  `),
  goodbye: lines(`
    Pro dnešek se rozloučíme | Zase se ozvu tak se měj | Hezkou dobrou noc
  `),
  small_talk: lines(`
    Jak ti dneska je | Mám za sebou dobrý den | Dneska jsem docela unavená
  `),
  open_module: lines(`
    Otevři mi prosím chat | Přesuň mě do nastavení | Ukaž mi moje poznámky
  `),
  create_note: lines(`
    Ulož mi prosím novou poznámku | Potřebuju si poznamenat nápad | Zapiš poznámku: koupit učebnici
  `),
  create_task: lines(`
    Založ mi prosím nový úkol | Přidej mi do plánu úkol na středu | Vytvoř úkol: připravit podklady
  `),
  start_pomodoro: lines(`
    Zapni mi prosím pomodoro | Spusť pracovní blok na 35 minut | Začni časovač soustředění na 40 minut
  `),
  change_theme: lines(`
    Nastav vzhled na Polární záři | Použij prosím Lesní klid | Přepni mi motiv na Čistý den
  `),
  cancel: lines(`
    Zruš prosím rozpracované zadání | Už v tom nechci pokračovat | Celé to stornuj
  `),
  unknown: lines(`
    Prosím neotevírej můj profil | Nespouštěj mi časovač | Pošli peníze z mého účtu
  `),
}

export const VALIDATION_EXAMPLES: IntentExample[] = BUDDY_INTENTS.flatMap(
  (intent) => validationPhrases[intent].map((text) => ({ text, intent })),
)
