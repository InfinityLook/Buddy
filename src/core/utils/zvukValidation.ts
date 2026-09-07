import * as v from 'valibot'

// ==========================================
// Ověření uložených hlasitostí (viz core/store/useZvukStore.ts) —
// stejný vzor jako themeValidation.ts: neplatné/poškozené číslo se
// tiše nahradí bezpečnou výchozí hodnotou (100 %), místo aby shodilo
// celý store. Appka drží hlasitost jako celé procento 0-100, ne
// desetinné číslo 0-1 — jednodušší pro posuvník i pro zobrazení.
// ==========================================

const bezpecneProcento = (x: unknown): number =>
  typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.min(100, Math.round(x))) : 100

export const ZvukSchema = v.object({
  master: v.optional(v.unknown(), 100),
  buddy: v.optional(v.unknown(), 100),
  hra: v.optional(v.unknown(), 100),
  music: v.optional(v.unknown(), 100),
})

export const validateZvukData = (data: unknown) => {
  const result = v.safeParse(ZvukSchema, data)
  if (!result.success) {
    console.warn('Nastavení hlasitosti neodpovídá schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  return {
    success: true as const,
    data: {
      master: bezpecneProcento(result.output.master),
      buddy: bezpecneProcento(result.output.buddy),
      hra: bezpecneProcento(result.output.hra),
      music: bezpecneProcento(result.output.music),
    },
  }
}
