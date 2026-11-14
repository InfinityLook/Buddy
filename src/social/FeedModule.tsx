import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppBottomNav } from '@/components/AppBottomNav'
import { BuddyHeader } from '@/components/buddy-ui/BuddyHeader'
import { SurfaceBackdrop, useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
import { DomuPanel } from './components/DomuPanel'
import { VerejnyProfilDialog } from './components/VerejnyProfilDialog'
import { useSocial } from './useSocial'
import './SocialModule.css'
import './Community.css'

export function FeedModule() {
  const navigate = useNavigate()
  const stav = useSocial()
  const { rootAttributes } = useSurfaceAppearance('feed')
  const [profil, setProfil] = useState<string | null>(null)

  return (
    <div className="social-page community-page buddy-theme-scope" {...rootAttributes}>
      <SurfaceBackdrop surfaceId="feed" />
      <BuddyHeader title="Feed" backLabel="Zpět do Hubu" onBack={() => navigate('/hub')} />
      {stav.nacita
        ? <p className="buddy-ui-status" role="status">Načítám příspěvky…</p>
        : <DomuPanel stav={stav} surfaceId="feed" onOtevritProfil={setProfil} />}
      {stav.hlaska && <p className="social-toast" role="status">{stav.hlaska}</p>}
      {profil && (
        <VerejnyProfilDialog userId={profil} stav={stav} callerId="feed"
          onOtevritChat={chatId => navigate(`/social?zalozka=chaty&chat=${encodeURIComponent(chatId)}`)} onZavrit={() => setProfil(null)} />
      )}
      <AppBottomNav placement="edge" />
    </div>
  )
}

export default FeedModule
