import { describe, it, expect } from 'vitest'
import { loadQuest, saveQuest } from '../../src/buddyworld/questSave'

const valid = (v: unknown): v is { faze: string } => !!v && typeof v === 'object' && typeof (v as { faze?: unknown }).faze === 'string'
const parse = (v: unknown) => valid(v) ? v : { faze: 'start' }

describe('quest save commit ordering', () => {
  it('does not advance backup if primary write fails', () => {
    const data = new Map<string,string>()
    data.set('quest', JSON.stringify({ faze: 'old' }))
    const storage = { getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => { if (k === 'quest') throw Error('denied'); data.set(k,v) } }
    expect(saveQuest('quest', { faze: 'new' }, storage)).toBe(false)
    expect(data.has('quest:backup-v1')).toBe(false)
    expect(loadQuest('quest', parse, storage, valid)).toEqual({ faze: 'old' })
  })
  it('commits primary even when backup storage fails', () => {
    const data = new Map<string,string>()
    const storage = { getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => { if (k.endsWith(':backup-v1')) throw Error('quota'); data.set(k,v) } }
    expect(saveQuest('quest', { faze: 'done' }, storage)).toBe(true)
    expect(loadQuest('quest', parse, storage, valid)).toEqual({ faze: 'done' })
  })
  it('rejects a storage adapter that silently discards the primary write', () => {
    const storage = { getItem: (_: string) => null, setItem: (_: string, __: string) => {} }
    expect(saveQuest('quest', { faze: 'done' }, storage)).toBe(false)
  })
})
