import { useState } from 'react'
import { sestavKroniku, nactiKronikuElary } from '../kronika'

interface Props { kristalova: boolean; druha: boolean; treti: boolean; kael: boolean }
/** Záznamy se načítají při otevření, takže nově zapsaný objev Elary je vidět bez reloadu. */
export function KronikaSveta({ kristalova, druha, treti, kael }: Props) {
  const [otevreno, setOtevreno] = useState(false)
  const [elara, setElara] = useState(false)
  const zaznamy = sestavKroniku({ kristalova, druha, treti, kael, elara })
  const dostupne = zaznamy.filter(z => z.odemceno).length
  return <section className="bw-kronika" aria-label="Kronika světa">
    <button type="button" aria-expanded={otevreno} onClick={() => {
      if (!otevreno) setElara(nactiKronikuElary(localStorage))
      setOtevreno(!otevreno)
    }}>📖 Kronika světa {otevreno ? '▲' : '▼'}</button>
    {otevreno && <div role="region" aria-label="Záznamy kroniky">
      <p>Objeveno: {dostupne}/{zaznamy.length}</p>
      <ul>{zaznamy.map(z => <li key={z.id}>
        <strong>{z.odemceno ? '📜 ' + z.nadpis : '🔒 Neobjevený záznam'}</strong>
        {z.odemceno && <p>{z.text}</p>}
      </li>)}</ul>
    </div>}
  </section>
}
