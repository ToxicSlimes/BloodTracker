import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ModalProvider, useModal } from '../../react/contexts/ModalContext.js'

function TestConsumer() {
  const { openModal, closeModal } = useModal()
  return (
    <>
      <button onClick={() => openModal(<div data-testid="modal-content">Hello Modal</div>)}>
        Open
      </button>
      <button onClick={closeModal}>Close</button>
    </>
  )
}

describe('ModalContext', () => {
  it('renders modal content when openModal is called', () => {
    render(
      <ModalProvider>
        <TestConsumer />
      </ModalProvider>,
    )

    expect(screen.queryByTestId('modal-content')).toBeNull()

    fireEvent.click(screen.getByText('Open'))

    expect(screen.getByTestId('modal-content')).toBeTruthy()
    expect(screen.getByText('Hello Modal')).toBeTruthy()
  })

  it('removes modal content when closeModal is called', () => {
    render(
      <ModalProvider>
        <TestConsumer />
      </ModalProvider>,
    )

    fireEvent.click(screen.getByText('Open'))
    expect(screen.getByTestId('modal-content')).toBeTruthy()

    fireEvent.click(screen.getByText('Close'))
    expect(screen.queryByTestId('modal-content')).toBeNull()
  })

  it('adds modal-open class to body on open and removes on close', () => {
    render(
      <ModalProvider>
        <TestConsumer />
      </ModalProvider>,
    )

    fireEvent.click(screen.getByText('Open'))
    expect(document.body.classList.contains('modal-open')).toBe(true)

    fireEvent.click(screen.getByText('Close'))
    expect(document.body.classList.contains('modal-open')).toBe(false)
  })

  it('closes modal when clicking the overlay backdrop', () => {
    render(
      <ModalProvider>
        <TestConsumer />
      </ModalProvider>,
    )

    fireEvent.click(screen.getByText('Open'))

    const overlay = document.querySelector('.modal-overlay.active')
    expect(overlay).toBeTruthy()

    fireEvent.click(overlay!)
    expect(screen.queryByTestId('modal-content')).toBeNull()
    expect(document.body.classList.contains('modal-open')).toBe(false)
  })

  it('does not close modal when clicking inside modal content', () => {
    render(
      <ModalProvider>
        <TestConsumer />
      </ModalProvider>,
    )

    fireEvent.click(screen.getByText('Open'))

    fireEvent.click(screen.getByTestId('modal-content'))
    expect(screen.getByTestId('modal-content')).toBeTruthy()
  })

  it('closes modal on Escape key', () => {
    render(
      <ModalProvider>
        <TestConsumer />
      </ModalProvider>,
    )

    fireEvent.click(screen.getByText('Open'))
    expect(screen.getByTestId('modal-content')).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByTestId('modal-content')).toBeNull()
    expect(document.body.classList.contains('modal-open')).toBe(false)
  })

  it('renders overlay with correct classes', () => {
    render(
      <ModalProvider>
        <TestConsumer />
      </ModalProvider>,
    )

    fireEvent.click(screen.getByText('Open'))

    const overlay = document.querySelector('.modal-overlay.active')
    expect(overlay).toBeTruthy()
  })

  it('throws when useModal is used outside ModalProvider', () => {
    function BadConsumer() {
      useModal()
      return null
    }

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<BadConsumer />)).toThrow('useModal must be inside ModalProvider')

    consoleSpy.mockRestore()
  })
})
