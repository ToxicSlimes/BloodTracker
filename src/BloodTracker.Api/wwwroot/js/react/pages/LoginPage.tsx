import React, { useState, useEffect, useRef, useCallback } from 'react'
import { API_URL } from '../../config.js'
import { ENDPOINTS } from '../../endpoints.js'
import { auth } from '../../auth.js'

// ─── Constants ──────────────────────────────────────────────────────────────────

const LOGIN_ASCII = `\
╔════════════════════════════════════════════════╗
║                                                ║
║   ███████╗███╗   ██╗████████╗███████╗██████╗   ║
║   ██╔════╝████╗  ██║╚══██╔══╝██╔════╝██╔══██╗   ║
║   █████╗  ██╔██╗ ██║   ██║   █████╗  ██████╔╝   ║
║   ██╔══╝  ██║╚██╗██║   ██║   ██╔══╝  ██╔══██╗   ║
║   ███████╗██║ ╚████║   ██║   ███████╗██║  ██║  ║
║   ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝   ║
║                                                ║
║             T H E   D U N G E O N              ║
║                                                ║
╚════════════════════════════════════════════════╝`

const CODE_EXPIRY_SECONDS = 600 // 10 minutes

type Step = 'email' | 'code'

interface AuthConfig {
  googleClientId?: string
}

interface AuthResponse {
  token: string
  user: { email: string; displayName?: string }
  devCode?: string
}

// ─── Google SVG Icon ────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

// ─── Timer Hook ─────────────────────────────────────────────────────────────────

function useCountdown(startSeconds: number, active: boolean) {
  const [seconds, setSeconds] = useState(startSeconds)

  useEffect(() => {
    if (!active) return undefined
    setSeconds(startSeconds)

    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [active, startSeconds])

  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60

  if (seconds <= 0) return 'Код истёк. Запросите новый.'
  return `Код действителен: ${minutes}:${secs.toString().padStart(2, '0')}`
}

// ─── Auth helpers ───────────────────────────────────────────────────────────────

function handleAuthResponse(data: AuthResponse): void {
  if (!data.token || !data.user) return
  auth.setSession(data.token, data.user)
  sessionStorage.removeItem('_bt_rl')
  window.location.reload()
}

async function postJson<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Ошибка сервера')
  }

  return res.json()
}

// ─── Email Step ─────────────────────────────────────────────────────────────────

interface EmailStepProps {
  email: string
  onEmailChange: (email: string) => void
  onCodeSent: (devCode?: string) => void
  googleAvailable: boolean
  emailError: string | null
  setEmailError: (error: string | null) => void
}

function EmailStep({
  email,
  onEmailChange,
  onCodeSent,
  googleAvailable,
  emailError,
  setEmailError,
}: EmailStepProps) {
  const [sending, setSending] = useState(false)
  const googleBtnRef = useRef<HTMLDivElement>(null)

  // Render Google GSI button into the overlay div
  useEffect(() => {
    if (!googleAvailable || !googleBtnRef.current) return
    const gsi = (window as any).google?.accounts?.id
    if (!gsi) return

    gsi.renderButton(googleBtnRef.current, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      text: 'signin_with',
      width: 400,
    })
  }, [googleAvailable])

  const handleSendCode = useCallback(async () => {
    const trimmed = email.trim()
    if (!trimmed) {
      setEmailError('Введите email')
      return
    }

    setSending(true)
    setEmailError(null)

    try {
      const data = await postJson<{ devCode?: string }>(ENDPOINTS.auth.sendCode, { email: trimmed })
      onCodeSent(data.devCode)
    } catch (e: any) {
      setEmailError(e.message || 'Ошибка отправки кода')
      setSending(false)
    }
  }, [email, onCodeSent, setEmailError])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSendCode()
    },
    [handleSendCode],
  )

  return (
    <div className="login-form">
      {googleAvailable && (
        <>
          <div className="google-btn-wrapper">
            <button className="login-btn login-btn-google" type="button">
              <GoogleIcon />
              [ ВОЙТИ ЧЕРЕЗ GOOGLE ]
            </button>
            <div ref={googleBtnRef} className="google-btn-overlay" />
          </div>
          <div className="login-divider">
            <span>или</span>
          </div>
        </>
      )}

      <div className="login-field">
        <label>Email</label>
        <input
          type="email"
          placeholder="your@email.com"
          autoComplete="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      <button
        className="login-btn login-btn-primary"
        disabled={sending}
        onClick={handleSendCode}
      >
        {sending ? '[ ОТПРАВКА... ]' : '[ ОТПРАВИТЬ КОД ]'}
      </button>

      {emailError && <div className="login-error">{emailError}</div>}
    </div>
  )
}

