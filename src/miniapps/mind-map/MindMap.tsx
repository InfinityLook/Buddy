import React, { useEffect, useRef, useState } from 'react'
import { useMindMap } from './useMindMap'
import { NODE_HEIGHT, NODE_WIDTH, edgePath } from './layout'
import './MindMap.css'

export const MindMap: React.FC = () => {
  const {
    layout,
    selectedId,
    selectedNode,
    setSelectedId,
    toggleCollapse,
    collapseAll,
    expandAll,
    hasCollapsed,
    fitToWidth,
    zoom,
    zoomIn,
    zoomOut,
    canZoomIn,
    canZoomOut,
    totalNodes,
    addChild,
    renameNode,
    deleteNode,
  } = useMindMap()

  const [newText, setNewText] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [renameText, setRenameText] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  // Přizpůsobení proběhne samo jen jednou při otevření. Kdyby se
  // spouštělo při každé změně mapy, přepisovalo by uživateli přiblížení,
  // které si zrovna nastavil.
  const didAutoFit = useRef(false)

  const handleFit = () => {
    const canvas = canvasRef.current
    if (canvas) fitToWidth(canvas.clientWidth)
  }

  useEffect(() => {
    if (didAutoFit.current || layout.width === 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    didAutoFit.current = true
    fitToWidth(canvas.clientWidth)
  }, [layout.width, fitToWidth])

  useEffect(() => {
    if (renaming) renameInputRef.current?.focus()
  }, [renaming])

  // Při přepnutí uzlu nesmí zůstat otevřené přejmenování toho minulého
  useEffect(() => {
    setRenaming(false)
  }, [selectedId])

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    addChild(newText)
    setNewText('')
  }

  const startRename = () => {
    setRenameText(selectedNode.text)
    setRenaming(true)
  }

  const submitRename = (e: React.FormEvent) => {
    e.preventDefault()
    renameNode(selectedId, renameText)
    setRenaming(false)
  }

  const handleDelete = () => {
    if (selectedId === 'root') return
    const childCount = selectedNode.childrenIds.length
    const message = childCount
      ? `Smazat „${selectedNode.text}“ i s ${childCount} podtématy?`
      : `Smazat „${selectedNode.text}“?`
    if (window.confirm(message)) deleteNode(selectedId)
  }

  return (
    <div className="mm-app">
      <div className="mm-header">
        <h2>Mind Map</h2>
        <span className="mm-badge">{totalNodes} uzlů</span>
      </div>

      <div className="mm-toolbar">
        <button
          className="mm-tool-btn"
          onClick={hasCollapsed ? expandAll : collapseAll}
        >
          {hasCollapsed ? 'Rozbalit vše' : 'Sbalit vše'}
        </button>
        <button className="mm-tool-btn" onClick={handleFit}>
          Přizpůsobit
        </button>
        <div className="mm-zoom">
          <button
            className="mm-tool-btn mm-zoom-btn"
            onClick={zoomOut}
            disabled={!canZoomOut}
            aria-label="Oddálit"
          >
            −
          </button>
          <span className="mm-zoom-value">{Math.round(zoom * 100)} %</span>
          <button
            className="mm-tool-btn mm-zoom-btn"
            onClick={zoomIn}
            disabled={!canZoomIn}
            aria-label="Přiblížit"
          >
            +
          </button>
        </div>
      </div>

      {/* Vlastní mapa. Uzly jsou obyčejná tlačítka polohovaná nad SVG
          vrstvou se spojnicemi — díky tomu se dají normálně stylovat
          a mají poctivý tap target, což by u <text> v SVG neplatilo. */}
      <div className="mm-canvas" ref={canvasRef}>
        <div
          className="mm-canvas-inner"
          style={{
            width: layout.width * zoom,
            height: layout.height * zoom,
          }}
        >
          <div
            className="mm-canvas-scale"
            style={{
              width: layout.width,
              height: layout.height,
              transform: `scale(${zoom})`,
            }}
          >
            <svg
              className="mm-edges"
              width={layout.width}
              height={layout.height}
              aria-hidden="true"
            >
              {layout.edges.map((edge) => (
                <path key={edge.id} d={edgePath(edge)} className="mm-edge" />
              ))}
            </svg>

            {layout.nodes.map((node) => (
              <div
                key={node.id}
                className="mm-node-wrap"
                style={{ left: node.x, top: node.y, width: NODE_WIDTH, height: NODE_HEIGHT }}
              >
                <button
                  className={`mm-node ${node.id === selectedId ? 'is-selected' : ''} ${
                    node.depth === 0 ? 'is-root' : ''
                  }`}
                  onClick={() => setSelectedId(node.id)}
                  title={node.text}
                >
                  {node.text}
                </button>

                {/* Přepínač větve sedí na pravém okraji uzlu, odkud
                    spojnice vychází — číslo ukazuje, kolik je skryto. */}
                {node.childCount > 0 && (
                  <button
                    className={`mm-toggle ${node.collapsed ? 'is-collapsed' : ''}`}
                    onClick={() => toggleCollapse(node.id)}
                    aria-label={node.collapsed ? 'Rozbalit větev' : 'Sbalit větev'}
                  >
                    {node.collapsed ? node.childCount : '−'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel vybraného uzlu */}
      <div className="mm-panel">
        <div className="mm-panel-head">
          <span className="mm-label">Vybraný uzel</span>
          <div className="mm-panel-actions">
            <button className="mm-icon-btn" onClick={startRename} aria-label="Přejmenovat">
              ✏️
            </button>
            {selectedId !== 'root' && (
              <button
                className="mm-icon-btn danger"
                onClick={handleDelete}
                aria-label="Smazat uzel"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {renaming ? (
          <form className="mm-add-form" onSubmit={submitRename}>
            <input
              ref={renameInputRef}
              type="text"
              value={renameText}
              onChange={(e) => setRenameText(e.target.value)}
              required
            />
            <button type="submit" className="mm-add-btn">
              Uložit
            </button>
          </form>
        ) : (
          <h3 className="mm-selected-title">{selectedNode.text}</h3>
        )}

        <form className="mm-add-form" onSubmit={handleAdd}>
          <input
            type="text"
            placeholder="Nové podtéma..."
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            required
          />
          <button type="submit" className="mm-add-btn">
            + Přidat
          </button>
        </form>

        <span className="mm-hint">
          Podtéma se přidá pod vybraný uzel. Klepnutím na uzel v mapě ho vybereš,
          kolečkem u něj sbalíš nebo rozbalíš větev.
        </span>
      </div>
    </div>
  )
}
