import { useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { MindNode } from './types'

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
  deleteNode: (id: string) => void
}

const useMindMapStore = create<MindMapState>()(
  persist(
    (set) => ({
      nodes: INITIAL_NODES,

      addChild: (parentId, text) => {
        if (!text.trim()) return

        set((state) => {
          const parent = state.nodes[parentId]
          if (!parent) return state // rodič mezitím zmizel, není kam přidávat

          const newId = Date.now().toString()
          const newNode: MindNode = { id: newId, text, parentId, childrenIds: [] }

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

export const useMindMap = () => {
  const { nodes, addChild, deleteNode } = useMindMapStore()
  const [activeNodeId, setActiveNodeId] = useState<string>('root')

  const handleDeleteNode = (id: string) => {
    deleteNode(id)
    setActiveNodeId('root')
  }

  return { nodes, activeNodeId, setActiveNodeId, addChild, deleteNode: handleDeleteNode }
}
