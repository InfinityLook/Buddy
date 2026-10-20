/** Original v46 navigation vectors. No icon font or external icon library. */
export function PanelIcon({ name }: { name: string }) {
    const paths: Record<string, string> = {
        story: 'M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2ZM12 6v15',
        world: 'm3 5 6-2 6 3 6-2v16l-6 2-6-3-6 2ZM9 3v16m6-13v16',
        gear: 'M6 8h12l3 13H3ZM9 8V5a3 3 0 0 1 6 0v3m-6 4v3m6-3v3',
        journal: 'M5 3h14v18H5Zm4 5h6m-6 4h6m-6 4h4',
        buddy: 'M7 17c0-6 10-6 10 0 0 4-3 1-5 1s-5 3-5-1ZM5 9V6m5 1V3m5 4V3m4 6V6',
        home: 'm2 11 10-9 10 9M5 9v13h14V9m-9 13v-8h4v8',
        settings: 'M12 3v3m0 12v3M3 12h3m12 0h3M5.5 5.5l2 2m9 9 2 2m-13 0 2-2m9-9 2-2M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    };
    return <svg className="fw-panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name] ?? paths.story}/></svg>;
}
