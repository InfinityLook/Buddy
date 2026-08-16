import React, { useState } from 'react'
import { useMindMap } from './useMindMap'
import './MindMap.css'

export const MindMap: React.FC = () => {
  const { nodes, activeNodeId, setActiveNodeId, addChild, deleteNode } = useMindMap()
  const [newText, setNewText] = useState('')

  const activeNode = nodes[activeNodeId] || nodes['root']

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    addChild(activeNode.id, newText)
    setNewText('')
  }

  return (
    <div className="mm-app">
      <div className="mm-header">
        <h2>Mind Map</h2>
        <span className="mm-badge">Vzdělávání</span>
      </div>

      <div className="mm-viewport">
        {activeNode.parentId && (
          <button className="mm-back-btn" onClick={() => setActiveNodeId(activeNode.parentId!)}>
            ↖ Nadřazené téma
          </button>
        )}

        <div className="mm-current-node">
          <span className="mm-label">Aktuální uzel:</span>
          <h3>{activeNode.text}</h3>
        </div>

        <div className="mm-children">
          <span className="mm-label">Podtémata ({activeNode.childrenIds.length}):</span>
          <div className="mm-grid">
            {activeNode.childrenIds.map((cId) => {
              const child = nodes[cId]
              if (!child) return null
              return (
                <div key={child.id} className="mm-card" onClick={() => setActiveNodeId(child.id)}>
                  <span>{child.text}</span>
                  <button
                    className="mm-del-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteNode(child.id)
                    }}
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <form className="mm-add-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="Nové podtéma..."
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          required
        />
        <button type="submit" className="mm-add-btn">+ Přidat</button>
      </form>
    </div>
  )
}
