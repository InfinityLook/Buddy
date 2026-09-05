import React from 'react'

interface AppIconProps {
  name: string
  size?: number
  className?: string
}

export const AppIcon: React.FC<AppIconProps> = ({ name, size = 20, className }) => {
  const common: React.SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className
  }

  switch (name) {
    case 'arrow-left':
      return <svg {...common}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
    case 'bell':
      return <svg {...common}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
    case 'settings':
      return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 12a7.4 7.4 0 0 0-.1-1l2-1.6-2-3.4-2.4.9a7.6 7.6 0 0 0-1.7-1l-.4-2.5h-4l-.4 2.5a7.6 7.6 0 0 0-1.7 1l-2.4-.9-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2l-2 1.6 2 3.4 2.4-.9a7.6 7.6 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 1.7-1l2.4.9 2-3.4-2-1.6c.07-.33.1-.66.1-1z"/></svg>
    case 'grid':
      return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
    case 'code':
      return <svg {...common}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
    case 'rocket':
      return <svg {...common}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-3.05 11a22.35 22.35 0 0 1-3.95 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
    case 'download':
      return <svg {...common}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
    case 'search':
      return <svg {...common}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
    case 'filter':
      return <svg {...common}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
    case 'list':
      return <svg {...common}><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
    case 'dots':
      return <svg {...common}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
    case 'star':
      return <svg {...common}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    case 'star-filled':
      return <svg {...common} fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    case 'plus':
      return <svg {...common}><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
    case 'arrow-right':
      return <svg {...common}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
    case 'x':
      return <svg {...common}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    case 'check':
      return <svg {...common}><polyline points="20 6 9 17 4 12"/></svg>
    case 'eye':
      return <svg {...common}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
    case 'eye-off':
      return <svg {...common}><path d="M10.7 5.1A9.9 9.9 0 0 1 12 5c6.4 0 10 7 10 7a18.5 18.5 0 0 1-2.7 3.7"/><path d="M6.6 6.6A18.4 18.4 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M14.1 14.1a3 3 0 0 1-4.2-4.2"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
    case 'search-off':
      return <svg {...common}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><line x1="8" x2="14" y1="11" y2="11"/></svg>
    /* Ikony aplikací */
    case 'study-planner':
      return <svg {...common}><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>
    case 'flashcards':
      return <svg {...common}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
    case 'pomodoro':
      return <svg {...common}><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/><path d="M12 2v3"/></svg>
    case 'math-solver':
      return <svg {...common}><rect width="18" height="18" x="3" y="3" rx="2"/><line x1="8" x2="16" y1="9" y2="9"/><line x1="12" x2="12" y1="7" y2="11"/><line x1="8" x2="16" y1="15" y2="15"/></svg>
    case 'quick-notes':
      return <svg {...common}><rect width="18" height="18" x="3" y="3" rx="3"/><line x1="7" x2="17" y1="8" y2="8"/><line x1="7" x2="14" y1="12" y2="12"/><line x1="7" x2="11" y1="16" y2="16"/></svg>
    case 'goal-tracker':
      return <svg {...common}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M2 12h4"/><path d="M18 12h4"/></svg>
    case 'mind-map':
      return <svg {...common}><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04Z"/></svg>
    case 'file-manager':
      return <svg {...common}><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
    case 'document-editor':
      return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" x2="16" y1="13" y2="13"/><line x1="8" x2="16" y1="17" y2="17"/></svg>
    // Maturitní centrum. Do téhle sady ikona chyběla, takže se dlaždici
    // kreslil prázdný barevný čtverec — `default` níže vrací null.
    case 'exam-prep':
      return <svg {...common}><path d="M12 3 2 8l10 5 10-5-10-5Z"/><path d="M6 10.5V16c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5.5"/><path d="M22 8v6"/></svg>
    case 'finance':
      return <svg {...common}><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1.5"/></svg>
    case 'form-check':
      return <svg {...common}><circle cx="12" cy="4" r="2"/><path d="m6 21 2-7 2.5 2L14 21"/><path d="M8 14l1-5 3-1 3 3"/><path d="m17 8 2-2"/></svg>
    // "Nástroje" karta ve School Roomu (viz FlagshipShell.tsx) — dřív
    // sdílela 'grid' se zvonkem hlavičky appky, dostala vlastní ikonu,
    // ať klíč (Nástroje) sedí s tím, co ikona doopravdy ukazuje.
    case 'wrench':
      return <svg {...common}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
    case 'calendar':
      return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
    case 'bar-chart':
      return <svg {...common}><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>
    // Fitness Room (viz FitnessRoomModule.tsx) — kalorie/trénink/kroky/spánek.
    case 'flame':
      return <svg {...common}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
    case 'dumbbell':
      return <svg {...common}><rect x="2" y="9" width="3" height="6" rx="1"/><rect x="19" y="9" width="3" height="6" rx="1"/><line x1="5" x2="19" y1="12" y2="12"/><rect x="6" y="7" width="2" height="10" rx="1"/><rect x="16" y="7" width="2" height="10" rx="1"/></svg>
    case 'moon':
      return <svg {...common}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
    case 'footprints':
      return <svg {...common}><path d="M4 16v-2.38c0-1.12 1.03-2.12 1-3.62-.03-1.5-1.5-2-1.5-3.5S4.5 4 6 4s1.5 1.5 1.5 3c0 1.5-.5 2-.5 3.5s1 2.5 1 4V16"/><path d="M16 20v-2.38c0-1.12 1.03-2.12 1-3.62-.03-1.5-1.5-2-1.5-3.5S16.5 8 18 8s1.5 1.5 1.5 3c0 1.5-.5 2-.5 3.5s1 2.5 1 4V20"/></svg>
    // Hlavička School Roomu (a dalších vlajkových appek) — vrstvy jako
    // "hodně věcí naskládaných na jednom místě".
    case 'layers':
      return <svg {...common}><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>
    // "Výdaj" dlaždice v Economy Roomu (viz EconomyRoomModule.tsx) —
    // 'plus' už existoval pro "Příjem", ale opačná ikona chyběla úplně.
    case 'minus':
      return <svg {...common}><line x1="5" x2="19" y1="12" y2="12"/></svg>
    default:
      return null
  }
}
