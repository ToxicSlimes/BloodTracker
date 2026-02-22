import { vi, beforeEach, afterEach } from 'vitest'

Object.defineProperty(navigator, 'vibrate', {
  value: vi.fn(() => true),
  writable: true,
  configurable: true,
})

Object.defineProperty(window, 'AudioContext', {
  value: vi.fn().mockImplementation(() => ({
    state: 'running',
    currentTime: 0,
    destination: {},
    createOscillator: vi.fn(() => ({
      connect: vi.fn(),
      frequency: { value: 0 },
      type: 'sine',
      start: vi.fn(),
      stop: vi.fn(),
    })),
    createGain: vi.fn(() => ({
      connect: vi.fn(),
      gain: {
        value: 0,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
    })),
  })),
  writable: true,
  configurable: true,
})

Object.defineProperty(window, 'Notification', {
  value: Object.assign(vi.fn(), {
    permission: 'default',
    requestPermission: vi.fn().mockResolvedValue('granted'),
  }),
  writable: true,
  configurable: true,
})

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    get length() { return Object.keys(store).length },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
})

const fetchMock = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: vi.fn().mockResolvedValue({}),
})

vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  document.body.innerHTML = ''
  vi.clearAllMocks()
  localStorageMock.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})
