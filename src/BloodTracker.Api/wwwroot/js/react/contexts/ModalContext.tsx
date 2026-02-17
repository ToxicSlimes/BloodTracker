import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalContextValue {
  openModal: (content: ReactNode) => void
  closeModal: () => void
}

const ModalContext = createContext<ModalContextValue | null>(null)

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error('useModal must be inside ModalProvider')
  return ctx
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ReactNode | null>(null)

  const openModal = useCallback((content: ReactNode) => {
    setModal(content)
    document.body.classList.add('modal-open')
  }, [])

  const closeModal = useCallback(() => {
    setModal(null)
    document.body.classList.remove('modal-open')
  }, [])

  useEffect(() => {
    if (!modal) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeModal()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [modal, closeModal])

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      {modal && createPortal(
        <div
          className="modal-overlay active"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          {modal}
        </div>,
        document.body,
      )}
    </ModalContext.Provider>
  )
}
