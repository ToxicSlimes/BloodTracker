import React from 'react'

interface EmptyStateProps {
  message: string
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <h3>{message}</h3>
    </div>
  )
}
