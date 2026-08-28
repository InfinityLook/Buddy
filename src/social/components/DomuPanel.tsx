import React from 'react'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import { StoriesBar } from './StoriesBar'
import type { SocialStav } from '../useSocial'

interface Props {
  stav: SocialStav
}

// ==========================================
// Domů — nová prostřední záložka spodní navigace, náhrada za starou
// "Profil" záložku (ta teď odkazuje rovnou na appčin skutečný profil,
// viz SocialModule.tsx a pages/profil/components/PratelSekce.tsx).
//
// Zatím nese jen story pruh (StoriesBar.tsx, dřív nahoře v Profilu) —
// zbytek obrazovky je vědomě prázdný, další obsah sem přibude v pozdější
// fázi, ne teď narychlo doplněný něčím, co sem nepatří.
// ==========================================

export const DomuPanel: React.FC<Props> = ({ stav }) => {
  const { profile } = useProfileData()

  return (
    <div className="social-panel">
      {stav.mujId && (
        <StoriesBar mujId={stav.mujId} mojeJmeno={profile.name} mujAvatar={profile.avatar} />
      )}

      <section className="social-card social-domu-prazdno">
        <p className="social-empty-note social-empty-note--stred">
          Sem brzy přibude víc. Zatím tu žijí jen stories nahoře. ✨
        </p>
      </section>
    </div>
  )
}
