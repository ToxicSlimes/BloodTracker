import React, { useState } from 'react'
import type { DrugCatalogItem, ResearchData, StudyReference, BloodworkMarker, DrugInteraction } from '../../../types/catalog.js'

interface ResearchModalProps {
  substance: DrugCatalogItem
  closeModal: () => void
}

const TABS = [
  { key: 'mechanism', label: 'МЕХАНИЗМ' },
  { key: 'studies', label: 'ИССЛЕДОВАНИЯ' },
  { key: 'bloodwork', label: 'АНАЛИЗЫ' },
  { key: 'interactions', label: 'ВЗАИМОДЕЙСТВИЯ' },
  { key: 'contra', label: 'ПРОТИВОПОКАЗАНИЯ' },
  { key: 'practical', label: 'ПРАКТИКА' },
] as const

type TabKey = typeof TABS[number]['key']

function severityLabel(s: string): string {
  switch (s) {
    case 'danger': return 'ОПАСНО'
    case 'warning': return 'ВНИМАНИЕ'
    default: return 'ИНФО'
  }
}

function MechanismTab({ research }: { research: ResearchData }) {
  if (!research.mechanism) return <div className="research-no-data">Механизм действия не задокументирован</div>
  return <div className="research-mechanism">{research.mechanism}</div>
}

function StudiesTab({ research }: { research: ResearchData }) {
  if (!research.studies?.length) return <div className="research-no-data">Исследования не добавлены</div>
  return (
    <>
      {research.studies.map((s: StudyReference, i: number) => (
        <div key={i} className="research-study">
          <div className="research-study-citation">
            {s.citation}
            {s.pmid && (
              <>
                {' '}
                <a href={`https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/`} target="_blank" rel="noopener noreferrer">
                  PMID: {s.pmid}
                </a>
              </>
            )}
          </div>
          {s.design && <div className="research-study-design">{s.design}</div>}
          <div className="research-study-finding">{s.finding}</div>
        </div>
      ))}
    </>
  )
}

function BloodworkTab({ research }: { research: ResearchData }) {
  if (!research.bloodwork?.length) return <div className="research-no-data">Маркеры крови не добавлены</div>
  return (
    <>
      {research.bloodwork.map((m: BloodworkMarker, i: number) => (
        <div key={i} className="research-marker">
          <span className="research-marker-name">{m.name}</span>
          <span className="research-marker-freq">{m.frequency || '\u2014'}</span>
          <span className="research-marker-why">{m.why || ''}</span>
        </div>
      ))}
    </>
  )
}

function InteractionsTab({ research }: { research: ResearchData }) {
  if (!research.interactions?.length) return <div className="research-no-data">Взаимодействия не задокументированы</div>
  return (
    <>
      {research.interactions.map((interaction: DrugInteraction, i: number) => (
        <div key={i} className="research-interaction">
          <span className={`research-interaction-severity ${interaction.severity || 'info'}`}>
            {severityLabel(interaction.severity)}
          </span>
          <span className="research-interaction-drug">{interaction.drug}</span>
          <span className="research-interaction-effect">{interaction.effect}</span>
        </div>
      ))}
    </>
  )
}

function ContraindicationsTab({ research }: { research: ResearchData }) {
  const c = research.contraindications
  if (!c) return <div className="research-no-data">Противопоказания не задокументированы</div>
  const hasAbsolute = c.absolute?.length > 0
  const hasRelative = c.relative?.length > 0
  if (!hasAbsolute && !hasRelative) return <div className="research-no-data">Противопоказания не задокументированы</div>
  return (
    <>
      {hasAbsolute && (
        <div className="research-contra-section">
          <div className="research-contra-label">АБСОЛЮТНЫЕ ПРОТИВОПОКАЗАНИЯ</div>
          <ul className="research-contra-list">
            {c.absolute.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}
      {hasRelative && (
        <div className="research-contra-section">
          <div className="research-contra-label relative">ОТНОСИТЕЛЬНЫЕ (С ОСТОРОЖНОСТЬЮ)</div>
          <ul className="research-contra-list relative">
            {c.relative.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}
    </>
  )
}

function PracticalTab({ research }: { research: ResearchData }) {
  if (!research.practicalNotes) return <div className="research-no-data">Практические заметки не добавлены</div>
  return <div className="research-practical">{research.practicalNotes}</div>
}

export default function ResearchModal({ substance, closeModal }: ResearchModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('mechanism')
  const research = substance.research || null

  function renderTabContent() {
    if (!research) {
      return (
        <div className="research-no-data">
          Научные данные для этого вещества ещё не добавлены.
          <br />
          Используйте PubMed ссылки в карточке для самостоятельного изучения.
        </div>
      )
    }
    switch (activeTab) {
      case 'mechanism': return <MechanismTab research={research} />
      case 'studies': return <StudiesTab research={research} />
      case 'bloodwork': return <BloodworkTab research={research} />
      case 'interactions': return <InteractionsTab research={research} />
      case 'contra': return <ContraindicationsTab research={research} />
      case 'practical': return <PracticalTab research={research} />
    }
  }

  return (
    <div className="research-modal">
      <div className="research-modal-header">
        <span className="research-modal-title">{substance.name}</span>
        <button className="research-modal-close" onClick={closeModal}>[ X ]</button>
      </div>
      <div className="research-modal-body">
        <div className="research-tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`research-tab${activeTab === tab.key ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div id="research-content">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}
