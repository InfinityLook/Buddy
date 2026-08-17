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
        const newId = Date.now().toString()
        const newNode: MindNode = { id: newId, text, parentId, childrenIds: [] }

        set((state) => ({
          nodes: {
            ...state.nodes,
            [newId]: newNode,
            [parentId]: {
              ...state.nodes[parentId],
              childrenIds: [...state.nodes[parentId].childrenIds, newId],
            },
          },
        }))
      },

      deleteNode: (id) => {
        if (id === 'root') return
        set((state) => {
          const nodeToDelete = state.nodes[id]
          if (!nodeToDelete) return state

          const newNodes = { ...state.nodes }
          delete newNodes[id]

          if (nodeToDelete.parentId && newNodes[nodeToDelete.parentId]) {
            newNodes[nodeToDelete.parentId] = {
              ...newNodes[nodeToDelete.parentId],
              childrenIds: newNodes[nodeToDelete.parentId].childrenIds.filter((cId) => cId !== id),
            }
          }

          return { nodes: newNodes }
        })
      },
    }),
    {
      name: 'schoolbuddy-mind-map-storage',
      storage: createJSONStorage(() => secureStorage),
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
