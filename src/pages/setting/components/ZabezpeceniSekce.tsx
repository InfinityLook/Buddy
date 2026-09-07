import React, { useEffect, useState } from 'react'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import { jeBiometrieDostupna, zaregistrujBiometrii } from '@/core/utils/biometrics'
import { nactiZarizeni, type PrihlaseneZarizeni } from '@/core/security/loginDevices'

interface Props {
  onToast: (zprava: string) => void
}

// ==========================================
// Nastavení — Zabezpečení. Beze změny logiky, jen přesunuté z bývalé
// karty přímo na hlavní stránce Nastavení do vlastního modulu.
// ==========================================

export const ZabezpeceniSekce: React.FC<Props> = ({ onToast }) => {
  const { profile, updateSecurity, resetProfile } = useProfileData()
  const [biometrieProbiha, setBiometrieProbiha] = useState(false)
  const [zarizeni, setZarizeni] = useState<PrihlaseneZarizeni[]>([])

  useEffect(() => {
    // login_devices se plní z App.tsx's startLoginNotify() při startu —
    // tenhle dotaz jen čte, co tam už je.
    void nactiZarizeni().then(setZarizeni)
  }, [])

  const handleResetProfile = () => {
    if (window.confirm('Opravdu chceš smazat profil a vrátit ho do výchozího stavu? Úkoly, poznámky ani XP se nesmažou.')) {
      resetProfile()
      onToast('Profil byl vrácen do výchozího stavu')
    }
  }

  return (
    <section className="settings-card">
      <div className="settings-toggle-row">
        <div className="settings-toggle-text">
          <span className="settings-toggle-title">Biometrické přihlášení</span>
          <span className="settings-toggle-sub">
            Otisk prstu nebo Face ID zamkne appku na tomhle zařízení
          </span>
        </div>
        <button
          className={`settings-switch ${profile.security.biometrics ? 'on' : ''}`}
          role="switch"
          aria-checked={profile.security.biometrics}
          aria-label="Biometrické přihlášení"
          disabled={biometrieProbiha}
          onClick={async () => {
            // Vypnutí nepotřebuje žádné ověření — appka WebAuthn credential
            // z JS smazat neumí (rozhraní to nenabízí), jen si přestane
            // pamatovat jeho id, takže se appka na něj přestane ptát.
            if (profile.security.biometrics) {
              updateSecurity({ biometrics: false, biometricCredentialId: undefined })
              onToast('Biometrie vypnuta')
              return
            }

            setBiometrieProbiha(true)
            const dostupna = await jeBiometrieDostupna()
            if (!dostupna) {
              setBiometrieProbiha(false)
              onToast('Tohle zařízení nebo prohlížeč biometrii nepodporuje.')
              return
            }

            const credentialId = await zaregistrujBiometrii(profile.name)
            setBiometrieProbiha(false)

            if (!credentialId) {
              onToast('Nepovedlo se to. Zkus to znovu.')
              return
            }

            updateSecurity({ biometrics: true, biometricCredentialId: credentialId })
            onToast('Biometrie zapnuta ✓')
          }}
        >
          <span className="settings-switch-knob" />
        </button>
      </div>

      <div className="settings-toggle-row">
        <div className="settings-toggle-text">
          <span className="settings-toggle-title">Upozornění na přihlášení</span>
          <span className="settings-toggle-sub">Dát vědět o novém přihlášení</span>
        </div>
        <button
          className={`settings-switch ${profile.security.loginAlerts ? 'on' : ''}`}
          role="switch"
          aria-checked={profile.security.loginAlerts}
          aria-label="Upozornění na přihlášení"
          onClick={() => {
            const zapnuto = !profile.security.loginAlerts
            updateSecurity({ loginAlerts: zapnuto })
            onToast(zapnuto ? 'Upozornění zapnuta' : 'Upozornění vypnuta')
          }}
        >
          <span className="settings-switch-knob" />
        </button>
      </div>

      {/* Nedávná přihlášení — dává přepínači výš vidět obsah, ne jen
          samotný spínač. */}
      {zarizeni.length > 0 && (
        <div className="settings-zarizeni">
          <span className="settings-zarizeni-label">NEDÁVNÁ PŘIHLÁŠENÍ</span>
          {zarizeni.map((z) => (
            <div key={z.deviceId} className="settings-zarizeni-radek">
              <span>{z.popis}</span>
              <span className="settings-zarizeni-cas">
                {new Date(z.posledniAt).toLocaleString('cs-CZ', {
                  day: 'numeric',
                  month: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
      )}

      <button className="settings-danger-btn" onClick={handleResetProfile}>
        🗑️ Vrátit profil do výchozího stavu
      </button>
    </section>
  )
}

export default ZabezpeceniSekce
