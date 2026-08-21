import React, { useState } from 'react'
import { TvorbaPostavy } from './components/TvorbaPostavy'
import { MapaSveta } from './components/MapaSveta'
import { Souboj } from './components/Souboj'
import { useGameCharacter } from './useGameCharacter'
import { POSTAVY } from './postavy'
import { NEPRATELE_PODLE_LOKACE } from './combat/nepratele'
import './GameModule.css'

// ==========================================
// Herní hub — vstupní bod za tlačítkem Play v Hubu.
//
// Bez zvolené postavy vede rovnou na její výběr; jakmile je vybraná,
// appka se na to už neptá znovu a jde rovnou na mapu světa. Souboj
// (zatím jen v aréně) je jen dočasný React state tady nahoře — nic se
// nepersistuje, návrat na mapu souboj bez následků zahodí.
// ==========================================

export const GameModule: React.FC = () => {
  const postavaId = useGameCharacter((s) => s.postavaId)
  const postava = POSTAVY.find((p) => p.id === postavaId) ?? null
  const [soubojLokaceId, setSoubojLokaceId] = useState<string | null>(null)

  if (!postava) {
    return <TvorbaPostavy />
  }

  const nepritel = soubojLokaceId ? NEPRATELE_PODLE_LOKACE[soubojLokaceId] : undefined
  if (nepritel) {
    return <Souboj postava={postava} nepritel={nepritel} onOdejit={() => setSoubojLokaceId(null)} />
  }

  return <MapaSveta postava={postava} onVstoupitDoBoje={setSoubojLokaceId} />
}

export default GameModule
