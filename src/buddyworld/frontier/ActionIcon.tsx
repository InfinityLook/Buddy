import type { ReactNode } from 'react';
import type { Action } from './useFrontierScene';
import type { PathId } from './content';

// Original Buddy World vectors, matching the art pack's rounded sword / shield strokes.
// Inline SVG keeps the icons sharp and available in both the PWA and single-file edition.
export function ActionIcon({ action, path, buddy }: { action: Action; path: PathId; buddy: string }) {
    const sword = <path d="m7 17 10-13 3 3L10 20M5 14l6 6M7 18l-3 3" />;
    const shield = <path d="m12 3 8 3-1 8c-1 4-4 6-7 8-3-2-6-4-7-8L4 6Z" />;
    const arrow = <><path d="M7 3c8 5 8 13 0 18L12 12ZM3 12h18m-4-4 4 4-4 4" /></>;
    const rune = <><path d="m12 2 8 10-8 10-8-10Zm0 5v10m-4-5h8" /></>;
    let shape: ReactNode;
    switch (action) {
        case 'attack': shape = path === 'stopar' ? arrow : path === 'runotvurce' ? rune : sword; break;
        case 'skill1': shape = path === 'stopar' ? <><path d="M2 9h12M2 15h12M9 5l10 7-10 7m10-7h3" /></> : path === 'runotvurce' ? <><path d="m12 3 4 9-4 9-4-9ZM3 7c-3 3-3 7 0 10M21 7c3 3 3 7 0 10" /></> : <><path d="M4 7a9 9 0 1 1-1 8M4 3v5h5" />{sword}</>; break;
        case 'skill2': shape = path === 'stopar' ? <><path d="M12 3v18M5 7l7 5 7-5M3 15l5 2 4 4 4-4 5-2M7 3l5 4 5-4" /></> : path === 'runotvurce' ? <><circle cx="12" cy="12" r="9" /><path d="M12 7v10m-5-5h10" /></> : shield; break;
        case 'buddy': shape = buddy === 'Moss' ? <><path d="M20 3C7 2 1 10 6 17c7 6 15 0 14-14ZM4 21 16 9m-7 7v-5m4 1h5" /></> : buddy === 'Nyx' ? <><path d="M18 3A9 9 0 1 0 21 16 8 8 0 0 1 18 3Z" /><path d="m7 7 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z" /></> : buddy === 'Frost' ? <><path d="M12 2v20M3 7l18 10M3 17 21 7M8 4l4 3 4-3M8 20l4-3 4 3M3 11l4 1-1 4m15-5-4 1 1 4" /></> : <><path d="M13 2c2 6-2 7 1 10 2-1 3-3 3-4 7 8 3 14-5 14S1 15 6 9c0 3 1 4 3 5-2-6 4-7 4-12Z" /></>; break;
        case 'potion': shape = <><path d="M9 3h6M10 3v6l-5 8c-1 2 0 4 3 4h8c3 0 4-2 3-4l-5-8V3M7 15h10" /><path d="M12 16v3m-1.5-1.5h3" /></>; break;
        case 'dodge': shape = <><path d="M3 6h7M2 12h5M4 18h6m2-13 8 7-8 7m3-7H9" /></>; break;
        case 'interact': shape = <><path d="M8 12V5a2 2 0 0 1 4 0v6-3a2 2 0 0 1 4 0v4-2a2 2 0 0 1 4 0v6c0 4-3 6-6 6h-2c-2 0-3-1-4-3l-4-5c-2-3 1-5 3-3l1 1" /></>; break;
        default: shape = <><circle cx="12" cy="12" r="7" /><path d="M12 1v5m0 12v5M1 12h5m12 0h5" /></>;
    }
    return <svg className="fw-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{shape}</svg>;
}
