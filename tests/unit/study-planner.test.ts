import { describe, it, expect } from 'vitest'
import {
  StudyTask,
  dalsiTerminOpakovani,
  jeVRozsahu,
  patriKeDni,
  spocitejPodukoly,
  tydenniRozsah,
} from '@/miniapps/study-planner/types'

// ==========================================
// Podúkoly u úkolu v Planeru — spocitejPodukoly je jediná čistá funkce,
// co appka pro tuhle appku dřív měla (zbytek je Zustand store akce v
// useStudyPlanner.ts, ten importuje core/utils/notify.ts a nedá se
// proto testovat ve Vitestu, viz CLAUDE.md's zeď kolem virtual:pwa-register).
//
// School Room: dokončený systém pro studium, Fáze 1 — přidalo dalších
// pět čistých funkcí (opakování úkolů, pohledy Dnes/Týden) testovaných
// níž ve vlastních describe blocích.
// ==========================================

const task = (patch: Partial<StudyTask> = {}): StudyTask => ({
  id: 't1',
  subject: 'Matematika',
  topic: 'Test',
  dueDate: '2025-01-01',
  priority: 'Střední',
  completed: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: 0,
  deletedAt: null,
  ...patch,
})

describe('spocitejPodukoly', () => {
  it('starší úkol bez pole podukoly vrátí 0 z 0, ne pád', () => {
    const t = task()
    delete (t as { podukoly?: unknown }).podukoly
    expect(spocitejPodukoly(t)).toEqual({ hotovo: 0, celkem: 0 })
  })

  it('spočítá hotové podúkoly z celkového počtu', () => {
    const t = task({
      podukoly: [
        { id: 'p1', text: 'Krok 1', hotovo: true },
        { id: 'p2', text: 'Krok 2', hotovo: false },
        { id: 'p3', text: 'Krok 3', hotovo: true },
      ],
    })
    expect(spocitejPodukoly(t)).toEqual({ hotovo: 2, celkem: 3 })
  })

  it('prázdné pole podukoly vrátí 0 z 0', () => {
    expect(spocitejPodukoly(task({ podukoly: [] }))).toEqual({ hotovo: 0, celkem: 0 })
  })
})

describe('dalsiTerminOpakovani', () => {
  it('bez opakování (zadne) vrátí termín beze změny', () => {
    expect(dalsiTerminOpakovani('2025-01-01', 'zadne')).toBe('2025-01-01')
  })

  it('neplatný (volný textový) termín vrátí beze změny, bez ohledu na opakování', () => {
    expect(dalsiTerminOpakovani('Dnes', 'tydne')).toBe('Dnes')
  })

  it('týdně — posune přesně o 7 dní', () => {
    expect(dalsiTerminOpakovani('2025-01-01', 'tydne')).toBe('2025-01-08')
  })

  it('týdně přes hranici měsíce', () => {
    expect(dalsiTerminOpakovani('2025-01-28', 'tydne')).toBe('2025-02-04')
  })

  it('měsíčně — stejný den v příštím měsíci', () => {
    expect(dalsiTerminOpakovani('2025-03-15', 'mesicne')).toBe('2025-04-15')
  })

  it('měsíčně — 31. v lednu přeskočí únor (28 dní) a skončí na 31. v březnu', () => {
    expect(dalsiTerminOpakovani('2025-01-31', 'mesicne')).toBe('2025-03-31')
  })

  it('měsíčně — stejné přeskočení platí i v přestupném roce (únor 29 dní, pořád míň než 31)', () => {
    expect(dalsiTerminOpakovani('2024-01-31', 'mesicne')).toBe('2024-03-31')
  })

  it('měsíčně — 30. v březnu přeskočí únor jen tehdy, když ho skutečně nemá (duben má 30, vyjde hned tam)', () => {
    expect(dalsiTerminOpakovani('2025-03-30', 'mesicne')).toBe('2025-04-30')
  })
})

describe('tydenniRozsah', () => {
  // 2025-01-13 je pondělí, 2025-01-19 je neděle (ověřeno přímo přes
  // Date.getDay() před napsáním testu) — appka musí vrátit stejné
  // pondělí/neděle pro libovolný den uvnitř týhle konkrétní týdenní
  // dávky, ne jen pro tu jednu referenční.
  it.each([13, 14, 15, 16, 17, 18, 19])('pro 2025-01-%i vrátí pondělí 2025-01-13 a neděli 2025-01-19', (den) => {
    expect(tydenniRozsah(new Date(2025, 0, den))).toEqual({ od: '2025-01-13', doo: '2025-01-19' })
  })
})

describe('jeVRozsahu', () => {
  it('datum uvnitř rozsahu (včetně obou krajů) je true', () => {
    expect(jeVRozsahu('2025-01-13', '2025-01-13', '2025-01-19')).toBe(true)
    expect(jeVRozsahu('2025-01-16', '2025-01-13', '2025-01-19')).toBe(true)
    expect(jeVRozsahu('2025-01-19', '2025-01-13', '2025-01-19')).toBe(true)
  })

  it('datum mimo rozsah je false', () => {
    expect(jeVRozsahu('2025-01-12', '2025-01-13', '2025-01-19')).toBe(false)
    expect(jeVRozsahu('2025-01-20', '2025-01-13', '2025-01-19')).toBe(false)
  })

  it('chybějící nebo neplatné (volný text) datum je vždy false', () => {
    expect(jeVRozsahu(null, '2025-01-13', '2025-01-19')).toBe(false)
    expect(jeVRozsahu(undefined, '2025-01-13', '2025-01-19')).toBe(false)
    expect(jeVRozsahu('Zítra', '2025-01-13', '2025-01-19')).toBe(false)
  })
})

describe('patriKeDni', () => {
  it('bez planDate rozhoduje dueDate', () => {
    expect(patriKeDni(task({ dueDate: '2025-01-15', planDate: null }), '2025-01-15')).toBe(true)
    expect(patriKeDni(task({ dueDate: '2025-01-15', planDate: null }), '2025-01-16')).toBe(false)
  })

  it('s vyplněným planDate rozhoduje planDate, ne dueDate', () => {
    const t = task({ dueDate: '2025-01-20', planDate: '2025-01-15' })
    expect(patriKeDni(t, '2025-01-15')).toBe(true)
    expect(patriKeDni(t, '2025-01-20')).toBe(false)
  })
})
