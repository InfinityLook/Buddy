import { describe, expect, it } from 'vitest'
import { checksumQuest, loadQuest, saveQuest, validQuestShape } from '../../src/buddyworld/questSave'
import { nactiTretiVypravu } from '../../src/buddyworld/tretiVyprava'
const key = 'quest-test'
const state = { faze: 'lov', porazeni: ['enemy-1'], odmenaPrevzata: false }
const storage = () => {
  const data = new Map<string, string>()
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v) } }
}
describe('Quest save redundancy', () => {
  it('keeps compatible primary and verified backup', () => {
    const s = storage()
    expect(saveQuest(key, state, s)).toBe(true)
    expect(JSON.parse(s.data.get(key)!)).toEqual(state)
    expect(loadQuest(key, nactiTretiVypravu, s, validQuestShape)).toEqual(state)
  })
  it('restores corrupted primary from backup', () => {
    const s = storage(); saveQuest(key, state, s); s.data.set(key, '{broken')
    expect(loadQuest(key, nactiTretiVypravu, s, validQuestShape)).toEqual(state)
    expect(JSON.parse(s.data.get(key)!)).toEqual(state)
  })
  it('rejects tampered backup', () => {
    const s = storage(); saveQuest(key, state, s); s.data.delete(key)
    const backup = JSON.parse(s.data.get(`${key}:backup-v1`)!)
    backup.payload = JSON.stringify({ ...state, faze: 'dokoncena' })
    s.data.set(`${key}:backup-v1`, JSON.stringify(backup))
    expect(loadQuest(key, nactiTretiVypravu, s, validQuestShape).faze).toBe('zamcena')
  })
  it('fails closed when storage write fails', () => {
    const s = { getItem: () => null, setItem: () => { throw new Error('quota') } }
    expect(saveQuest(key, state, s)).toBe(false)
    expect(loadQuest(key, nactiTretiVypravu, s, validQuestShape).faze).toBe('zamcena')
  })
  it('checksum is stable', () => expect(checksumQuest('hello')).toBe(checksumQuest('hello')))
})
