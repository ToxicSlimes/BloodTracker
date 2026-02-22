import { describe, it, expect } from 'vitest'

describe('Vitest smoke test', () => {
  it('works', () => {
    expect(1 + 1).toBe(2)
  })

  it('has DOM environment', () => {
    const div = document.createElement('div')
    div.textContent = 'hello'
    document.body.appendChild(div)
    expect(document.body.textContent).toBe('hello')
  })
})