// ─── Code Step ──────────────────────────────────────────────────────────────────

interface CodeStepProps {
  email: string
  initialCode: string
  devCodeWarning: boolean
  onBack: () => void
}

function CodeStep({ email, initialCode, devCodeWarning, onBack }: CodeStepProps) {
  const [code, setCode] = useState(initialCode)
  const [verifying, setVerifying] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(
    devCodeWarning ? '\u26A0 SMTP недоступен — код подставлен автоматически' : null,
  )
  const codeInputRef = useRef<HTMLInputElement>(null)
  const timerText = useCountdown(CODE_EXPIRY_SECONDS, true)

  // Auto-focus code input (unless devCode pre-filled)
  useEffect(() => {
    if (!initialCode && codeInputRef.current) {
      codeInputRef.current.focus()
    }
  }, [initialCode])

  const handleVerify = useCallback(async () => {
    const trimmed = code.trim()
    if (!trimmed || trimmed.length !== 6) {
      setCodeError('Введите 6-значный код')
      return
    }

    setVerifying(true)
    setCodeError(null)

    try {
      const data = await postJson<AuthResponse>(ENDPOINTS.auth.verifyCode, {
        email: email.trim(),
        code: trimmed,
      })
      handleAuthResponse(data)
    } catch (e: any) {
      setCodeError(e.message || 'Неверный или просроченный код')
      setVerifying(false)
    }
  }, [code, email])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleVerify()
    },
    [handleVerify],
  )

  return (
    <div className="login-form">
      <p className="login-hint">
        Код отправлен на <strong>{email}</strong>
      </p>

      <div className="login-field">
        <label>Код подтверждения</label>
        <input
          ref={codeInputRef}
          type="text"
          placeholder="000000"
          maxLength={6}
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="[0-9]*"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      <button
        className="login-btn login-btn-primary"
        disabled={verifying}
        onClick={handleVerify}
      >
        {verifying ? '[ ПРОВЕРКА... ]' : '[ ПОДТВЕРДИТЬ ]'}
      </button>

      <button className="login-btn login-btn-secondary" onClick={onBack}>
        [ НАЗАД ]
      </button>

      <div className="login-timer">{timerText}</div>

      {codeError && <div className="login-error">{codeError}</div>}
    </div>
  )
}

// ─── Login Page (default export) ────────────────────────────────────────────────

export default function LoginPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [devCode, setDevCode] = useState('')
  const [devCodeWarning, setDevCodeWarning] = useState(false)
  const [googleAvailable, setGoogleAvailable] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  // Initialize Google OAuth on mount
  useEffect(() => {
    let cancelled = false

    async function initGoogle() {
      try {
        const res = await fetch(`${API_URL}/api/v1${ENDPOINTS.auth.config}`)
        if (!res.ok) return

        const config: AuthConfig = await res.json()
        const gsi = (window as any).google?.accounts?.id
        if (cancelled || !config.googleClientId || !gsi) return

        gsi.initialize({
          client_id: config.googleClientId,
          callback: async (response: { credential: string }) => {
            try {
              const data = await postJson<AuthResponse>(ENDPOINTS.auth.google, {
                idToken: response.credential,
              })
              handleAuthResponse(data)
            } catch (e: any) {
              setEmailError(e.message || 'Ошибка авторизации Google')
            }
          },
        })

        if (!cancelled) setGoogleAvailable(true)
      } catch {
        // Google auth unavailable — email-only mode
      }
    }

    initGoogle()
    return () => { cancelled = true }
  }, [])

  const handleCodeSent = useCallback((serverDevCode?: string) => {
    if (serverDevCode) {
      setDevCode(serverDevCode)
      setDevCodeWarning(true)
    } else {
      setDevCode('')
      setDevCodeWarning(false)
    }
    setStep('code')
  }, [])

  const handleBack = useCallback(() => {
    setStep('email')
    setDevCode('')
    setDevCodeWarning(false)
  }, [])

  return (
    <div className="login-overlay">
      <div className="login-container">
        <pre className="login-ascii">{LOGIN_ASCII}</pre>

        {step === 'email' && (
          <EmailStep
            email={email}
            onEmailChange={setEmail}
            onCodeSent={handleCodeSent}
            googleAvailable={googleAvailable}
            emailError={emailError}
            setEmailError={setEmailError}
          />
        )}

        {step === 'code' && (
          <CodeStep
            email={email.trim()}
            initialCode={devCode}
            devCodeWarning={devCodeWarning}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  )
}
