import React from 'react'
import { APP_VERSION } from '@/core/utils/registerSW'

type ZakladniSekce =
  | 'funkce'
  | 'moduly'
  | 'oznameni'
  | 'vychozi'
  | 'smazat-profil'
  | 'uloziste'
  | 'informace'

interface Props {
  sekce: string
  onToast: (message: string) => void
}

const POPIS: Record<ZakladniSekce, { ikona: string; popis: string }> = {
  funkce: { ikona: '🧩', popis: 'Nastavení dostupnosti jednotlivých funkcí Buddyho.' },
  moduly: { ikona: '📦', popis: 'Přehled modulů a jejich aktivního stavu.' },
  oznameni: { ikona: '🔔', popis: 'Nastavení upozornění aplikace.' },
  vychozi: { ikona: '⚙️', popis: 'Obnovení výchozích nastavení aplikace.' },
  'smazat-profil': { ikona: '🗑️', popis: 'Mazání profilu zatím není podporováno. Tvoje data nebyla změněna.' },
  uloziste: { ikona: '🗄️', popis: 'Přehled dostupného úložiště v tomto zařízení.' },
  informace: { ikona: 'ℹ️', popis: `Buddy, verze ${APP_VERSION}.` },
}

const ZAKLADNI_SEKCE: readonly ZakladniSekce[] = [
  'funkce',
  'moduly',
  'oznameni',
  'vychozi',
  'smazat-profil',
  'uloziste',
  'informace',
]

const jeZakladniSekce = (sekce: string): sekce is ZakladniSekce =>
  ZAKLADNI_SEKCE.includes(sekce as ZakladniSekce)

/** Základní obrazovky pro nastavení, pro která zatím není hotová logika. */
export const ZakladniNastaveniSekce: React.FC<Props> = ({ sekce, onToast }) => {
  if (!jeZakladniSekce(sekce)) return null

  const info = POPIS[sekce]
  const nepodporovane =
    sekce === 'funkce' ||
    sekce === 'moduly' ||
    sekce === 'oznameni' ||
    sekce === 'vychozi' ||
    sekce === 'smazat-profil'

  return (
    <section className="settings-card">
      <div className="settings-card-head">
        <span className="settings-card-icon blue" aria-hidden="true">{info.ikona}</span>
        <div>
          <h2 className="settings-card-title">
            {sekce === 'smazat-profil'
              ? 'Mazání profilu'
              : sekce === 'uloziste'
                ? 'Úložiště zařízení'
                : sekce === 'informace'
                  ? 'O aplikaci'
                  : 'Nastavení se připravuje'}
          </h2>
          <p className="settings-card-sub">{info.popis}</p>
        </div>
      </div>

      {sekce === 'uloziste' && (
        <p className="settings-card-sub">
          {navigator.storage?.estimate
            ? 'Informace o využití úložiště můžeš zobrazit v nastavení prohlížeče.'
            : 'Tento prohlížeč neposkytuje přehled úložiště.'}
        </p>
      )}

      {nepodporovane && (
        <span className="settings-badge-soon" role="status">
          PŘIPRAVUJE SE
        </span>
      )}

      {sekce === 'smazat-profil' && (
        <button
          type="button"
          className="settings-danger-btn"
          onClick={() => onToast('Mazání profilu zatím není dostupné.')}
        >
          Mazání profilu není dostupné
        </button>
      )}
    </section>
  )
}

export default ZakladniNastaveniSekce
