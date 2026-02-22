import { useState, useEffect } from 'react'
import { auth } from '../../auth.js'

export function useAuth(): boolean {
  const [isAuthenticated, setIsAuthenticated] = useState(auth.isLoggedIn())

  useEffect(() => {
    const handler = () => setIsAuthenticated(false)
    window.addEventListener('bt:unauthorized', handler)
    return () => window.removeEventListener('bt:unauthorized', handler)
  }, [])

  return isAuthenticated
}
