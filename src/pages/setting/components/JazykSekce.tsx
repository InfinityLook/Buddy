import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Typ pro definici jednoho jazyka v menu
interface JazykOption {
  kod: string;
  nazev: string;
  vlajka: string;
}

// Seznam dostupných jazyků
const DOSTUPNE_JAZYKY: JazykOption[] = [
  { kod: 'cs', nazev: 'Čeština', vlajka: '🇨🇿' },
  { kod: 'en', nazev: 'English', vlajka: '🇬🇧' },
  { kod: 'de', nazev: 'Deutsch', vlajka: '🇩🇪' },
];

export const Jazyksekce = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Zjištění aktuálně zvoleného jazyka
  const aktualniJazyk =
    DOSTUPNE_JAZYKY.find((j) => j.kod === i18n.language) || DOSTUPNE_JAZYKY[0];

  // Změna jazyka
  const ZmenJazyk = (kod: string) => {
    i18n.changeLanguage(kod);
    setIsOpen(false);
  };

  // Uzavření menu při kliknutí mimo komponentu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="jazyk-sekce-container" ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Hlavní tlačítko pro otevření/zavření menu */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid #ccc',
          background: '#ffffff',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 500,
        }}
      >
        <span>{aktualniJazyk.vlajka}</span>
        <span>{aktualniJazyk.nazev}</span>
        <span style={{ fontSize: '10px', marginLeft: '4px' }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Rozbalovací menu */}
      {isOpen && (
        <ul
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            padding: '4px 0',
            listStyle: 'none',
            background: '#ffffff',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            minWidth: '140px',
            zIndex: 1000,
          }}
        >
          {DOSTUPNE_JAZYKY.map((jazyk) => (
            <li key={jazyk.kod} role="option" aria-selected={i18n.language === jazyk.kod}>
              <button
                type="button"
                onClick={() => ZmenJazyk(jazyk.kod)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  border: 'none',
                  background: i18n.language === jazyk.kod ? '#f0f4ff' : 'transparent',
                  color: i18n.language === jazyk.kod ? '#0284c7' : '#333',
                  fontWeight: i18n.language === jazyk.kod ? 'bold' : 'normal',
                  cursor: 'pointer',
                }}
              >
                <span>{jazyk.vlajka}</span>
                <span>{jazyk.nazev}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
