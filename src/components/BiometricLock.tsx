import React, { useState } from 'react'
import { overBiometrii } from '@/core/utils/biometrics'
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
  const [chyba, setChyba] = useState(false)

  const zkusitOdemknout = async () => {
    setProbiha(true)
    setChyba(false)
    const ok = await overBiometrii(credentialId)
    setProbiha(false)
    if (ok) onUnlock()
    else setChyba(true)
  }

  return (
    <div className="biometric-lock" role="status" aria-live="polite">
      <div className="biometric-lock-glow biometric-lock-glow--cyan" aria-hidden="true" />
      <div className="biometric-lock-glow biometric-lock-glow--violet" aria-hidden="true" />

      <div className="biometric-lock-card">
        <span className="biometric-lock-icon" aria-hidden="true">🔒</span>
        <h1 className="biometric-lock-title">Aplikace je uzamčená</h1>
        <p className="biometric-lock-sub">Ověř se otiskem prstu nebo Face ID a pokračuj tam, kde jsi skončil/a.</p>

        {chyba && (
          <p className="biometric-lock-error">
            Nepovedlo se to. Zkus to znovu, nebo si zámek vypni.
          </p>
        )}

        <button className="biometric-lock-btn" onClick={zkusitOdemknout} disabled={probiha}>
          {probiha ? 'Ověřuji…' : '🔓 Odemknout'}
        </button>

        <button className="biometric-lock-vypnout" onClick={onVypnoutZamek}>
          Nejde to? Vypnout zámek
        </button>
      </div>
    </div>
  )
}

export default BiometricLock
