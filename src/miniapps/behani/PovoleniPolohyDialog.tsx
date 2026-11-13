import { BuddyDialog } from '@/components/buddy-ui/BuddyDialog'

interface Props {
  onPovolit: () => void
  onZavrit: () => void
}

export function PovoleniPolohyDialog({ onPovolit, onZavrit }: Props) {
  return (
    <BuddyDialog
      surfaceId="behani"
      title="Přístup k poloze"
      onClose={onZavrit}
      footer={(
        <>
          <button type="button" className="buddy-ui-button" onClick={onZavrit}>Teď ne</button>
          <button type="button" className="buddy-ui-button buddy-ui-button--primary" onClick={onPovolit}>
            Povolit přístup k poloze
          </button>
        </>
      )}
    >
      <p className="behani-poloha-text">
        Běhání a kardio potřebuje tvou polohu k zaznamenání trasy, vzdálenosti a tempa.
        Záznam polohy zůstává v tomto zařízení.
      </p>
    </BuddyDialog>
  )
}
