import { describe, it, expect } from 'vitest'
import { resolveActiveFrameId, AVATAR_FRAMES } from '@/social/avatarFrames'

// ==========================================
// Čistá logika výběru rámečku avataru — social/avatarFrames.ts. Stejná
// "vyhodnoť až při čtení" logika jako core/theme/themes.ts's
// resolveActiveThemeId, jen řízená rolí vrácenou precti_verejny_profil(),
// ne živým useHasPermission hookem (ten pro cizí profil nejde použít).
// ==========================================

describe('resolveActiveFrameId', () => {
  it('null id znamená žádný rámeček', () => {
    expect(resolveActiveFrameId(null, 'user')).toBeNull()
  })

  it('volný rámeček se použije bez ohledu na roli', () => {
    expect(resolveActiveFrameId('polarni', 'user')?.id).toBe('polarni')
    expect(resolveActiveFrameId('prirodni', 'vip')?.id).toBe('prirodni')
  })

  it('VIP rámeček se použije jen premium rolím', () => {
    expect(resolveActiveFrameId('zlaty', 'vip')?.id).toBe('zlaty')
    expect(resolveActiveFrameId('zlaty', 'admin')?.id).toBe('zlaty')
    expect(resolveActiveFrameId('zlaty', 'moderator')?.id).toBe('zlaty')
  })

  it('VIP rámeček bez premium role se tiše nezobrazí, ne chyba', () => {
    expect(resolveActiveFrameId('zlaty', 'user')).toBeNull()
    expect(resolveActiveFrameId('plamenny', 'user')).toBeNull()
  })

  it('neplatné id se tiše nezobrazí', () => {
    expect(resolveActiveFrameId('neexistuje', 'vip')).toBeNull()
  })
})

describe('AVATAR_FRAMES katalog', () => {
  it('má 2 volné a 2 pro VIP rámečky', () => {
    expect(AVATAR_FRAMES.filter((f) => !f.vip)).toHaveLength(2)
    expect(AVATAR_FRAMES.filter((f) => f.vip)).toHaveLength(2)
  })
})
