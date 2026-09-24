import { describe, it, expect, beforeEach } from 'vitest'
import { layoutMindMap, edgePath, NODE_WIDTH, NODE_HEIGHT } from '@/miniapps/mind-map/layout'
import { collectSubtree, sanitizeNode, pruneOrphans, useMindMapStore } from '@/miniapps/mind-map/useMindMap'
import type { MindNode } from '@/miniapps/mind-map/types'
import { useGamificationStore } from '@/core/store/useGamificationStore'

// ==========================================
// src/miniapps/mind-map/ — dosud bez jakéhokoli pokrytí testy. Store se
// testuje přímo přes Zustand API (getState()/setState()), stejná zásada
// jako core/store/useGamificationStore.ts; layout.ts jsou čisté funkce
// bez závislosti na Reactu ani na storu.
// ==========================================

const strom = (extra?: Partial<Record<string, MindNode>>): Record<string, MindNode> => ({
  root: { id: 'root', text: 'Kořen', parentId: null, childrenIds: ['a', 'b'] },
  a: { id: 'a', text: 'A', parentId: 'root', childrenIds: [] },
  b: { id: 'b', text: 'B', parentId: 'root', childrenIds: [] },
  ...extra,
})

describe('layoutMindMap', () => {
  it('vrátí prázdné rozvržení, když ve stavu chybí kořen', () => {
    expect(layoutMindMap({}, new Set())).toEqual({ nodes: [], edges: [], width: 0, height: 0 })
  })

  it('umístí kořen a dva listy jako dvě hrany', () => {
    const layout = layoutMindMap(strom(), new Set())
    expect(layout.nodes).toHaveLength(3)
    expect(layout.edges).toHaveLength(2)
    const root = layout.nodes.find((n) => n.id === 'root')!
    expect(root.depth).toBe(0)
    const a = layout.nodes.find((n) => n.id === 'a')!
    expect(a.depth).toBe(1)
  })

  it('rodič se svisle zarovná doprostřed mezi prvního a posledního potomka', () => {
    const nodes = strom({
      c: { id: 'c', text: 'C', parentId: 'root', childrenIds: [] },
      root: { id: 'root', text: 'Kořen', parentId: null, childrenIds: ['a', 'b', 'c'] },
    })
    const layout = layoutMindMap(nodes, new Set())
    const [first, , last] = ['a', 'b', 'c'].map((id) => layout.nodes.find((n) => n.id === id)!)
    const root = layout.nodes.find((n) => n.id === 'root')!
    expect(root.y).toBeCloseTo((first.y + last.y) / 2)
  })

  it('sbalený uzel skryje potomky, ale childCount pořád ukazuje jejich skutečný počet', () => {
    const layout = layoutMindMap(strom(), new Set(['root']))
    expect(layout.nodes).toHaveLength(1)
    const root = layout.nodes[0]
    expect(root.collapsed).toBe(true)
    expect(root.childCount).toBe(2)
  })

  it('nezacyklí se, když uložená data obsahují cyklus', () => {
    const cyklus: Record<string, MindNode> = {
      root: { id: 'root', text: 'Kořen', parentId: null, childrenIds: ['a'] },
      a: { id: 'a', text: 'A', parentId: 'root', childrenIds: ['root'] },
    }
    const layout = layoutMindMap(cyklus, new Set())
    // walk() postorderem zapisuje potomka dřív než rodiče (rodičova
    // centerY se počítá až z už spočtených dětí) — 'a' proto v poli
    // sedí před 'root', ale klíčové je, že se oba uzly objeví právě
    // jednou a nekonečná rekurze se nekoná.
    expect(layout.nodes.map((n) => n.id).sort()).toEqual(['a', 'root'])
  })

  it('šířka/výška vychází z x/y nejvzdálenějšího uzlu plus okraj', () => {
    const layout = layoutMindMap(strom(), new Set())
    const nejdal = Math.max(...layout.nodes.map((n) => n.x))
    expect(layout.width).toBeGreaterThanOrEqual(nejdal + NODE_WIDTH)
    expect(layout.height).toBeGreaterThan(NODE_HEIGHT)
  })
})

describe('edgePath', () => {
  it('vede plynulou křivkou mezi rodičem a potomkem, ne pravoúhlou čárou', () => {
    const d = edgePath({ id: 'e', fromX: 0, fromY: 10, toX: 100, toY: 40 })
    expect(d.startsWith('M 0 10')).toBe(true)
    expect(d).toContain('C ')
    expect(d.endsWith('100 40')).toBe(true)
  })
})

describe('collectSubtree', () => {
  it('posbírá uzel i všechny jeho potomky do hloubky', () => {
    const nodes = strom({
      c: { id: 'c', text: 'C', parentId: 'a', childrenIds: [] },
      a: { id: 'a', text: 'A', parentId: 'root', childrenIds: ['c'] },
    })
    expect([...collectSubtree(nodes, 'a')].sort()).toEqual(['a', 'c'])
  })

  it('nezacyklí se na cyklu v datech', () => {
    const cyklus: Record<string, MindNode> = {
      a: { id: 'a', text: 'A', parentId: null, childrenIds: ['b'] },
      b: { id: 'b', text: 'B', parentId: 'a', childrenIds: ['a'] },
    }
    expect([...collectSubtree(cyklus, 'a')].sort()).toEqual(['a', 'b'])
  })
})

