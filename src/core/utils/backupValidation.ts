import * as v from 'valibot'

// Obálka celé zálohy. Obsah jednotlivých storů schválně nevalidujeme do
// hloubky — každý store si svá data znovu ověří sám při rehydrataci
// (viz migrate + valibot v useAppStore a useGamificationStore), takže tady
// stačí ohlídat, že soubor je vůbec záloha appky Buddy a ne cizí JSON.
export const BackupEnvelopeSchema = v.object({
  format: v.literal('schoolbuddy-backup'),
  version: v.number(),
  createdAt: v.string(),
  appVersion: v.string(),
  data: v.record(v.unknown()),
})

export type BackupEnvelope = v.Output<typeof BackupEnvelopeSchema>

export const validateBackupEnvelope = (data: unknown) => {
  const result = v.safeParse(BackupEnvelopeSchema, data)
  if (result.success) {
    return { success: true as const, data: result.output }
  }
  console.warn('Soubor neodpovídá formátu zálohy Buddy:', result.issues)
  return { success: false as const, issues: result.issues }
}
