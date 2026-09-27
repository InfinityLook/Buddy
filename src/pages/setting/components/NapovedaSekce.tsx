import React from 'react'
import { AppBottomNav } from '@/components/AppBottomNav'

// ==========================================
// Nastavení — Nápověda. Jednoduché stránky s návodem na používání aplikace.
// ==========================================

export const NapovedaSekce: React.FC = () => {
  return (
    <div className="settings-page">
      <section className="settings-card">
        <div className="settings-card-head">
          <span className="settings-card-icon blue" aria-hidden="true">📘</span>
          <div>
            <h2 className="settings-card-title">Jak začít</h2>
            <p className="settings-card-sub">Základní orientace v aplikaci Buddy</p>
          </div>
        </div>

        <div className="settings-form">
          <div className="settings-field">
            <span>1. Hub a hlavní navigace</span>
            <p className="settings-card-sub">
              Z Hubu otevřeš hlavní funkce: profil, odměny, aplikace, social a nastavení. Všechny důležité akce se dají najít odtud během pár sekund.
            </p>
          </div>

          <div className="settings-field">
            <span>2. Profil a osobní údaje</span>
            <p className="settings-card-sub">
              V Nastavení → Osobní údaje si upravíš jméno, e-mail a motto na profilu. Tato data ovlivňují jen tvůj vzhled v aplikaci.
            </p>
          </div>

          <div className="settings-field">
            <span>3. Zvuk a vzhled</span>
            <p className="settings-card-sub">
              V sekci Zvuk nastavíš hlasitosti aplikace, Buddyho a hry. V Vzhled a rámečky si přebereš barevné téma a styl rámečku avatara.
            </p>
          </div>

          <div className="settings-field">
            <span>4. Zálohování</span>
            <p className="settings-card-sub">
              V sekci Zálohování dat si můžeš stáhnout kompletní zálohu nebo obnovit předchozí stav. Tohle je důležité hlavně při přepnutí zařízení.
            </p>
          </div>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card-head">
          <span className="settings-card-icon purple" aria-hidden="true">💡</span>
          <div>
            <h2 className="settings-card-title">Tipy</h2>
            <p className="settings-card-sub">Doporučené věci, které se vyplatí znát</p>
          </div>
        </div>

        <div className="settings-form">
          <div className="settings-field">
            <span>• Zálohy</span>
            <p className="settings-card-sub">
              Vytvářej si zálohu alespoň jednou po delší práci se statistikami, úkoly nebo soubory.
            </p>
          </div>

          <div className="settings-field">
            <span>• Cloud synchronizace</span>
            <p className="settings-card-sub">
              Pokud máš nastavený cloud, XP a odznaky se synchronizují mezi zařízeními. Všechno ostatní zůstává lokálně v telefonu.
            </p>
          </div>

          <div className="settings-field">
            <span>• Podpora</span>
            <p className="settings-card-sub">
              Pokud něco nefunguje nebo máš dotaz, otevři sekci Podpora a napiš nám popis problému.
            </p>
          </div>

          <div className="settings-field">
            <span>• Biometrické přihlášení</span>
            <p className="settings-card-sub">
              Ve Zabezpečení si můžeš zapnout otisk prstu nebo Face ID, aby byla aplikace chráněná.
            </p>
          </div>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card-head">
          <span className="settings-card-icon blue" aria-hidden="true">❓</span>
          <div>
            <h2 className="settings-card-title">Otázky?</h2>
            <p className="settings-card-sub">Chybí ti něco nebo něco nefunguje?</p>
          </div>
        </div>

        <p className="settings-card-sub" style={{ marginTop: '0.5rem', lineHeight: '1.5' }}>
          Otevři sekci <strong>Podpora</strong> (v Nastavení nebo Hubu) a napiš nám svůj problém nebo nápad. Odpovíme ti co nejrychleji.
        </p>
      </section>

      <AppBottomNav />
    </div>
  )
}

export default NapovedaSekce
