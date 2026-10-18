import { describe, expect, it } from 'vitest'
import { NEPRATELE, VYCHOZI_NEPRITEL_ID, nahodnyNepritel, nepritelPodleId, vyberRuzneNepratele } from '@/buddyworld/data/nepratele'

describe('NEPRATELE', () => {
  it('drží alespoň dva odlišné typy běžných nepřátel', () => {
    expect(NEPRATELE.length).toBeGreaterThanOrEqual(2)
  })

  it('každý typ má jedinečné id', () => {
    const ids = NEPRATELE.map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('Stínový vlček a Lesní slizena mají úmyslně odlišný archetyp — slizena je pomalejší, méně ostražitá, ale odolnější', () => {
    const vlcek = nepritelPodleId('stinovy-vlcek')
    const slizena = nepritelPodleId('lesni-slizena')
    expect(slizena.rychlost).toBeLessThan(vlcek.rychlost)
    expect(slizena.dosahDetekce).toBeLessThan(vlcek.dosahDetekce)
    expect(slizena.maxHp).toBeGreaterThan(vlcek.maxHp)
  })

  it('Stínový vlček a Lesní slizena mají odlišný vizuální tvar siluety a odlišnou barvu', () => {
    const vlcek = nepritelPodleId('stinovy-vlcek')
    const slizena = nepritelPodleId('lesni-slizena')
    expect(vlcek.tvar).not.toBe(slizena.tvar)
    expect(vlcek.barvaTela).not.toBe(slizena.barvaTela)
  })
})

describe('nepritelPodleId', () => {
  it('najde typ podle existujícího id', () => {
    expect(nepritelPodleId('lesni-slizena').jmeno).toBe('Lesní slizena')
  })

  it('vrátí první definici pro neznámé id, nikdy nepadne', () => {
    expect(nepritelPodleId('neexistujici-id')).toBe(NEPRATELE[0])
  })
})

describe('VYCHOZI_NEPRITEL_ID', () => {
  it('odkazuje na reálný záznam v NEPRATELE poli', () => {
    expect(NEPRATELE.some((n) => n.id === VYCHOZI_NEPRITEL_ID)).toBe(true)
  })
})

describe('nahodnyNepritel', () => {
  it('s injektovaným nahodne() vrátí přesně první záznam pro hodnotu 0', () => {
    expect(nahodnyNepritel(() => 0)).toBe(NEPRATELE[0])
  })

  it('s injektovaným nahodne() vrátí přesně poslední záznam pro hodnotu blízko 1', () => {
    expect(nahodnyNepritel(() => 0.999)).toBe(NEPRATELE[NEPRATELE.length - 1])
  })

  it('pokryje všechny typy rovnoměrně napříč celým rozsahem [0,1)', () => {
    const vysledky = new Set(NEPRATELE.map((_, i) => nahodnyNepritel(() => i / NEPRATELE.length)))
    expect(vysledky.size).toBe(NEPRATELE.length)
  })
})

describe('Buddy World v2.4 — nové archetypy a rozmanité sloty', () => {
  it('má sedm unikátních typů nepřátel', () => {
    expect(NEPRATELE).toHaveLength(7)
    expect(new Set(NEPRATELE.map(n => n.id)).size).toBe(7)
  })
  it('krystalový brouk je pomalejší a odolnější než bludička', () => {
    const brouk = nepritelPodleId('krystalovy-brouk')
    const bludicka = nepritelPodleId('lesni-bludicka')
    expect(brouk.maxHp).toBeGreaterThan(bludicka.maxHp)
    expect(brouk.rychlost).toBeLessThan(bludicka.rychlost)
    expect(brouk.poskozeni).toBeGreaterThan(bludicka.poskozeni)
  })
  it('nevybere stejný typ dvakrát do dvou slotů', () => {
    const vysledek = vyberRuzneNepratele(2, () => 0)
    expect(vysledek).toHaveLength(2)
    expect(vysledek[0].id).not.toBe(vysledek[1].id)
  })
  it('omezuje počet na dostupné typy a zvládne nulu', () => {
    expect(vyberRuzneNepratele(100, () => 0.5)).toHaveLength(7)
    expect(vyberRuzneNepratele(0)).toHaveLength(0)
  })
})
