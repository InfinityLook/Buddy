import { describe, it, expect } from 'vitest'
import {
  zacykliIndex,
  melByPotvrditTazeni,
  tazeniProcento,
  dragNaklonStupnu,
  DRAG_PRAH_PX,
  MAX_NAKLON_STUPNU,
} from '@/pages/app/components/roomCarouselMath'

// ==========================================
// pages/app/components/roomCarouselMath.ts — čistá matematika za
// RoomCarousel.tsx (viz CLAUDE.md), žádný DOM/React potřeba.
// ==========================================

describe('zacykliIndex', () => {
  it('vrátí stejný index, když je v rozsahu', () => {
    expect(zacykliIndex(2, 6)).toBe(2)
  })

  it('zacyklí za posledním indexem zpátky na první', () => {
    expect(zacykliIndex(6, 6)).toBe(0)
    expect(zacykliIndex(7, 6)).toBe(1)
  })

  it('zacyklí před prvním indexem na poslední', () => {
    expect(zacykliIndex(-1, 6)).toBe(5)
    expect(zacykliIndex(-2, 6)).toBe(4)
  })

  it('nespadne na nulovou/zápornou délku', () => {
    expect(zacykliIndex(3, 0)).toBe(0)
  })
})

describe('melByPotvrditTazeni', () => {
  it('pod prahem tažení nepotvrdí', () => {
    expect(melByPotvrditTazeni(DRAG_PRAH_PX - 1)).toBe(false)
    expect(melByPotvrditTazeni(-(DRAG_PRAH_PX - 1))).toBe(false)
  })

  it('přesně na prahu i za ním potvrdí, oběma směry', () => {
    expect(melByPotvrditTazeni(DRAG_PRAH_PX)).toBe(true)
    expect(melByPotvrditTazeni(-DRAG_PRAH_PX)).toBe(true)
    expect(melByPotvrditTazeni(200)).toBe(true)
    expect(melByPotvrditTazeni(-200)).toBe(true)
  })

  it('respektuje vlastní práh, ne jen výchozí', () => {
    expect(melByPotvrditTazeni(40, 30)).toBe(true)
    expect(melByPotvrditTazeni(20, 30)).toBe(false)
  })
})

describe('tazeniProcento', () => {
  it('spočítá poměr vůči šířce plochy', () => {
    expect(tazeniProcento(150, 300)).toBe(0.5)
    expect(tazeniProcento(-150, 300)).toBe(-0.5)
  })

  it('nikdy nepřeteče za <-1, 1>, i při tažení dál než celá šířka', () => {
    expect(tazeniProcento(900, 300)).toBe(1)
    expect(tazeniProcento(-900, 300)).toBe(-1)
  })

  it('nespadne na nulovou šířku plochy', () => {
    expect(tazeniProcento(50, 0)).toBe(0)
  })
})

describe('dragNaklonStupnu', () => {
  it('tažení doleva nakloní kartu na kladnou stranu (pryč od směru tažení)', () => {
    expect(dragNaklonStupnu(-150, 300)).toBeCloseTo(5)
  })

  it('tažení doprava nakloní kartu na zápornou stranu', () => {
    expect(dragNaklonStupnu(150, 300)).toBeCloseTo(-5)
  })

  it('nikdy nepřekročí maximální náklon ani při extrémním tažení', () => {
    expect(dragNaklonStupnu(-9000, 300)).toBe(MAX_NAKLON_STUPNU)
    expect(dragNaklonStupnu(9000, 300)).toBe(-MAX_NAKLON_STUPNU)
  })

  it('respektuje vlastní maximální náklon', () => {
    expect(dragNaklonStupnu(-300, 300, 20)).toBeCloseTo(20)
  })
})
