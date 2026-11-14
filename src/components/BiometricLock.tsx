import { BuddyConfirm } from '@/components/buddy-ui/BuddyConfirm'
import React, { useState } from 'react'
import { overBiometrii } from '@/core/utils/biometrics'
import { SurfaceBackdrop, useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
import '@/pages/login/Login.css'
import './BiometricLock.css'

// ==========================================
// Zámek appky nad už přihlášenou relací — viz core/utils/biometrics.ts
// pro celý bezpečnostní model. App.tsx tohle vykreslí místo routeru,
// dokud uživatel neprojde biometrickým ověřením; jednou za start appky,
// ne při každé navigaci uvnitř (stejný "jen na chladný start" rozsah,
// jaký má třeba výběr postavy v Game hubu).
// ==========================================

interface BiometricLockProps {
  onUnlock: () => void
  onVypnoutZamek: () => void
  credentialId: string
}

export const BiometricLock: React.FC<BiometricLockProps> = ({ onUnlock, onVypnoutZamek, credentialId }) => {
  const [probiha, setProbiha] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [chyba, setChyba] = useState(false)
  const { rootAttributes } = useSurfaceAppearance('biometric-lock')

  const zkusitOdemknout = async () => {
    setProbiha(true)
    setChyba(false)
    const ok = await overBiometrii(credentialId)
    setProbiha(false)
    if (ok) onUnlock()
    else setChyba(true)
  }

  return (
    <div className="biometric-lock buddy-theme-scope" {...rootAttributes}>
      <SurfaceBackdrop surfaceId="biometric-lock" />

      <main className="biometric-lock-card buddy-ui-card" aria-busy={probiha}>
        <span className="biometric-lock-icon" aria-hidden="true">🔒</span>
        <h1 className="biometric-lock-title">Aplikace je uzamčená</h1>
        <p className="biometric-lock-sub">Ověř se otiskem prstu nebo Face ID a pokračuj tam, kde jsi skončil/a.</p>

        {chyba && (
          <p className="biometric-lock-error buddy-ui-alert" role="alert">
            Nepovedlo se to. Zkus to znovu, nebo si zámek vypni.
          </p>
        )}

        <button type="button" className="buddy-ui-button buddy-ui-button--primary" onClick={zkusitOdemknout} disabled={probiha}>
          {probiha ? 'Ověřuji…' : 'Odemknout'}
        </button>

        <button type="button" className="buddy-ui-button" disabled={probiha} onClick={() => setConfirmOpen(true)}>
          Nejde to? Vypnout zámek
        </button>
      </main>
      {confirmOpen && <BuddyConfirm surfaceId="biometric-lock" onClose={() => setConfirmOpen(false)} confirmation={{
        title: 'Vypnout zámek aplikace?',
        description: 'Při dalším otevření se Buddy nebude ptát na otisk ani rozpoznání tváře.',
        confirmLabel: 'Vypnout zámek',
        danger: true,
        action: onVypnoutZamek,
      }} />}
    </div>
  )
}

export default BiometricLock
