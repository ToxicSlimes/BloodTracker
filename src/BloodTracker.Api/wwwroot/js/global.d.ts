import type { toast } from './react/components/Toast.js'

declare global {
  interface Window {
    toast: typeof toast
    skeleton: {
      card(): string
      drugCards(count: number): string
      alertCards(count: number): string
      donutPlaceholder(): string
    }
    handleGoogleCredential: (response: unknown) => void
  }

  const ApexCharts: any
}

export {}
