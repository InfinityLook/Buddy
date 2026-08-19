import { useCallback, useMemo, useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { MindNode } from './types'
import { layoutMindMap } from './layout'

const XP_PER_NODE = 5

const INITIAL_NODES: Record<string, MindNode> = {
  root: { id: 'root', text: 'Hlavní téma', parentId: null, childrenIds: ['1', '2'] },
  '1': { id: '1', text: 'Podtéma A', parentId: 'root', childrenIds: [] },
  '2': { id: '2', text: 'Podtéma B', parentId: 'root', childrenIds: [] },
}

// Posbírá id uzlu a všech jeho potomků. Průchod si drží množinu už
// navštívených uzlů, takže případný cyklus v datech ho nezacyklí.
const collectSubtree = (
  nodes: Record<string, MindNode>,
  id: string,
  acc: Set<string> = new Set()
): Set<string> => {
  acc.add(id)
  const node = nodes[id]
  if (node) {
    for (const childId of node.childrenIds) {
      if (!acc.has(childId)) collectSubtree(nodes, childId, acc)
    }
  }
  return acc
}

// Zahodí uzly, ke kterým se od kořene nedá dojít, a odkazy na potomky,
// kteří v mapě nejsou. Dřívější verze deleteNode mazala jen samotný uzel
// a jeho potomky nechávala v úložišti napořád — tohle ten odpad uklidí
// při prvním načtení a zároveň drží data konzistentní.
const pruneOrphans = (nodes: Record<string, MindNode> | undefined): Record<string, MindNode> => {
  if (!nodes || !nodes.root) return INITIAL_NODES

  const reachable = collectSubtree(nodes, 'root')
  const cleaned: Record<string, MindNode> = {}

  for (const id of reachable) {
    if (nodes[id]) cleaned[id] = nodes[id]
  }

  for (const id of Object.keys(cleaned)) {
    cleaned[id] = {
      ...cleaned[id],
      childrenIds: cleaned[id].childrenIds.filter((childId) => cleaned[childId]),
    }
  }

  return cleaned
}

// Nastaví se v merge, když úklid něco skutečně odebral — viz onRehydrateStorage.
let prunedOnLoad = false

interface MindMapState {
  nodes: Record<string, MindNode>
  addChild: (parentId: string, text: string) => void
  renameNode: (id: string, text: string) => void
  deleteNode: (id: string) => void
}

const useMindMapStore = create<MindMapState>()(
  persist(
    (set) => ({
      nodes: INITIAL_NODES,

      addChild: (parentId, text) => {
        if (!text.trim()) return
        let added = false

        set((state) => {
          const parent = state.nodes[parentId]
          if (!parent) return state // rodič mezitím zmizel, není kam přidávat

          const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
          const newNode: MindNode = {
            id: newId,
            text: text.trim(),
            parentId,
            childrenIds: [],
          }

          added = true
          return {
            nodes: {
              ...state.nodes,
              [newId]: newNode,
              [parentId]: {
                ...parent,
                childrenIds: [...parent.childrenIds, newId],
              },
            },
          }
        })

        // XP až po zápisu — když rodič neexistoval, uzel nevznikl
        if (added) useGamificationStore.getState().recordAction('mindNode', XP_PER_NODE)
      },

      // Přejmenování dosud chybělo úplně: překlep v uzlu se dal opravit
      // jedině smazáním celé větve i s potomky a napsáním znovu.
      renameNode: (id, text) => {
        if (!text.trim()) return
        set((state) => {
          const node = state.nodes[id]
          if (!node) return state
          return { nodes: { ...state.nodes, [id]: { ...node, text: text.trim() } } }
        })
      },

      // Maže celý podstrom — uzel i všechny jeho potomky do hloubky.
      deleteNode: (id) => {
        if (id === 'root') return

        set((state) => {
          const nodeToDelete = state.nodes[id]
          if (!nodeToDelete) return state

          const toRemove = collectSubtree(state.nodes, id)
          const newNodes: Record<string, MindNode> = {}

          for (const [nodeId, node] of Object.entries(state.nodes)) {
            if (!toRemove.has(nodeId)) newNodes[nodeId] = node
          }

          const parent = nodeToDelete.parentId ? newNodes[nodeToDelete.parentId] : undefined
          if (parent) {
            newNodes[parent.id] = {
              ...parent,
              childrenIds: parent.childrenIds.filter((childId) => childId !== id),
            }
          }

          return { nodes: newNodes }
        })
      },
    }),
    {
      name: 'schoolbuddy-mind-map-storage',
      storage: createJSONStorage(() => secureStorage),

      // Uklidí osiřelé uzly, které v úložišti zbyly po starém deleteNode.
      merge: (persisted, current) => {
        const saved = persisted as Partial<MindMapState> | undefined
        const nodes = pruneOrphans(saved?.nodes)
        prunedOnLoad = saved?.nodes
          ? Object.keys(saved.nodes).length !== Object.keys(nodes).length
          : false
        return { ...current, ...saved, nodes }
      },

      // merge uklidí stav jen v paměti — do úložiště by se zapsal až při
      // první změně mapy, takže odpad by tam do té doby ležel dál. Proto si
      // zápis vynutíme. queueMicrotask odloží běh za dokončení create(),
      // jinak by konstanta se storem ještě neexistovala.
      onRehydrateStorage: () => () => {
        if (!prunedOnLoad) return
        prunedOnLoad = false
        queueMicrotask(() => useMindMapStore.setState((state) => ({ nodes: state.nodes })))
      },
    }
  )
)

const MIN_ZOOM = 0.5
const MAX_ZOOM = 1.4
const ZOOM_STEP = 0.15

export const useMindMap = () => {
  const { nodes, addChild, renameNode, deleteNode } = useMindMapStore()

  const [selectedId, setSelectedId] = useState<string>('root')
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [zoom, setZoom] = useState(1)

  const layout = useMemo(() => layoutMindMap(nodes, collapsedIds), [nodes, collapsedIds])

  // Vybraný uzel mohl mezitím zmizet (smazání celé větve) — pak se
  // výběr vrátí na kořen, ať panel dole neukazuje neexistující uzel.
  const selectedNode = nodes[selectedId] ?? nodes.root
  const selectedExists = Boolean(nodes[selectedId])

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const collapseAll = useCallback(() => {
    // Kořen zůstává rozbalený, jinak by z mapy zbyl jediný uzel
    const withChildren = Object.values(nodes)
      .filter((node) => node.id !== 'root' && node.childrenIds.length > 0)
      .map((node) => node.id)
    setCollapsedIds(new Set(withChildren))
  }, [nodes])

  const expandAll = useCallback(() => setCollapsedIds(new Set()), [])

  // Přizpůsobí přiblížení šířce plátna, ať je vidět celá mapa. Nikdy
  // nepřiblíží nad 100 % — malá mapa má zůstat v čitelné velikosti
  // místo toho, aby se roztáhla přes celou obrazovku.
  const fitToWidth = useCallback(
    (availableWidth: number) => {
      if (!availableWidth || layout.width === 0) return
      const ratio = Math.min(1, availableWidth / layout.width)
      // Zaokrouhluje se dolů: toFixed(2) umí zaokrouhlit nahoru
      // a mapa pak o pár pixelů přeteče, kvůli čemuž by "Přizpůsobit"
      // pořád nechávalo vodorovný posuvník.
      setZoom(Math.max(MIN_ZOOM, Math.floor(ratio * 100) / 100))
    },
    [layout.width]
  )

  const handleAddChild = (text: string) => {
    const parentId = selectedExists ? selectedId : 'root'
    addChild(parentId, text)
    // Přidáním do sbaleného uzlu by nový potomek nebyl vidět
    setCollapsedIds((prev) => {
      if (!prev.has(parentId)) return prev
      const next = new Set(prev)
      next.delete(parentId)
      return next
    })
  }

  const handleDelete = (id: string) => {
    deleteNode(id)
    if (id === selectedId) setSelectedId('root')
  }

  const totalNodes = Object.keys(nodes).length

  return {
    layout,
    selectedId: selectedExists ? selectedId : 'root',
    selectedNode,
    setSelectedId,
    collapsedIds,
    hasCollapsed: collapsedIds.size > 0,
    toggleCollapse,
    collapseAll,
    expandAll,
    fitToWidth,
    zoom,
    zoomIn: () => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2))),
    zoomOut: () => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2))),
    canZoomIn: zoom < MAX_ZOOM,
    canZoomOut: zoom > MIN_ZOOM,
    totalNodes,
    addChild: handleAddChild,
    renameNode,
    deleteNode: handleDelete,
  }
}
