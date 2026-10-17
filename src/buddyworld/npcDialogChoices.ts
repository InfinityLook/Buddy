/** Volitelné rozhovory pro tři obyvatele. Nemění odměny ani příběhový postup. */
export type DialogNpcId = 'elara' | 'kael' | 'mira'
export interface VolbaDialogu { id: string; otazka: string; odpoved: string }
export const VOLBY_DIALOGU: Readonly<Record<DialogNpcId, readonly VolbaDialogu[]>> = {
  elara: [
    { id: 'vesnice', otazka: 'Jak mohu pomoci vesnici?', odpoved: 'Začni průzkumem stezky a pomáhej sousedům. Každá drobná pomoc posiluje naši osadu.' },
    { id: 'historie', otazka: 'Co se stalo se starou osadou?', odpoved: 'Kdysi ji chránilo světlo krystalů. Jeho původ stále zkoumáme.' },
  ],
  kael: [
    { id: 'bezpeci', otazka: 'Je cesta do lesa bezpečná?', odpoved: 'Drž se značek, sleduj své zdraví a nechoď nepřipravený za hranice stezky.' },
    { id: 'vycvik', otazka: 'Jak se připravit na boj?', odpoved: 'Nauč se správně uhýbat a krýt. Ne každého nepřítele porazíš pouhým útokem.' },
  ],
  mira: [
    { id: 'stavba', otazka: 'Co potřebujeme na stavění?', odpoved: 'Především dřevo a kámen. Suroviny získáš průzkumem a pomocí obyvatelům.' },
    { id: 'plany', otazka: 'Co postavíme jako další?', odpoved: 'Až získáme materiál a důvěru obyvatel, otevřou se nám další možnosti rozšíření.' },
  ],
}
export function volbyProNpc(id: string): readonly VolbaDialogu[] {
  return Object.prototype.hasOwnProperty.call(VOLBY_DIALOGU, id) ? VOLBY_DIALOGU[id as DialogNpcId] : []
}
export function odpovedNpc(id: string, volbaId: string): string | null {
  return volbyProNpc(id).find(v => v.id === volbaId)?.odpoved ?? null
}
