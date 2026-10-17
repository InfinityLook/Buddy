import { vedlejsiUkolyObyvatele, type ObyvatelId } from './npcInteractions'

/** Vztahy se odvozují z již uložených úkolů, takže staré uložené hry fungují bez migrace. */
export const PRAHY_DUVĚRY = [0, 1, 2] as const
export type UrovenDůvěry = 0 | 1 | 2
export const ODMENA_VZTAHU = { drevo: 6, kamen: 6, krystaly: 3 } as const

const TAJEMSTVI: Record<ObyvatelId, readonly [string, string]> = {
  elara: [
    'Když jsme sem přišli, našli jsme ve staré kronice jméno prvního strážce údolí.',
    'Světelný krystal kdysi chránil celé údolí. Teď potřebuje spojence, ne jen sílu.',
  ],
  kael: [
    'Před lety jsem na stezce potkal stín, který se bál světla tvého Buddyho.',
    'Strážce háje není jediná hrozba. V lese zůstala stará znamení.',
  ],
  mira: [
    'Pod základy prvního domu jsme našli kamenný znak starých stavitelů.',
    'Most i věže kdysi spojovala jedna cesta. Snad ji dokážeme obnovit.',
  ],
}

export function urovenDůvěry(id: string, splnene: readonly string[]): UrovenDůvěry {
  const ukoly = vedlejsiUkolyObyvatele(id)
  if (!ukoly.length) return 0
  const pocet = ukoly.filter(ukol => splnene.includes(ukol.id)).length
  return pocet >= 2 ? 2 : pocet >= 1 ? 1 : 0
}

export function textDůvěry(id: ObyvatelId, splnene: readonly string[]): string | null {
  const uroven = urovenDůvěry(id, splnene)
  return uroven ? TAJEMSTVI[id][uroven - 1] : null
}

export function lzeVyzvednoutOdmenuVztahu(id: string, splnene: readonly string[], prevzate: readonly string[]): boolean {
  return urovenDůvěry(id, splnene) === 2 && !prevzate.includes(id)
}

export function overPrevzateOdmenyVztahu(hodnota: unknown): ObyvatelId[] {
  const platne = new Set(['elara', 'kael', 'mira'])
  return Array.isArray(hodnota)
    ? [...new Set(hodnota.filter((id): id is ObyvatelId => typeof id === 'string' && platne.has(id)))]
    : []
}
