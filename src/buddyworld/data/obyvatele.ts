export interface ObyvatelDef { id: string; jmeno: string; role: string; barva: number; x: number; z: number; dialog: string }
export const OBYVATELE: readonly ObyvatelDef[] = [
  { id: 'elara', jmeno: 'Elara', role: 'Starostka', barva: 0x7e60b8, x: -2.5, z: 12, dialog: 'Vítej doma! Pomoz nám rozšířit naši osadu.' },
  { id: 'kael', jmeno: 'Kael', role: 'Strážce', barva: 0x4d83a6, x: 3, z: 13.5, dialog: 'Za lesem číhá nebezpečí. Buď připraven!' },
  { id: 'mira', jmeno: 'Mira', role: 'Stavitelka', barva: 0xd49351, x: -1, z: 17, dialog: 'Nasbírej materiály a společně postavíme město.' },
]
