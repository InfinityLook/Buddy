// ==========================================
// Tenký obal nad core/utils/sdileni.ts s pevným titulkem "Souboj" — sama
// logika (Web Share API, schránka jako záloha, tiché odbytí) se
// přesunula do core/utils/ ve chvíli, kdy ji potřebovala i druhá appka
// (Form Check). Zůstává jako samostatný soubor, ať se pěti volajícím
// v src/fighting/components/ nemusí měnit import ani volání.
// ==========================================

import { PODPORUJE_SDILENI, sdilejText as sdilejTextObecne } from '@/core/utils/sdileni'

export { PODPORUJE_SDILENI }

export const sdilejText = (text: string): Promise<boolean> => sdilejTextObecne(text, 'Souboj')
