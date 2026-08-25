// ==========================================
// Příběhové dialogové sekvence — data-driven, stejný důvod jako
// quests.ts: příběh nesmí být zadrátovaný v JSX. Quest si na sebe
// naváže dialog přes id (Quest.dialogPriPrijeti/dialogPriDokonceni v
// quests.ts), StoryDialog.tsx sekvenci jen přehraje řádek po řádku.
//
// mluvci '__hrac__'/'__buddy__' jsou schválně sentinely, ne pevné
// jméno — tahle data nevědí, kterou postavu hráč zrovna hraje (Kael,
// Lyra, …), StoryDialog.tsx je za běhu nahradí za postava.jmeno/ikona
// (resp. za pevnou identitu Buddyho). Cokoli jiného je NPC se svým
// vlastním jménem/ikonou přímo v datech.
//
// Dvě sekvence na quest — jeden dialog při přijetí, jeden po jeho
// splnění (přesně "Story" krok mezi soubojem/odměnou a návratem na
// mapu z herní smyčky). Další questy přidávají další sekvence sem,
// žádná nová soustava.
// ==========================================

export interface DialogRadek {
  /** Jméno mluvčího z dat, nebo '__hrac__'/'__buddy__' sentinel — viz komentář výš. */
  mluvci: string
  ikona: string
  text: string
}

export interface DialogSekvence {
  id: string
  radky: DialogRadek[]
}

export const STORY: Record<string, DialogSekvence> = {
  'ztracene-stene-prijeti': {
    id: 'ztracene-stene-prijeti',
    radky: [
      {
        mluvci: 'Stará vdova',
        ikona: '👵',
        text: 'Prosím, pomoz mi! Můj pes Skvrnitý utekl do polí, když se odtamtud přivalila ta podivná mlha.',
      },
      { mluvci: '__hrac__', ikona: '', text: 'Najdu ho. Slibuju.' },
      {
        mluvci: 'Stará vdova',
        ikona: '👵',
        text: 'Buď opatrný — v té mlze se něco pohybovalo. Něco, co tam předtím nebylo.',
      },
      { mluvci: '__buddy__', ikona: '', text: 'Půjdu s tebou. Ať je to cokoli, nejsi na to sám.' },
    ],
  },
  'ztracene-stene-dokonceni': {
    id: 'ztracene-stene-dokonceni',
    radky: [
      { mluvci: '__buddy__', ikona: '', text: 'Podívej — támhle za kamenem! Je v pořádku!' },
      { mluvci: 'Stará vdova', ikona: '👵', text: 'Skvrnitý! Ach, děkuju ti, děkuju z celého srdce!' },
      {
        mluvci: 'Stará vdova',
        ikona: '👵',
        text: 'Ta mlha... říkala jsem si, že to není náhoda. Něco se probouzí za Emberfallem. Možná bys to měl prozkoumat dál — až přijde čas.',
      },
    ],
  },
  'probuzeny-les-prijeti': {
    id: 'probuzeny-les-prijeti',
    radky: [
      {
        mluvci: 'Hlídka Greenhavenu',
        ikona: '🛡️',
        text: 'Nechoď tam sám. Trní roste rychleji, než ho stačíme sekat, a v noci slyšíme z lesa vrčení, co tam nikdy nebývalo.',
      },
      { mluvci: '__hrac__', ikona: '', text: 'Zjistím, co se tam probudilo.' },
      {
        mluvci: 'Hlídka Greenhavenu',
        ikona: '🛡️',
        text: 'Věčný les byl tichý celé věky. Ať je to cokoli, nemá to tam co dělat.',
      },
      { mluvci: '__buddy__', ikona: '', text: 'Stejná mlha jako u Emberfallu... tohle není náhoda, tuším to.' },
    ],
  },
  'probuzeny-les-dokonceni': {
    id: 'probuzeny-les-dokonceni',
    radky: [
      { mluvci: '__buddy__', ikona: '', text: 'Trní kolem něj vadne — bez něj ztrácí sílu.' },
      {
        mluvci: 'Hlídka Greenhavenu',
        ikona: '🛡️',
        text: 'Strážce lesa tu spal od nepaměti. Něco ho probudilo, a nebyla to náhoda.',
      },
      {
        mluvci: 'Hlídka Greenhavenu',
        ikona: '🛡️',
        text: 'Napřed Emberfall, teď Věčný les... jako by se probouzelo něco mnohem staršího.',
      },
    ],
  },
}
