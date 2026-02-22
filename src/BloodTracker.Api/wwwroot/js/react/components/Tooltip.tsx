import React from 'react'

/** Known abbreviation/term tooltips */
const GLOSSARY: Record<string, string> = {
  'RPE': 'Rate of Perceived Exertion — шкала усталости 1-10. RPE 7 = ещё 3 повтора в запасе. RPE 10 = на пределе.',
  'Тоннаж': 'Общий вес за тренировку = сумма (вес × повторения) по всем подходам. Показывает нагрузку в кг.',
  'Объём': 'Общее количество повторений за тренировку (все подходы всех упражнений).',
  '1RM': 'One Rep Max — максимальный вес, который можно поднять на 1 повторение.',
  'Расч. 1RM': 'Расчётный 1RM — оценка максимума по формуле Epley: вес × (1 + повт/30). Не нужно реально жать на максимум.',
  'PR': 'Personal Record — твой личный рекорд в упражнении (максимальный вес, объём или расч. 1RM).',
  'Рекорды': 'Personal Records — личные рекорды по каждому упражнению.',
  'Макс. тоннаж': 'Максимальный тоннаж за одну тренировку (вес × повторения по всем подходам).',
  'Макс. объём': 'Максимальное количество повторений за одну тренировку.',
}

interface TooltipProps {
  /** Label text (also used as glossary key if no `term` given) */
  label: string
  /** Override glossary key */
  term?: string
  /** Custom tooltip text (overrides glossary) */
  text?: string
  /** Additional CSS class */
  className?: string
}

/**
 * Inline label with a (?) tooltip on hover/tap.
 * Falls back to plain text if no tooltip is found.
 */
export function Tooltip({ label, term, text, className }: TooltipProps) {
  const tip = text || GLOSSARY[term || label]
  if (!tip) return <span className={className}>{label}</span>

  return (
    <span className={`info-tooltip ${className || ''}`}>
      {label} <span className="info-tooltip-icon">?</span>
      <span className="info-tooltip-text">{tip}</span>
    </span>
  )
}

export default Tooltip
