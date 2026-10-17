import { nactiElaraObjev } from './elaraPribeh'

export interface ZaznamKroniky { id: string; nadpis: string; text: string; odemceno: boolean }
export interface KronikaPostup { kristalova: boolean; druha: boolean; treti: boolean; elara: boolean; kael: boolean }

/** Čistý, pouze čtecí přehled; žádné XP ani suroviny. */
export function sestavKroniku(p: KronikaPostup): ZaznamKroniky[] {
  return [
    { id: 'kristal', nadpis: 'Krystalová mýtina', text: 'První krystalová výprava byla dokončena.', odemceno: p.kristalova },
    { id: 'druha', nadpis: 'Druhá výprava', text: 'Další kapitola dobrodružství je za tebou.', odemceno: p.druha },
    { id: 'treti', nadpis: 'Třetí výprava', text: 'Pokračování příběhu je dokončeno.', odemceno: p.treti },
    { id: 'elara', nadpis: 'Elařino tajemství', text: 'Elara zapsala poznatky o staré osadě.', odemceno: p.elara },
    { id: 'kael', nadpis: 'Kaelův výcvik', text: 'Úspěšně dokončený osobní výcvik strážce.', odemceno: p.kael },
  ]
}
export function nactiKronikuElary(storage: Pick<Storage, 'getItem'>): boolean {
  return nactiElaraObjev(storage)
}
