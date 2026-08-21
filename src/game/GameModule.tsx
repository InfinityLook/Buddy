import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TvorbaPostavy } from './components/TvorbaPostavy'
import { VyberPostavy } from './components/VyberPostavy'
import { MapaSveta } from './components/MapaSveta'
import { Souboj } from './components/Souboj'
import { useGameCharacter } from './useGameCharacter'
import { POSTAVY } from './postavy'
import { Postava, PostavaId } from './types'
import { NEPRATELE_PODLE_LOKACE } from './combat/nepratele'
import { LOKACE } from './lokace'
import './GameModule.css'

// ==========================================
// Herní hub — vstupní bod za tlačítkem Play v Hubu.
//
// Party (vytvořené postavy) se pamatuje trvale přes useGameCharacter;
// KDO se hraje tuhle návštěvu je čistě lokální React state tady dole —
// nepersistuje se, takže appka se ptá znovu při každém vstupu do /hra,
// přesně jak to má být ("vyzkoušej si víc postav").
//
// Stavy:
//  1) prázdná party      -> TvorbaPostavy (první postava)
//  2) party, nic zvoleno, rezim 'pridat' -> TvorbaPostavy (další postava)
//  3) party, nic zvoleno, rezim 'vyber'  -> VyberPostavy (za koho hrát)
//  4) zvoleno + souboj    -> Souboj
//  5) zvoleno              -> MapaSveta
// ==========================================

type Rezim = 'vyber' | 'pridat'

export const GameModule: React.FC = () => {
  const navigate = useNavigate()
  const postavyId = useGameCharacter((s) => s.postavy)
  const vytvoritPostavu = useGameCharacter((s) => s.vytvoritPostavu)
  const smazatPostavu = useGameCharacter((s) => s.smazatPostavu)

  const [rezim, setRezim] = useState<Rezim>('vyber')
  const [hrajeJako, setHrajeJako] = useState<PostavaId | null>(null)
  const [soubojLokaceId, setSoubojLokaceId] = useState<string | null>(null)

  const party = postavyId
    .map((id) => POSTAVY.find((p) => p.id === id))
    .filter((p): p is Postava => !!p)

  // 1) Prázdná party — tvorba první postavy
  if (party.length === 0) {
    return (
      <TvorbaPostavy
        dostupnePostavy={POSTAVY}
        nadpis="Vyber si postavu"
        podnadpis="Tohle je tvoje první postava — později můžeš vytvořit další a přepínat mezi nimi."
        zpetText="Zpět do Hubu"
        onZpet={() => navigate('/hub')}
        onVytvoreno={(id) => {
          vytvoritPostavu(id)
          setHrajeJako(id)
        }}
      />
    )
  }

  const aktivniPostava = hrajeJako ? POSTAVY.find((p) => p.id === hrajeJako) : undefined
  const nepratele = soubojLokaceId ? NEPRATELE_PODLE_LOKACE[soubojLokaceId] : undefined
  const lokaceSouboje = soubojLokaceId ? LOKACE.find((l) => l.id === soubojLokaceId) : undefined

  // 4) Souboj má přednost, dokud probíhá
  if (aktivniPostava && nepratele) {
    return (
      <Souboj
        postava={aktivniPostava}
        nepratele={nepratele}
        nazevMista={lokaceSouboje?.nazev ?? ''}
        ikonaMista={lokaceSouboje?.ikona ?? '🗡️'}
        onOdejit={() => setSoubojLokaceId(null)}
      />
    )
  }

  // 5) Zvoleno, za koho se hraje — mapa
  if (aktivniPostava) {
    return <MapaSveta postava={aktivniPostava} onVstoupitDoBoje={setSoubojLokaceId} />
  }

  // 2) Přidávání další postavy do party
  if (rezim === 'pridat') {
    const zbyvajici = POSTAVY.filter((p) => !postavyId.includes(p.id))
    return (
      <TvorbaPostavy
        dostupnePostavy={zbyvajici}
        nadpis="Přidat postavu"
        podnadpis="Vyber další postavu, kterou chceš mít po ruce."
        zpetText="Zpět na výběr"
        onZpet={() => setRezim('vyber')}
        onVytvoreno={(id) => {
          vytvoritPostavu(id)
          setRezim('vyber')
        }}
      />
    )
  }

  // 3) Výběr, za koho se hraje tahle návštěva
  return (
    <VyberPostavy
      postavy={party}
      mozneVytvoritDalsi={postavyId.length < POSTAVY.length}
      onZvolit={setHrajeJako}
      onSmazat={smazatPostavu}
      onPridatDalsi={() => setRezim('pridat')}
    />
  )
}

export default GameModule
