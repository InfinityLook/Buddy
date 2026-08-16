import React from 'react'
import { ProfilHeader } from './components/ProfilHeader'
import { ProfilUserCard } from './components/ProfilUserCard'
import { ProfilQuickStats } from './components/ProfilQuickStats'
import { ProfilAchievements } from './components/ProfilAchievements'
import { ProfilGoals } from './components/ProfilGoals'
import { ProfilMenu } from './components/ProfilMenu'
import './ProfilModule.css'

interface ProfilModuleProps {
  onBack?: () => void
}

export const ProfilModule: React.FC<ProfilModuleProps> = ({ onBack }) => {
  return (
    <div className="profil-container">
      <ProfilHeader onBack={onBack} />
      <ProfilUserCard />
      <ProfilQuickStats />
      
      <div className="profil-grid-2">
        <ProfilAchievements />
        <ProfilGoals />
      </div>

      <ProfilMenu />
    </div>
  )
}

export default ProfilModule
