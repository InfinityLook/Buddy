import { MindNode } from './types'

// Rozměry uzlu a rozestupy. Drží se tady, protože je potřebuje jak
// výpočet pozic, tak vykreslení — kdyby se rozešly, spojnice by
// nemířily doprostřed uzlů.
export const NODE_WIDTH = 132
export const NODE_HEIGHT = 40
const COLUMN_GAP = 46
const ROW_HEIGHT = 54
const PADDING = 14

export interface LayoutNode {
  id: string
  text: string
  depth: number
  x: number
  y: number
  parentId: string | null
  // Počet potomků celkem (i když je uzel sbalený)
  childCount: number
  collapsed: boolean
}

export interface LayoutEdge {
  id: string
  fromX: number
  fromY: number
  toX: number
  toY: number
}

export interface MindMapLayout {
  nodes: LayoutNode[]
  edges: LayoutEdge[]
  width: number
  height: number
}

const EMPTY: MindMapLayout = { nodes: [], edges: [], width: 0, height: 0 }

/**
 * Spočítá pozice uzlů pro vodorovný strom: kořen vlevo, každá úroveň
 * o sloupec doprava, listy pod sebou. Rodič se svisle zarovná doprostřed
 * mezi svého prvního a posledního potomka, takže spojnice vedou
 * symetricky a strom se dá číst i bez posouvání.
 *
 * Na telefon se vodorovný strom hodí líp než svislý — roste do výšky,
 * kterou lze rolovat, místo do šířky, kde by se okamžitě rozjel mimo
 * obrazovku.
 */
export const layoutMindMap = (
  nodes: Record<string, MindNode>,
  collapsedIds: Set<string>
): MindMapLayout => {
  if (!nodes.root) return EMPTY

  const placed: LayoutNode[] = []
  const byId = new Map<string, LayoutNode>()
  // Chrání před zacyklením, kdyby v uložených datech vznikl kruh
  const visited = new Set<string>()
  let nextRow = 0

  const walk = (id: string, depth: number): number => {
    const node = nodes[id]
    visited.add(id)

    const allChildren = node.childrenIds.filter((childId) => nodes[childId])
    const isCollapsed = collapsedIds.has(id)
    const children = isCollapsed
      ? []
      : allChildren.filter((childId) => !visited.has(childId))

    let centerY: number

    if (children.length === 0) {
      centerY = nextRow * ROW_HEIGHT
      nextRow += 1
    } else {
      const childCenters = children.map((childId) => walk(childId, depth + 1))
      centerY = (childCenters[0] + childCenters[childCenters.length - 1]) / 2
    }

    const laid: LayoutNode = {
      id,
      text: node.text,
      depth,
      x: PADDING + depth * (NODE_WIDTH + COLUMN_GAP),
      y: PADDING + centerY,
      parentId: node.parentId,
      childCount: allChildren.length,
      collapsed: isCollapsed && allChildren.length > 0,
    }

    placed.push(laid)
    byId.set(id, laid)
    return centerY
  }

  walk('root', 0)

  const edges: LayoutEdge[] = []
  for (const node of placed) {
    if (!node.parentId) continue
    const parent = byId.get(node.parentId)
    if (!parent) continue

    edges.push({
      id: `${parent.id}-${node.id}`,
      fromX: parent.x + NODE_WIDTH,
      fromY: parent.y + NODE_HEIGHT / 2,
      toX: node.x,
      toY: node.y + NODE_HEIGHT / 2,
    })
  }

  const width = Math.max(...placed.map((n) => n.x + NODE_WIDTH)) + PADDING
  const height = Math.max(...placed.map((n) => n.y + NODE_HEIGHT)) + PADDING

  return { nodes: placed, edges, width, height }
}

// Spojnice jako plynulá křivka — svislá čára s pravým úhlem vypadá
// v myšlenkové mapě jako adresářový strom, ne jako mapa.
export const edgePath = (edge: LayoutEdge): string => {
  const midX = (edge.fromX + edge.toX) / 2
  return `M ${edge.fromX} ${edge.fromY} C ${midX} ${edge.fromY}, ${midX} ${edge.toY}, ${edge.toX} ${edge.toY}`
}
