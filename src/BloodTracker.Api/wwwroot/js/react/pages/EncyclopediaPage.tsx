import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { catalogApi } from '../../api.js'
import { toast } from '../components/Toast.js'
import { useModal } from '../contexts/ModalContext.js'
import ResearchModal from '../components/modals/ResearchModal.js'
import { useAppState } from '../hooks/useAppState.js'
import { state } from '../../state.js'
import type { DrugCatalogItem, Manufacturer } from '../../types/index.js'

// ═══════════════════════════════════════════════════════════════════════════════
// ENCYCLOPEDIA PAGE — React port of pages/encyclopedia.ts
// ═══════════════════════════════════════════════════════════════════════════════

const CATEGORY_NAMES: Record<number, string> = {
  0: 'ААС', 1: 'Пептиды', 2: 'SARMs', 3: 'ПКТ', 4: 'Жиросжигатели',
  5: 'Гормон роста', 6: 'Антиэстрогены', 7: 'Инсулин', 8: 'Прогормоны',
  9: 'Агонисты дофамина', 10: 'Другое',
}

const CATEGORY_BADGE_CLASS: Record<number, string> = {
  0: 'cat-badge-aas', 1: 'cat-badge-peptide', 2: 'cat-badge-sarm', 3: 'cat-badge-pct',
  4: 'cat-badge-fatburner', 5: 'cat-badge-growthhormone', 6: 'cat-badge-antiestrogen',
  7: 'cat-badge-insulin', 8: 'cat-badge-prohormone', 9: 'cat-badge-dopamineagonist', 10: 'cat-badge-other',
}

const TYPE_NAMES: Record<number, string> = { 0: 'Oral', 1: 'Injectable', 2: 'Subcutaneous', 3: 'Transdermal', 4: 'Nasal' }
const TYPE_BADGE_CLASS: Record<number, string> = { 0: 'type-badge-oral', 1: 'type-badge-injectable', 2: 'type-badge-subcutaneous', 3: 'type-badge-transdermal', 4: 'type-badge-nasal' }

// ─── Rating Bar ──────────────────────────────────────────────

function RatingBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="rating-bar">
      <div className="rating-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function RatingsBlock({ s }: { s: DrugCatalogItem }) {
  const anabolic = s.pharmacology?.anabolicRating || 0
  const androgenic = s.pharmacology?.androgenicRating || 0
  if (!anabolic && !androgenic) return null
  const scaleMax = Math.max(anabolic, androgenic, 500)

  return (
    <div className="encyclopedia-ratings">
      <div className="encyclopedia-detail-label">АНАБОЛИЧЕСКИЙ / АНДРОГЕННЫЙ РЕЙТИНГ</div>
      <div className="rating-row">
        <span className="rating-label">АНАБОЛИЧЕСКИЙ</span>
        <RatingBar value={anabolic} max={scaleMax} color="#4caf50" />
        <span className="rating-value rating-value-anabolic">{anabolic}%</span>
      </div>
      <div className="rating-row">
        <span className="rating-label">АНДРОГЕННЫЙ</span>
        <RatingBar value={androgenic} max={scaleMax} color="#f44336" />
        <span className="rating-value rating-value-androgenic">{androgenic}%</span>
      </div>
      <div className="rating-reference">Тестостерон = 100/100 (Hershberger assay, Vida 1969)</div>
    </div>
  )
}

// ─── PubMed Links ────────────────────────────────────────────

