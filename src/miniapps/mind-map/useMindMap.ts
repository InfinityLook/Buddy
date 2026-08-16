import { useState } from 'react'
import { MindNode } from './types'

const INITIAL_NODES: Record<string, MindNode> = {
  root: { id: 'root', text: 'Hlavní téma', parentId: null, childrenIds: ['1', '2'] },
  '1': { id: '1', text: 'Podtéma A', parentId: 'root', childrenIds: [] },
  '2': { id: '2', text: 'Podtéma B', parentId: 'root', childrenIds: [] },
}

export const useMindMap = () => {
  const [nodes, setNodes] = useState<Record<string, MindNode>>(INITIAL_NODES)
  const [activeNodeId, setActiveNodeId] = useState<string>('root')

  const addChild = (parentId: string, text: string) => {
    if (!text.trim()) return
    const newId = Date.now().toString()
    const newNode: MindNode = { id: newId, text, parentId, childrenIds: [] }

    setNodes((prev) => ({
      ...prev,
      [newId]: newNode,
      [parentId]: {
        ...prev[parentId],
        childrenIds: [...prev[parentId].childrenIds, newId],
      },
    }))
  }

  const deleteNode = (id: string) => {
    if (id === 'root') return
    setNodes((prev) => {
      const nodeToDelete = prev[id]
      if (!nodeToDelete) return prev

      const newNodes = { ...prev }
      delete newNodes[id]

      if (nodeToDelete.parentId && newNodes[nodeToDelete.parentId]) {
        newNodes[nodeToDelete.parentId] = {
          ...newNodes[nodeToDelete.parentId],
          childrenIds: newNodes[nodeToDelete.parentId].childrenIds.filter((cId) => cId !== id),
        }
      }

      return newNodes
    })
    setActiveNodeId('root')
  }

  return { nodes, activeNodeId, setActiveNodeId, addChild, deleteNode }
}
