import { describe, expect, it } from 'vitest'
import { melByZamekniPriSkryti } from '@/core/utils/biometricLockGuard'

// ==========================================
// Regresní test pro core/utils/biometricLockGuard.ts (audit #9) —
// appka dřív zámek po prvním odemčení nikdy znovu nezamkla, protože
// App.tsx neměl žádný visibilitychange posluchač. Tahle čistá funkce
// je appčina vlastní podmínka, co appka do toho posluchače sama
// vloží — testovaná tady přímo, protože App.tsx samotný appka ve
// Vitestu importovat nemůže (tahá core/utils/registerSW.ts's
// virtual:pwa-register).
// ==========================================

const ZAPNUTO = { biometrics: true, biometricCredentialId: 'kredenc-1' }
const VYPNUTO = { biometrics: false, biometricCredentialId: undefined }

describe('melByZamekniPriSkryti (audit #9)', () => {
  it('appka zámek zapne, když je stránka skrytá a biometrie je zapnutá s existujícím credentialem', () => {
    expect(melByZamekniPriSkryti('hidden', ZAPNUTO)).toBe(true)
  })

  it('appka zámek NEzapne, když je biometrie vypnutá — i když je stránka skrytá', () => {
    expect(melByZamekniPriSkryti('hidden', VYPNUTO)).toBe(false)
  })

  it('appka zámek NEzapne, dokud je stránka viditelná — i když je biometrie zapnutá', () => {
    expect(melByZamekniPriSkryti('visible', ZAPNUTO)).toBe(false)
  })

  it('appka zámek NEzapne, chybí-li credentialId — appka appku do zamčeného stavu nepustí bez čím appku ověřit', () => {
    expect(melByZamekniPriSkryti('hidden', { biometrics: true, biometricCredentialId: undefined })).toBe(false)
  })

  it('appka zámek NEzapne, je-li credentialId prázdný string', () => {
    expect(melByZamekniPriSkryti('hidden', { biometrics: true, biometricCredentialId: '' })).toBe(false)
  })

  it('appka zámek NEzapne, je-li appka viditelná i bez biometrie (nic appka nedělá)', () => {
    expect(melByZamekniPriSkryti('visible', VYPNUTO)).toBe(false)
  })
})
