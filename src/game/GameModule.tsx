import React from 'react'
import { TvorbaPostavy } from './components/TvorbaPostavy'
import { MapaSveta } from './components/MapaSveta'
import { useGameCharacter } from './useGameCharacter'
import { POSTAVY } from './postavy'
import './GameModule.css'

// ==========================================
// Herní hub — vstupní bod za tlačítkem Play v Hubu.
//
// Bez zvolené postavy vede rovnou na její výběr; jakmile je vybraná,
// appka se na to už neptá znovu a jde rovnou na mapu světa.
// ==========================================

export const GameModule: React.FC = () => {
  const postavaId = useGameCharacter((s) => s.postavaId)
  const postava = POSTAVY.find((p) => p.id === postavaId) ?? null

  if (!postava) {
    return <TvorbaPostavy />
  }

  return <MapaSveta postava={postava} />
}

export default GameModule