describe('sanitizeNode', () => {
  it('barvu mimo pevnou paletu spraví na null', () => {
    const node = { id: 'x', text: 'X', parentId: null, childrenIds: [], barva: 'purpurova' } as unknown as MindNode
    expect(sanitizeNode(node).barva).toBeNull()
  })

  it('platnou barvu z palety nechá beze změny', () => {
    const node: MindNode = { id: 'x', text: 'X', parentId: null, childrenIds: [], barva: 'cyan' }
    expect(sanitizeNode(node).barva).toBe('cyan')
  })

  it('poznámku/tag jiného typu než string spraví na prázdný řetězec', () => {
    const node = {
      id: 'x',
      text: 'X',
      parentId: null,
      childrenIds: [],
      poznamka: 42,
      tag: null,
    } as unknown as MindNode
    const sanit = sanitizeNode(node)
    expect(sanit.poznamka).toBe('')
    expect(sanit.tag).toBe('')
  })
})

describe('pruneOrphans', () => {
  it('bez kořene v uložených datech spadne na výchozí mapu', () => {
    const cleaned = pruneOrphans(undefined)
    expect(cleaned.root).toBeDefined()
    expect(Object.keys(cleaned)).toHaveLength(3)
  })

  it('zahodí uzly, ke kterým se od kořene nedá dojít', () => {
    const nodes = strom({
      osirely: { id: 'osirely', text: 'Osiřelý', parentId: 'neexistuje', childrenIds: [] },
    })
    const cleaned = pruneOrphans(nodes)
    expect(cleaned.osirely).toBeUndefined()
    expect(Object.keys(cleaned).sort()).toEqual(['a', 'b', 'root'])
  })

  it('odstraní odkazy na potomky, kteří v mapě chybí', () => {
    const nodes = strom({
      root: { id: 'root', text: 'Kořen', parentId: null, childrenIds: ['a', 'b', 'chybi'] },
    })
    const cleaned = pruneOrphans(nodes)
    expect(cleaned.root.childrenIds).toEqual(['a', 'b'])
  })
})

describe('useMindMapStore', () => {
  const vychoziStav = useMindMapStore.getState().nodes

  const resetStore = () => {
    useMindMapStore.setState({ nodes: vychoziStav })
    useGamificationStore.setState({ counters: {}, xp: 0 })
  }

  beforeEach(resetStore)

  it('addChild přidá potomka pod rodiče a připíše XP přes recordAction', () => {
    useMindMapStore.getState().addChild('root', 'Nové podtéma')
    const nodes = useMindMapStore.getState().nodes
    const noveId = Object.keys(nodes).find((id) => nodes[id].text === 'Nové podtéma')
    expect(noveId).toBeDefined()
    expect(nodes.root.childrenIds).toContain(noveId)
    expect(useGamificationStore.getState().counters.mindNode).toBe(1)
  })

  it('addChild s neexistujícím rodičem nic nepřidá ani nepřipíše XP', () => {
    useMindMapStore.getState().addChild('neexistuje', 'Text')
    expect(Object.keys(useMindMapStore.getState().nodes)).toEqual(Object.keys(vychoziStav))
    expect(useGamificationStore.getState().counters.mindNode ?? 0).toBe(0)
  })

  it('addChild s textem jen z mezer nic nepřidá', () => {
    useMindMapStore.getState().addChild('root', '   ')
    expect(Object.keys(useMindMapStore.getState().nodes)).toEqual(Object.keys(vychoziStav))
  })

  it('renameNode ořízne mezery a přejmenuje existující uzel', () => {
    useMindMapStore.getState().renameNode('1', '  Nový název  ')
    expect(useMindMapStore.getState().nodes['1'].text).toBe('Nový název')
  })

  it('renameNode na neexistující uzel nic nezmění', () => {
    useMindMapStore.getState().renameNode('neexistuje', 'Text')
    expect(useMindMapStore.getState().nodes).toEqual(vychoziStav)
  })

  it('setNodeBarva nastaví a null zase zruší barvu uzlu', () => {
    useMindMapStore.getState().setNodeBarva('1', 'magenta')
    expect(useMindMapStore.getState().nodes['1'].barva).toBe('magenta')
    useMindMapStore.getState().setNodeBarva('1', null)
    expect(useMindMapStore.getState().nodes['1'].barva).toBeNull()
  })

  it('setNodeDetail uloží poznámku i tag ořízlé o okrajové mezery', () => {
    useMindMapStore.getState().setNodeDetail('1', '  Delší poznámka  ', '  Důležité  ')
    const node = useMindMapStore.getState().nodes['1']
    expect(node.poznamka).toBe('Delší poznámka')
    expect(node.tag).toBe('Důležité')
  })

  it('deleteNode smaže uzel i celý jeho podstrom a odebere ho ze seznamu potomků rodiče', () => {
    useMindMapStore.getState().addChild('1', 'Vnouček')
    const vnoucekId = Object.keys(useMindMapStore.getState().nodes).find(
      (id) => useMindMapStore.getState().nodes[id].text === 'Vnouček'
    )!
    useMindMapStore.getState().deleteNode('1')
    const nodes = useMindMapStore.getState().nodes
    expect(nodes['1']).toBeUndefined()
    expect(nodes[vnoucekId]).toBeUndefined()
    expect(nodes.root.childrenIds).not.toContain('1')
  })

  it('deleteNode odmítne smazat kořen', () => {
    useMindMapStore.getState().deleteNode('root')
    expect(useMindMapStore.getState().nodes.root).toBeDefined()
  })
})
