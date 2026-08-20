import React from 'react'
import { avatarGradient } from '../avatarColor'

interface Props {
  /** Id uživatele — základ barvy prstenu, ne jen ozdoba, viz avatarColor.ts */
  id: string
  jmeno: string
  /** Skupinový chat má pevnou barvu (#), ne barvu podle id — id skupiny
   *  totiž nikoho konkrétního neznačí. */
  jeSkupina?: boolean
  /** Příchozí žádost dostane pulzující prstenec, ať upoutá pozornost
   *  dřív, než si člověk přečte text vedle ní. */
  pulzuje?: boolean
  /** Zablokovaný účet je schválně bez barvy — viz komentář v BlokovaniPanel.css. */
  tlumeny?: boolean
  velikost?: number
}

export const SocialAvatar: React.FC<Props> = ({
  id,
  jmeno,
  jeSkupina,
  pulzuje,
  tlumeny,
  velikost = 34,
}) => {
  const barvy = jeSkupina ? null : avatarGradient(id)

  const style = barvy
    ? ({ '--sa-a': barvy.a, '--sa-b': barvy.b } as React.CSSProperties)
    : undefined

  return (
    <span
      className={`social-avatar-wrap ${tlumeny ? 'je-tlumeny' : ''}`}
      style={{ width: velikost, height: velikost, ...style }}
      aria-hidden="true"
    >
      {pulzuje && <span className="social-avatar-pulz" />}
      <span className="social-avatar-prstenec" />
      <span className={`social-avatar ${jeSkupina ? 'is-skupina' : ''}`}>
        {jeSkupina ? '#' : jmeno.charAt(0).toUpperCase()}
      </span>
    </span>
  )
}
