import React from 'react'
import { useAuth } from './hooks/useAuth.js'
import LoginPage from './pages/LoginPage.js'
import AppShell from './components/AppShell.js'

export default function App() {
  const isAuthenticated = useAuth()

  if (!isAuthenticated) return <LoginPage />
  return <AppShell />
}
