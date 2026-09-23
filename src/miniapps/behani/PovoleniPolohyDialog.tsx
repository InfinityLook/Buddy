import React from 'react'

interface Props {
  onPovolit: () => void
  onZavrit: () => void
}

// ==========================================
// "Okénko" s potvrzením přístupu k poloze — zobrazí se po otevření
// Běhání, dřív než appka vůbec zavolá skutečné prohlížečové
// navigator.geolocation.* (to appka nikdy nemůže sama ovládat, jen ho
// vyvolat). Stejný "vysvětli dřív, než prohlížeč zeptá sám" vzor, co
// tahle appka jinde ještě neměla — Form Check/SkenovatKodDialog volají
// getUserMedia rovnou, appka jim nikdy vlastní vysvětlující okénko
// nepředsadila. Tady to bylo výslovně vyžádané, takže je to první
// místo v appce, co tenhle vzor zavádí.
//
// Tlačítko "Povolit přístup k poloze" samo o sobě žádné oprávnění
// neuděluje — appka to udělat nemůže, o tom rozhoduje jen prohlížeč/OS.
// Jen zavolá getCurrentPosition() jednou, což je přesně to, co skutečné
// prohlížečové okénko vyvolá — appčino vlastní okénko je jen
// vysvětlení PŘED ním, ne náhrada za něj.
// ==========================================
export const PovoleniPolohyDialog: React.FC<Props> = ({ onPovolit, onZavrit }) => (
  <div className="behani-poloha-overlay" onClick={onZavrit}>
    <div className="behani-poloha-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div className="behani-poloha-ikona" aria-hidden="true">📍</div>
      <h3 className="behani-poloha-nadpis">Přístup k poloze</h3>
      <p className="behani-poloha-text">
        Běhání a kardio potřebuje tvou polohu, aby dokázalo zaznamenat trasu, vzdálenost a tempo na
        mapě. Poloha se ukládá jen do tvého zařízení — appka ji nikam neposílá.
      </p>
      <div className="behani-poloha-tlacitka">
        <button className="behani-btn behani-btn--zahodit" onClick={onZavrit}>
          Teď ne
        </button>
        <button className="behani-btn behani-btn--ulozit" onClick={onPovolit}>
          Povolit přístup k poloze
        </button>
      </div>
    </div>
  </div>
)
