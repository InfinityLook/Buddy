import React, { useState } from 'react'
import { SurfaceBackdrop, useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
import { useStudyPlanner, VstupUkolu } from './useStudyPlanner'
import {
  OPAKOVANI_LABELS,
  Opakovani,
  PRILOHA_ID_PREFIX,
  PrilohaUkolu,
  StudyTask,
  TASK_FILTERS,
  TASK_PRIORITIES,
  TASK_VIEWS,
  TaskFilter,
  TaskPriority,
  formatDueDate,
  spocitejPodukoly,
  todayIso,
} from './types'
import { sklonujUkoly, zbyvaSloveso } from '@/core/utils/text'
import { MAX_FILE_BYTES, deleteFileBlob, getFileBlob, putFileBlob } from '@/core/utils/fileStorage'
import { stahnoutBlob } from '@/core/utils/download'
import { nastavAktivniPredmetZPlanovace } from '@/miniapps/pomodoro/usePomodoro'
import { useAppStore } from '@/core/store/useAppStore'
import './StudyPlanner.css'

/** Ikonka přílohy podle MIME typu — appka nerozlišuje přílohy žádným
 *  náhledem (na rozdíl od Financí jediné účtenky appka tu může mít
 *  víc souborů různých typů), jen krátkou vizuální nápovědou. */
const ikonaProMime = (mime: string): string => {
  if (mime.startsWith('image/')) return '🖼'
  if (mime === 'application/pdf') return '📄'
  if (mime.startsWith('audio/')) return '🎵'
  if (mime.startsWith('video/')) return '🎬'
  return '📎'
}

export const StudyPlanner: React.FC = () => {
  const { rootAttributes } = useSurfaceAppearance('study-planner')
  const { setActiveAppId, returnPath } = useAppStore()

  const {
    visibleTasks,
    skupinyPodlePredmetu,
    totalCount,
    pendingCount,
    overdueCount,
    filter,
    setFilter,
    view,
    setView,
    toggleTask,
    addTask,
    updateTask,
    deleteTask,
    pridatPodukol,
    prepnoutPodukol,
    smazatPodukol,
    posunoutUkol,
    pridatPrilohu,
    smazatPrilohu,
    nastavPoznamku,
  } = useStudyPlanner()

  // null = zavřeno, '' = zakládá se nový, jinak id upravovaného úkolu
  const [editingId, setEditingId] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('Střední')
  const [estimateMinutes, setEstimateMinutes] = useState('')
  const [planDate, setPlanDate] = useState('')
  const [opakovani, setOpakovani] = useState<Opakovani>('zadne')
  const [poznamka, setPoznamka] = useState('')
  // Pokročilá pole (odhad/plán/opakování/poznámka) appka schová za
  // zvláštní přepínač, ať obyčejné "+ Nový úkol" zůstane rychlé jako
  // dřív — otevře se samo, jen když upravovaný úkol už některé z nich
  // vyplněné má (viz openEdit).
  const [pokrocileOtevrene, setPokrocileOtevrene] = useState(false)

  // Jen jeden úkol najednou má rozbalený detail (podúkoly/poznámka/
  // přílohy) — stejná "jedno id, ne sada otevřených" úspora jako
  // Rozvrhovo kopirovanyDen.
  const [rozbalenyTaskId, setRozbalenyTaskId] = useState<string | null>(null)
  const [novyPodukol, setNovyPodukol] = useState('')
  const [poznamkaDraft, setPoznamkaDraft] = useState('')
  // Jedna společná appka pro celou obrazovku, ne na úkol — appka
  // počítá s tím, že uživatel nahrává přílohu jednu po druhé, ne
  // souběžně do víc úkolů najednou.
  const [nahravaSePriloha, setNahravaSePriloha] = useState(false)

  const isFormOpen = editingId !== null

  const openAdd = () => {
    setSubject('')
    setTopic('')
    setDueDate(todayIso())
    setPriority('Střední')
    setEstimateMinutes('')
    setPlanDate('')
    setOpakovani('zadne')
    setPoznamka('')
    setPokrocileOtevrene(false)
    setEditingId('')
  }

  const openEdit = (task: StudyTask) => {
    setSubject(task.subject)
    setTopic(task.topic)
    // Starý úkol může mít v termínu volný text, který do inputu typu
    // date nepatří — v takovém případě nabídneme dnešek.
    setDueDate(/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate) ? task.dueDate : todayIso())
    setPriority(task.priority)
    setEstimateMinutes(task.estimateMinutes != null ? String(task.estimateMinutes) : '')
    setPlanDate(task.planDate ?? '')
    setOpakovani(task.opakovani ?? 'zadne')
    setPoznamka(task.poznamka ?? '')
    setPokrocileOtevrene(
      Boolean(task.estimateMinutes || task.planDate || (task.opakovani && task.opakovani !== 'zadne') || task.poznamka)
    )
    setEditingId(task.id)
  }

  const closeForm = () => setEditingId(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const parsedEstimate = estimateMinutes.trim() === '' ? NaN : Number(estimateMinutes)
    const vstup: VstupUkolu = {
      subject,
      topic,
      dueDate,
      priority,
      estimateMinutes: Number.isFinite(parsedEstimate) && parsedEstimate >= 0 ? parsedEstimate : null,
      planDate: planDate || null,
      opakovani,
      poznamka,
    }

    if (editingId) updateTask(editingId, vstup)
    else addTask(vstup)
    closeForm()
  }

  const handleDelete = (task: StudyTask) => {
    if (!window.confirm(`Smazat úkol „${task.topic}“?`)) return
    // Appka při smazání úkolu uvolní i jeho přílohy z IndexedDB — jinak
    // by tam zůstaly navždy osiřelé, nikým neodkazované.
    for (const priloha of task.prilohy ?? []) void deleteFileBlob(priloha.id)
    deleteTask(task.id)
    if (editingId === task.id) closeForm()
    if (rozbalenyTaskId === task.id) setRozbalenyTaskId(null)
  }

  const toggleDetail = (task: StudyTask) => {
    const jeOtevreny = rozbalenyTaskId === task.id
    setRozbalenyTaskId(jeOtevreny ? null : task.id)
    setNovyPodukol('')
    setPoznamkaDraft(jeOtevreny ? '' : task.poznamka ?? '')
  }

  const handleVybranSoubor = async (taskId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const soubor = e.target.files?.[0]
    e.target.value = ''
    if (!soubor) return

    if (soubor.size > MAX_FILE_BYTES) {
      window.alert('Soubor je moc velký (limit 25 MB).')
      return
    }

    setNahravaSePriloha(true)
    try {
      const id = PRILOHA_ID_PREFIX + `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      await putFileBlob(id, soubor)
      pridatPrilohu(taskId, { id, nazev: soubor.name, mime: soubor.type || 'application/octet-stream' })
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Přílohu se nepodařilo přiložit.')
    } finally {
      setNahravaSePriloha(false)
    }
  }

  const handleStahnoutPrilohu = async (priloha: PrilohaUkolu) => {
    const blob = await getFileBlob(priloha.id)
    if (blob) stahnoutBlob(priloha.nazev, blob)
    else window.alert('Obsah přílohy se nepodařilo najít — možná se ztratil po obnově ze starší zálohy.')
  }

  const handleSmazatPrilohu = (taskId: string, priloha: PrilohaUkolu) => {
    void deleteFileBlob(priloha.id)
    smazatPrilohu(taskId, priloha.id)
  }

  // "▶ Soustředit se" — appka Pomodoru nejdřív předá, nad kterým
  // úkolem se běžící soustředění zapisuje (stejná funkce, jakou pro
  // svůj vlastní souhrn používá i SchoolRoomModule.tsx), a teprve pak
  // deep-linkem otevře Pomodoro. StudyPlanner je sám uvnitř už
  // otevřenou miniaplikací na /apps, takže stačí přepnout activeAppId —
  // AppModule.tsx se na něj přihlašuje a sám přemountuje, co se
  // zobrazuje v jeho fullscreen wrapperu.
  const spustitSoustredeniNadUkolem = (task: StudyTask) => {
    nastavAktivniPredmetZPlanovace(`${task.subject}: ${task.topic}`)
    setActiveAppId('pomodoro', returnPath)
  }

  const prazdnyText = (): string => {
    if (totalCount === 0) return 'Zatím tu nemáš žádný úkol. Zapiš si první — co tě čeká do příště? 📚'
    if (view === 'dnes') return 'Na dnešek nic naplánované není.'
    if (view === 'tyden') return 'Na tenhle týden nic naplánované není.'
    if (view === 'nestihnute') return 'Žádný úkol po termínu — výborně! 🎉'
    return 'Téhle podmínce neodpovídá žádný úkol.'
  }

  const renderTaskCard = (t: StudyTask) => {
    const due = formatDueDate(t.dueDate)
    const { hotovo, celkem } = spocitejPodukoly(t)
    const jeRozbaleny = rozbalenyTaskId === t.id
    const jePoTerminu = due.tone === 'overdue'
    const prilohyPocet = (t.prilohy ?? []).length

    return (
      <div key={t.id} className="sp-card-wrap">
        <div className={`sp-card ${t.completed ? 'completed' : ''}`}>
          <input
            type="checkbox"
            className="sp-checkbox"
            checked={t.completed}
            onChange={() => toggleTask(t.id)}
            aria-label={`Splněno: ${t.topic}`}
          />

          <button className="sp-details sp-details-btn" onClick={() => toggleDetail(t)}>
            <div className="sp-card-head">
              <span className="sp-subject">{t.subject}</span>
              <span className={`sp-priority ${t.priority.toLowerCase()}`}>{t.priority}</span>
            </div>

            <p className="sp-topic">{t.topic}</p>

            <div className="sp-card-meta">
              {/* Termín se barví podle naléhavosti — po termínu červeně,
                  dnes oranžově. */}
              <span className={`sp-date ${t.completed ? '' : `is-${due.tone}`}`}>{due.label}</span>
              {t.estimateMinutes != null && <span className="sp-meta-badge">⏱ {t.estimateMinutes} min</span>}
              {celkem > 0 && (
                <span className="sp-podukoly-badge">
                  ☑ {hotovo}/{celkem}
                </span>
              )}
              {prilohyPocet > 0 && <span className="sp-meta-badge">📎 {prilohyPocet}</span>}
              {(t.posunuto ?? 0) > 0 && (
                <span
                  className="sp-meta-badge sp-posunuto-badge"
                  title={t.puvodniTermin ? `Původní termín: ${formatDueDate(t.puvodniTermin).label}` : undefined}
                >
                  ↻ {t.posunuto}×
                </span>
              )}
            </div>
          </button>

          <div className="sp-card-actions">
            {jePoTerminu && !t.completed && (
              <button
                className="sp-icon-btn sp-posun-btn"
                onClick={() => posunoutUkol(t.id, todayIso())}
                aria-label={`Posunout ${t.topic} na dnes`}
                title="Posunout na dnes"
              >
                →📅
              </button>
            )}
            <button
              className="sp-icon-btn"
              onClick={() => spustitSoustredeniNadUkolem(t)}
              aria-label={`Soustředit se na ${t.topic}`}
              title="Spustit soustředění v Pomodoru"
            >
              ▶
            </button>
            <button className="sp-icon-btn" onClick={() => openEdit(t)} aria-label={`Upravit ${t.topic}`}>
              ✏️
            </button>
            <button className="sp-icon-btn danger" onClick={() => handleDelete(t)} aria-label={`Smazat ${t.topic}`}>
              ✕
            </button>
          </div>
        </div>

        {jeRozbaleny && (
          <div className="sp-detail">
            <div className="sp-podukoly">
              {(t.podukoly ?? []).map((p) => (
                <div key={p.id} className="sp-podukol-radek">
                  <label className="sp-podukol-label">
                    <input type="checkbox" checked={p.hotovo} onChange={() => prepnoutPodukol(t.id, p.id)} />
                    <span className={p.hotovo ? 'je-hotovo' : ''}>{p.text}</span>
                  </label>
                  <button
                    className="sp-podukol-smazat"
                    aria-label={`Smazat podúkol ${p.text}`}
                    onClick={() => smazatPodukol(t.id, p.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}

              <form
                className="sp-podukol-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  pridatPodukol(t.id, novyPodukol)
                  setNovyPodukol('')
                }}
              >
                <input
                  type="text"
                  placeholder="+ Přidat krok"
                  value={novyPodukol}
                  onChange={(e) => setNovyPodukol(e.target.value)}
                />
                <button type="submit" disabled={!novyPodukol.trim()}>
                  Přidat
                </button>
              </form>
            </div>

            <div className="sp-detail-sekce">
              <span className="sp-detail-nadpis">📝 Poznámka</span>
              <textarea
                className="sp-poznamka-textarea"
                rows={2}
                placeholder="Pár slov k úkolu…"
                value={poznamkaDraft}
                onChange={(e) => setPoznamkaDraft(e.target.value)}
              />
              <button type="button" className="sp-poznamka-ulozit-btn" onClick={() => nastavPoznamku(t.id, poznamkaDraft)}>
                💾 Uložit poznámku
              </button>
            </div>

            <div className="sp-detail-sekce">
              <span className="sp-detail-nadpis">📎 Přílohy</span>

              {(t.prilohy ?? []).map((p) => (
                <div key={p.id} className="sp-priloha-radek">
                  <span className="sp-priloha-nazev">
                    {ikonaProMime(p.mime)} {p.nazev}
                  </span>
                  <div className="sp-priloha-akce">
                    <button
                      type="button"
                      className="sp-icon-btn"
                      onClick={() => void handleStahnoutPrilohu(p)}
                      aria-label={`Stáhnout přílohu ${p.nazev}`}
                    >
                      ⬇
                    </button>
                    <button
                      type="button"
                      className="sp-icon-btn danger"
                      onClick={() => handleSmazatPrilohu(t.id, p)}
                      aria-label={`Smazat přílohu ${p.nazev}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}

              <input
                type="file"
                id={`sp-priloha-input-${t.id}`}
                className="sp-priloha-input"
                disabled={nahravaSePriloha}
                onChange={(e) => void handleVybranSoubor(t.id, e)}
              />
              <label htmlFor={`sp-priloha-input-${t.id}`} className="sp-priloha-pridat-btn">
                {nahravaSePriloha ? 'Nahrávám…' : '+ Přidat přílohu'}
              </label>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="sp-app buddy-theme-scope" {...rootAttributes}>
      <SurfaceBackdrop surfaceId="study-planner" />
      <div className="sp-header">
        <h2>Planer</h2>
        <button className="sp-add-btn" onClick={isFormOpen ? closeForm : openAdd}>
          {isFormOpen ? '✕' : '+ Nový úkol'}
        </button>
      </div>

      {totalCount === 0 && (
        <p className="sp-hint">🔔 Založ první úkol a dovolíme upozorňovat, když se blíží nebo mine termín.</p>
      )}

      {totalCount > 0 && (
        <div className="sp-summary">
          <span>
            {pendingCount === 0
              ? 'Vše splněno 🎉'
              : `${zbyvaSloveso(pendingCount)} ${pendingCount} ${sklonujUkoly(pendingCount)}`}
          </span>
          {overdueCount > 0 && <span className="sp-summary-overdue">{overdueCount} po termínu</span>}
        </div>
      )}

      {totalCount > 0 && (
        <div className="sp-views">
          {TASK_VIEWS.map((v) => (
            <button
              key={v.id}
              className={`sp-view-chip ${view === v.id ? 'active' : ''}`}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}

      {totalCount > 0 && view !== 'nestihnute' && (
        <div className="sp-filters">
          {TASK_FILTERS.map((f) => (
            <button
              key={f}
              className={`sp-filter-chip ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f as TaskFilter)}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {isFormOpen && (
        <form className="sp-form" onSubmit={handleSubmit}>
          <span className="sp-form-title">{editingId ? 'Upravit úkol' : 'Nový úkol'}</span>

          <input
            type="text"
            placeholder="Předmět (např. Fyzika)..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            autoFocus
          />
          <input
            type="text"
            placeholder="Téma / Úkol..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
          />
          <div className="sp-form-row">
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <button type="button" className="sp-pokrocile-toggle" onClick={() => setPokrocileOtevrene((v) => !v)}>
            {pokrocileOtevrene ? '▾ Méně možností' : '▸ Pokročilé (odhad, plán, opakování, poznámka)'}
          </button>

          {pokrocileOtevrene && (
            <div className="sp-pokrocile">
              <div className="sp-form-row">
                <label className="sp-pole-label">
                  Odhad (min)
                  <input
                    type="number"
                    min="0"
                    placeholder="25"
                    value={estimateMinutes}
                    onChange={(e) => setEstimateMinutes(e.target.value)}
                  />
                </label>
                <label className="sp-pole-label">
                  Plán práce
                  <input type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} />
                </label>
              </div>
              <label className="sp-pole-label">
                Opakování
                <select value={opakovani} onChange={(e) => setOpakovani(e.target.value as Opakovani)}>
                  {(Object.entries(OPAKOVANI_LABELS) as [Opakovani, string][]).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sp-pole-label">
                Poznámka
                <textarea
                  rows={2}
                  placeholder="Pár slov k úkolu…"
                  value={poznamka}
                  onChange={(e) => setPoznamka(e.target.value)}
                />
              </label>
            </div>
          )}

          <button type="submit" className="sp-submit-btn">
            {editingId ? 'Uložit změny' : 'Přidat do plánu'}
          </button>
        </form>
      )}

      <div className="sp-list">
        {view === 'predmety' ? (
          skupinyPodlePredmetu.length === 0 ? (
            <p className="sp-empty">{prazdnyText()}</p>
          ) : (
            skupinyPodlePredmetu.map((skupina) => (
              <div key={skupina.predmet} className="sp-skupina">
                <h3 className="sp-skupina-nadpis">{skupina.predmet}</h3>
                {skupina.tasks.map(renderTaskCard)}
              </div>
            ))
          )
        ) : visibleTasks.length === 0 ? (
          <p className="sp-empty">{prazdnyText()}</p>
        ) : (
          visibleTasks.map(renderTaskCard)
        )}
      </div>
    </div>
  )
}
