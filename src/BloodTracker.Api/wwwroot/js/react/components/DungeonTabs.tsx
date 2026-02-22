import React from 'react'

interface Tab {
  id: string
  label: string
}

interface DungeonTabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}

export function DungeonTabs({ tabs, activeTab, onTabChange, className }: DungeonTabsProps) {
  return (
    <div className={className || 'admin-tabs'}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`admin-tab${activeTab === tab.id ? ' active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
