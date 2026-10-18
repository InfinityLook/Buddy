declare global { var __BUDDY_ASSETS__: Record<string,string> | undefined }
// Populated only by the single-file offline edition. Hosted builds keep ordinary URLs.
export const assetUrl=(path:string)=>globalThis.__BUDDY_ASSETS__?.[path]??path
