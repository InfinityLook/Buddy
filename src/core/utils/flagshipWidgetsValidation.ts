import * as v from 'valibot'

// ==========================================
// Ověření uložených slotů "Můj widget" napříč vlajkovými appkami — viz
// src/flagships/shared/useFlagshipWidgets.ts. Appka neví odsud, které
// widgety daná vlajková appka doopravdy nabízí (to je věc jejích
// vlastních FlagshipDlazdice, ne tohohle sdíleného storu), takže se tu
// ověřuje jen tvar (řetězec nebo null na slot, max MAX_SLOTU na appku),
// ne konkrétní id — neznámé/zastaralé id widgetu FlagshipShell.tsx
// stejně jen potichu vykreslí jako prázdný slot (item-by-item odolnost,
// stejná zásada jako gameCharacterValidation.ts).
// ==========================================

const MAX_SLOTU = 6

export const FlagshipWidgetsSchema = v.object({
  sloty: v.optional(v.record(v.string(), v.array(v.unknown())), {}),
})

export const validateFlagshipWidgetsData = (data: unknown) => {
  const result = v.safeParse(FlagshipWidgetsSchema, data)
  if (!result.success) {
    console.warn('Data widgetů vlajkových appek neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  const sloty: Record<string, (string | null)[]> = {}
  for (const [flagshipId, raw] of Object.entries(result.output.sloty)) {
    sloty[flagshipId] = raw.slice(0, MAX_SLOTU).map((x) => (typeof x === 'string' ? x : null))
  }

  return { success: true as const, data: { sloty } }
}
