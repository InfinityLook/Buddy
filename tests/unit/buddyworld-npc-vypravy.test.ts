import { describe, it, expect } from 'vitest'
import { stavVypravy, overSplneneVypravy } from '../../src/buddyworld/npcVypravy'
const s = { porazeniNepratele: 12, kamen: 20 }
describe('osobní výpravy', () => {
  it('zamyká výpravu bez příběhu', () => expect(stavVypravy('elara', [], ['kristalova-mytina'], [], s)).toBe('zamceno'))
  it('čeká na objevení oblasti', () => expect(stavVypravy('elara', ['elara'], [], [], s)).toBe('probíhá'))
  it('umožní dokončit splněnou výpravu', () => expect(stavVypravy('elara', ['elara'], ['kristalova-mytina'], [], s)).toBe('pripraveno'))
  it('vyžaduje poražené nepřátele', () => expect(stavVypravy('kael', ['kael'], ['stiny-lesa'], [], { ...s, porazeniNepratele: 9 })).toBe('probíhá'))
  it('vyžaduje kameny', () => expect(stavVypravy('mira', ['mira'], ['haj-strazce'], [], { ...s, kamen: 14 })).toBe('probíhá'))
  it('neumožní opakovanou odměnu', () => expect(stavVypravy('elara', ['elara'], ['kristalova-mytina'], ['elara'], s)).toBe('splneno'))
  it('filtruje poškozený save', () => expect(overSplneneVypravy(['elara', 'elara', 'neexistuje', null])).toEqual(['elara']))
})
