import React, { useEffect, useRef, useState } from 'react'
import { useMindMap } from './useMindMap'
import { NODE_HEIGHT, NODE_WIDTH, edgePath } from './layout'
import { BARVY_UZLU, BarvaUzlu } from './types'
import './MindMap.css'

// Popisky pro čtečky obrazovky/aria-label — stejná pevná paleta jako
// Kalendářovo BARVY_DNE.
const NAZEV_BARVY: Record<BarvaUzlu, string> = {
  cyan: 'Tyrkysová',
  violet: 'Fialová',
  magenta: 'Purpurová',
  green: 'Zelená',
  orange: 'Oranžová',
  red: 'Červená',
}

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
    setNodeBarva,
    setNodeDetail,
  } = useMindMap()

  const [newText, setNewText] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [renameText, setRenameText] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)
  const [poznamkaText, setPoznamkaText] = useState('')
  const [tagText, setTagText] = useState('')
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

  // Při přepnutí uzlu nesmí zůstat otevřené přejmenování toho minulého,
  // a pole poznámky/tagu se musí přenačíst na hodnoty nově vybraného uzlu.
  useEffect(() => {
    setRenaming(false)
    setPoznamkaText(selectedNode.poznamka ?? '')
    setTagText(selectedNode.tag ?? '')
  }, [selectedId, selectedNode.poznamka, selectedNode.tag])

  const submitDetail = (e: React.FormEvent) => {
    e.preventDefault()
    setNodeDetail(selectedId, poznamkaText, tagText)
  }

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
                  } ${node.barva ? `mm-node--barva-${node.barva}` : ''}`}
                  onClick={() => setSelectedId(node.id)}
                  title={node.text}
                >
                  {node.text}
                </button>

                {/* Malé odznaky "má poznámku"/"má tag" — jen náznak, celý
                    text obou je vidět v panelu vybraného uzlu níž, ne tady
                    (uzel je jen 132×40 px, na plný text ani štítek by
                    nezbylo místo bez kolize s toggle tlačítkem). */}
                {(node.maPoznamku || node.maTag) && (
                  <div className="mm-node-odznaky" aria-hidden="true">
                    {node.maPoznamku && <span className="mm-node-odznak-poznamka">📝</span>}
                    {node.maTag && <span className="mm-node-odznak-tag">#</span>}
                  </div>
                )}

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

        <div className="mm-barvy-radek" role="group" aria-label="Barva uzlu">
          <button
            className={`mm-barva-vzorek mm-barva-vzorek--bez ${
              !selectedNode.barva ? 'je-vybrana' : ''
            }`}
            aria-label="Bez barvy"
            aria-pressed={!selectedNode.barva}
            onClick={() => setNodeBarva(selectedId, null)}
          >
            ✕
          </button>
          {BARVY_UZLU.map((barva) => (
            <button
              key={barva}
              className={`mm-barva-vzorek mm-barva-vzorek--${barva} ${
                selectedNode.barva === barva ? 'je-vybrana' : ''
              }`}
              aria-label={NAZEV_BARVY[barva]}
              aria-pressed={selectedNode.barva === barva}
              onClick={() => setNodeBarva(selectedId, barva)}
            />
          ))}
        </div>

        <form className="mm-detail-form" onSubmit={submitDetail}>
          <textarea
            className="mm-detail-textarea"
            placeholder="Poznámka k tématu..."
            value={poznamkaText}
            onChange={(e) => setPoznamkaText(e.target.value)}
            rows={2}
          />
          <div className="mm-detail-tag-radek">
            <input
              type="text"
              className="mm-detail-tag-input"
              placeholder="Štítek (např. Důležité)"
              value={tagText}
              onChange={(e) => setTagText(e.target.value)}
              maxLength={24}
            />
            <button type="submit" className="mm-detail-ulozit-btn">
              Uložit
            </button>
          </div>
        </form>

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