function PubMedLinks({ s }: { s: DrugCatalogItem }) {
  const term = s.meta?.pubMedSearchTerm
  if (!term) return null
  const base = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(term)}`
  const safetyUrl = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(term + '+AND+(adverse+effects[MeSH]+OR+toxicity[MeSH])')}`
  const pharmacologyUrl = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(term + '+AND+(pharmacology[MeSH]+OR+pharmacokinetics[MeSH])')}`

  return (
    <div className="encyclopedia-pubmed">
      <div className="encyclopedia-detail-label">ИССЛЕДОВАНИЯ (PUBMED)</div>
      <div className="pubmed-links">
        <a href={base} target="_blank" rel="noopener" className="pubmed-link" onClick={e => e.stopPropagation()}>[ ВСЕ ИССЛЕДОВАНИЯ ]</a>
        <a href={pharmacologyUrl} target="_blank" rel="noopener" className="pubmed-link" onClick={e => e.stopPropagation()}>[ ФАРМАКОЛОГИЯ ]</a>
        <a href={safetyUrl} target="_blank" rel="noopener" className="pubmed-link pubmed-link-safety" onClick={e => e.stopPropagation()}>[ ПОБОЧНЫЕ ЭФФЕКТЫ ]</a>
      </div>
    </div>
  )
}

// ─── Similar Substances ──────────────────────────────────────

function SimilarSubstances({ s, allItems, onNavigate }: {
  s: DrugCatalogItem
  allItems: DrugCatalogItem[]
  onNavigate: (id: string) => void
}) {
  const similar = allItems
    .filter(other => other.id !== s.id && (other as any).subcategory === (s as any).subcategory && other.category === s.category)
    .slice(0, 4)

  if (similar.length === 0) return null

  return (
    <div className="encyclopedia-similar">
      <div className="encyclopedia-detail-label">ПОХОЖИЕ ПРЕПАРАТЫ</div>
      <div className="similar-list">
        {similar.map(sim => (
          <span
            key={sim.id}
            className="similar-item"
            onClick={e => { e.stopPropagation(); onNavigate(sim.id) }}
          >
            {sim.name}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Detail Row ──────────────────────────────────────────────

function DetailRow({ label, value, style }: { label: string; value?: string; style?: React.CSSProperties }) {
  if (!value) return null
  return (
    <div className="encyclopedia-detail-row">
      <div className="encyclopedia-detail-label">{label}</div>
      <div className="encyclopedia-detail-value" style={style}>{value}</div>
    </div>
  )
}

// ─── Substance Card ──────────────────────────────────────────

function SubstanceCard({ s, expanded, onToggle, allItems, onNavigate }: {
  s: DrugCatalogItem
  expanded: boolean
  onToggle: () => void
  allItems: DrugCatalogItem[]
  onNavigate: (id: string) => void
}) {
  const catBadgeClass = CATEGORY_BADGE_CLASS[s.category] || ''
  const catName = CATEGORY_NAMES[s.category] || 'Другое'
  const typeName = TYPE_NAMES[s.drugType] || ''
  const typeBadgeClass = TYPE_BADGE_CLASS[s.drugType] || ''

  const ratingBadge = (s.pharmacology?.anabolicRating && s.pharmacology?.androgenicRating)
    ? `${s.pharmacology.anabolicRating}/${s.pharmacology.androgenicRating}`
    : null

  const { openModal, closeModal } = useModal()
  const handleResearch = (e: React.MouseEvent) => {
    e.stopPropagation()
    openModal(<ResearchModal substance={s} closeModal={closeModal} />)
  }

  return (
    <div className={`encyclopedia-card${expanded ? ' expanded' : ''}`} data-id={s.id} onClick={onToggle}>
      <div className="encyclopedia-card-header">
        <div>
          <div className="encyclopedia-card-name">{s.name}</div>
          {s.nameEn && <div className="encyclopedia-card-name-en">{s.nameEn}</div>}
        </div>
        <div className="encyclopedia-card-badges">
          {s.meta?.isPopular && <span className="encyclopedia-badge encyclopedia-badge-popular">★</span>}
          {ratingBadge && <span className="encyclopedia-badge rating-badge">{ratingBadge}</span>}
          <span className={`encyclopedia-badge ${catBadgeClass}`}>{catName}</span>
          <span className={`encyclopedia-badge ${typeBadgeClass}`}>{typeName}</span>
        </div>
      </div>
      {s.description?.text && <div className="encyclopedia-card-desc">{s.description.text}</div>}
      <div className="encyclopedia-card-detail">
        <RatingsBlock s={s} />
        <DetailRow label="ЭФФЕКТЫ" value={s.description?.effects} />
        <DetailRow label="ПОБОЧНЫЕ ЭФФЕКТЫ" value={s.description?.sideEffects} />
        <DetailRow label="ПЕРИОД ПОЛУРАСПАДА" value={s.pharmacology?.halfLife} />
        <DetailRow label="ВРЕМЯ ОБНАРУЖЕНИЯ" value={s.pharmacology?.detectionTime} />
        <DetailRow label="ТИПИЧНЫЕ ДОЗИРОВКИ" value={s.pharmacology?.commonDosages} />
        <DetailRow label="ДЕЙСТВУЮЩЕЕ ВЕЩЕСТВО" value={s.activeSubstance} />
        <DetailRow label="ПРИМЕЧАНИЯ" value={(s as any).notes} style={{ color: '#ffb74d' }} />
        <PubMedLinks s={s} />
        <SimilarSubstances s={s} allItems={allItems} onNavigate={onNavigate} />
        {s.research && (
          <button className="encyclopedia-research-btn" onClick={handleResearch}>
            ИССЛЕДОВАНИЯ
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Manufacturer Card ───────────────────────────────────────

function ManufacturerCard({ m }: { m: Manufacturer }) {
  const typeClass = m.type === 0 ? 'mfr-type-pharma' : 'mfr-type-ugl'
  const typeLabel = m.type === 0 ? 'PHARMA' : 'UGL'

  return (
    <div className="mfr-card">
      <div className="mfr-card-header">
        <span className="mfr-card-name">{m.name}</span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span className="mfr-card-country">{m.country}</span>
          <span className={`encyclopedia-badge ${typeClass}`}>{typeLabel}</span>
        </div>
      </div>
      {m.description && <div className="mfr-card-desc">{m.description}</div>}
    </div>
  )
}

// ─── Main Encyclopedia Page ──────────────────────────────────

export default function EncyclopediaPage() {
  const drugCatalog = useAppState('drugCatalog') as DrugCatalogItem[]
  const manufacturers = useAppState('manufacturers') as Manufacturer[]
  const catalogLoaded = useAppState('catalogLoaded')

  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeMfrType, setActiveMfrType] = useState('all')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(!catalogLoaded)

  // Load data on mount
  useEffect(() => {
    if (state.catalogLoaded) return
    let cancelled = false
    ;(async () => {
      try {
        const [substances, mfrs] = await Promise.all([
          catalogApi.substances(),
          catalogApi.manufacturers(),
        ]) as [DrugCatalogItem[], Manufacturer[]]
        if (cancelled) return
        state.drugCatalog = substances
        state.manufacturers = mfrs
        state.catalogLoaded = true
      } catch (e: any) {
        console.error('Failed to load catalog:', e)
        toast.error('Ошибка загрузки каталога')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Filtered + sorted substances
  const filteredItems = useMemo(() => {
    let items = drugCatalog as any[]
    if (activeCategory !== 'all') {
      items = items.filter(s => s.category === parseInt(activeCategory))
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      items = items.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.nameEn && s.nameEn.toLowerCase().includes(q)) ||
        (s.activeSubstance && s.activeSubstance.toLowerCase().includes(q)) ||
        (s.description?.text && s.description.text.toLowerCase().includes(q)) ||
        (s.description?.effects && s.description.effects.toLowerCase().includes(q)),
      )
    }
    items.sort((a: any, b: any) => {
      if (a.meta?.isPopular && !b.meta?.isPopular) return -1
      if (!a.meta?.isPopular && b.meta?.isPopular) return 1
      return (a.meta?.sortOrder || 0) - (b.meta?.sortOrder || 0)
    })
    return items as DrugCatalogItem[]
  }, [drugCatalog, activeCategory, searchQuery])

  // Category tabs with counts
  const categoryTabs = useMemo(() => {
    const tabs: { value: string; label: string }[] = [{ value: 'all', label: 'ВСЕ' }]
    for (const [val, name] of Object.entries(CATEGORY_NAMES)) {
      const count = (drugCatalog as any[]).filter(s => s.category === parseInt(val)).length
      if (count > 0) {
        tabs.push({ value: val, label: `${name} (${count})` })
      }
    }
    return tabs
  }, [drugCatalog])

  // Filtered manufacturers
  const filteredMfrs = useMemo(() => {
    if (activeMfrType === 'all') return manufacturers
    return (manufacturers as any[]).filter(m => m.type === parseInt(activeMfrType)) as Manufacturer[]
  }, [manufacturers, activeMfrType])

  const toggleCard = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const navigateToCard = useCallback((id: string) => {
    setExpandedIds(prev => new Set(prev).add(id))
    setTimeout(() => {
      document.querySelector(`.encyclopedia-card[data-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  }, [])

  // Debounced search
  const [searchInput, setSearchInput] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 200)
    return () => clearTimeout(timer)
  }, [searchInput])

  if (loading) return <div className="loading">Загрузка каталога...</div>

  return (
    <>
      {/* Substances Section */}
      <div className="card">
        <div className="card-header">
          <div className="card-title" data-asciify="md">[ ЭНЦИКЛОПЕДИЯ ПРЕПАРАТОВ ]</div>
        </div>
        <div className="encyclopedia-search">
          <input
            type="text"
            id="encyclopedia-search"
            placeholder="Поиск по названию, веществу, действию..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
        <div className="encyclopedia-tabs" id="encyclopedia-tabs">
          {categoryTabs.map(tab => (
            <button
              key={tab.value}
              className={`encyclopedia-tab${activeCategory === tab.value ? ' active' : ''}`}
              data-cat={tab.value}
              onClick={() => setActiveCategory(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="encyclopedia-grid" id="encyclopedia-grid">
          {filteredItems.length === 0 ? (
            <div className="empty-state"><p>Ничего не найдено</p></div>
          ) : (
            filteredItems.map(s => (
              <SubstanceCard
                key={s.id}
                s={s}
                expanded={expandedIds.has(s.id)}
                onToggle={() => toggleCard(s.id)}
                allItems={drugCatalog}
                onNavigate={navigateToCard}
              />
            ))
          )}
        </div>
      </div>

      {/* Manufacturers Section */}
      <div className="card">
        <div className="card-header">
          <div className="card-title" data-asciify="md">[ ПРОИЗВОДИТЕЛИ ]</div>
        </div>
        <div className="encyclopedia-tabs" id="mfr-tabs">
          <button
            className={`encyclopedia-tab${activeMfrType === 'all' ? ' active' : ''}`}
            onClick={() => setActiveMfrType('all')}
          >
            ВСЕ
          </button>
          <button
            className={`encyclopedia-tab${activeMfrType === '0' ? ' active' : ''}`}
            onClick={() => setActiveMfrType('0')}
          >
            ФАРМА
          </button>
          <button
            className={`encyclopedia-tab${activeMfrType === '1' ? ' active' : ''}`}
            onClick={() => setActiveMfrType('1')}
          >
            UGL
          </button>
        </div>
        <div className="mfr-grid" id="mfr-grid">
          {filteredMfrs.map(m => (
            <ManufacturerCard key={m.id} m={m} />
          ))}
        </div>
      </div>
    </>
  )
}
