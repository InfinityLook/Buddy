export interface MindNode {
  id: string
  text: string
  parentId: string | null
  childrenIds: string[]
}
