import React from 'react'

// ==========================================
// Nastavení — Tutorial. Appka ještě nemá rozhodnuto, jak má tahle
// sekce doopravdy vypadat — žádný "tutorial" flow nikde jinde v kódu
// neexistuje a tahle sekce ho nikam neotevírá. Stejná "appka to řekne
// na rovinu, ne že by to tiše nedělalo nic" zdrženlivost jako appčina
// Library dlaždice nebo Jazyk sekce vedle — ukazuje se, že položka
// existuje, ale neskrývá, že zatím nic neumí.
// ==========================================

export const TutorialSekce: React.FC = () => {
  return (
    <section className="settings-card">
      <p className="settings-card-sub">
        Tahle sekce zatím nedělá nic — obsah tutorialu appka ještě nemá hotový, doplní se později.
      </p>
      <div className="settings-toggle-row settings-toggle-row--soon">
        <div className="settings-toggle-text">
          <span className="settings-toggle-title">
            🔮 Úvodní tutorial appky
            <span className="settings-badge-soon">BRZY</span>
          </span>
        </div>
      </div>
    </section>
  )
}

export default TutorialSekce
