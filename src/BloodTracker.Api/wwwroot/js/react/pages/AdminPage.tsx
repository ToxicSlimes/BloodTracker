import React, { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../../api.js'
import { ENDPOINTS } from '../../endpoints.js'
import { auth } from '../../auth.js'
import { formatDate, formatDateTime } from '../../utils.js'
import { DungeonTabs } from '../components/DungeonTabs.js'
import { EmptyState } from '../components/EmptyState.js'
import type { AdminUserDto, AdminStatsDto } from '../../types/index.js'

declare const ApexCharts: any

const TABS = [
  { id: 'users', label: '[ ПОЛЬЗОВАТЕЛИ ]' },
  { id: 'stats', label: '[ СТАТИСТИКА ]' },
]

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i]
}

// ─── Users Tab ─────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<AdminUserDto[]>([])
  const [filter, setFilter] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api<AdminUserDto[]>(ENDPOINTS.admin.users.list)
      setUsers(data)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  const viewUser = async (userId: string) => {
    try {
      const resp = await api<{ token: string; email: string; displayName: string }>(
        ENDPOINTS.admin.impersonate(userId),
      )
      auth.startImpersonation(resp.token, resp.email, resp.displayName)
    } catch (e: any) {
      ;(window as any).toast?.error('Ошибка: ' + e.message)
    }
  }

  const toggleAdmin = async (userId: string, makeAdmin: boolean) => {
    try {
      await api(ENDPOINTS.admin.users.updateRole(userId), {
        method: 'PUT',
        body: JSON.stringify({ isAdmin: makeAdmin }),
      })
      ;(window as any).toast?.success(
        makeAdmin ? 'Права администратора выданы' : 'Права администратора сняты',
      )
      await loadUsers()
    } catch (e: any) {
      ;(window as any).toast?.error('Ошибка: ' + e.message)
    }
  }

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(`Удалить пользователя ${email}?\n\nЭто удалит все данные пользователя безвозвратно!`))
      return

    try {
      await api(ENDPOINTS.admin.users.delete(userId), { method: 'DELETE' })
      ;(window as any).toast?.success(`Пользователь ${email} удалён`)
      await loadUsers()
    } catch (e: any) {
      ;(window as any).toast?.error('Ошибка: ' + e.message)
    }
  }

  if (error) return <EmptyState message={`Ошибка загрузки: ${error}`} />
  if (loading) return <div className="loading">Загрузка...</div>

  const filtered = filter
    ? users.filter(
        (u) =>
          u.email.toLowerCase().includes(filter) ||
          (u.displayName || '').toLowerCase().includes(filter),
      )
    : users

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title" data-asciify="md">
          [ ПОЛЬЗОВАТЕЛИ ]
        </div>
        <div className="admin-search-wrap">
          <input
            type="text"
            placeholder="Поиск по email..."
            className="admin-search-input"
            value={filter}
            onChange={(e) => setFilter(e.target.value.trim().toLowerCase())}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="Нет пользователей" />
      ) : (
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Имя</th>
                <th>Роль</th>
                <th>Регистрация</th>
                <th>Последний вход</th>
                <th>Анализы</th>
                <th>Курсы</th>
                <th>Тренировки</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td className="admin-email-cell">{u.email}</td>
                  <td>{u.displayName || '—'}</td>
                  <td>
                    {u.isAdmin ? <span className="admin-badge">ADMIN</span> : 'user'}
                  </td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td>{formatDateTime(u.lastLoginAt)}</td>
                  <td>{u.analysesCount}</td>
                  <td>{u.coursesCount}</td>
                  <td>{u.workoutsCount}</td>
                  <td className="admin-actions-cell">
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => viewUser(u.id)}
                    >
                      Просмотр
                    </button>
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => toggleAdmin(u.id, !u.isAdmin)}
                    >
                      {u.isAdmin ? 'Снять админа' : 'Сделать админом'}
                    </button>
                    <button
                      className="btn btn-secondary btn-small admin-delete-btn"
                      onClick={() => deleteUser(u.id, u.email)}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Stats Tab ─────────────────────────────────────────────────

function StatsTab() {
  const [stats, setStats] = useState<AdminStatsDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<any>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await api<AdminStatsDto>(ENDPOINTS.admin.stats)
        if (!cancelled) {
          setStats(data)
          setError(null)
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Render ApexCharts after stats load
  useEffect(() => {
    if (!stats || !chartRef.current || !(window as any).ApexCharts) return
    if (stats.recentRegistrations.length === 0) return

    const primaryColor =
      getComputedStyle(document.documentElement)
        .getPropertyValue('--primary-color')
        .trim() || '#00ff00'

    const chart = new ApexCharts(chartRef.current, {
      chart: {
        type: 'bar',
        height: 250,
        background: 'transparent',
        toolbar: { show: false },
        foreColor: '#888',
      },
      series: [
        { name: 'Регистрации', data: stats.recentRegistrations.map((r) => r.count) },
      ],
      xaxis: {
        categories: stats.recentRegistrations.map((r) => r.date.slice(5)),
        labels: { style: { fontSize: '10px' } },
      },
      yaxis: { labels: { formatter: (v: number) => String(Math.round(v)) } },
      colors: [primaryColor],
      plotOptions: { bar: { borderRadius: 2 } },
      grid: { borderColor: '#222' },
      theme: { mode: 'dark' },
    })

    chart.render()
    chartInstanceRef.current = chart

    return () => {
      chart.destroy()
      chartInstanceRef.current = null
    }
  }, [stats])

  // Refresh ASCIIfy after render
  useEffect(() => {
    if (stats && (window as any).asciify?.refresh) {
      setTimeout(() => (window as any).asciify.refresh(), 50)
    }
  }, [stats])

  if (error) return <EmptyState message={`Ошибка загрузки: ${error}`} />
  if (loading || !stats) return <div className="loading">Загрузка...</div>

  return (
    <>
      <div className="admin-stats-grid">
        <div className="stat-card">
          <h3>Пользователей</h3>
          <div className="stat-value" data-asciify="lg">{stats.totalUsers}</div>
          <div className="stat-sub">всего</div>
        </div>
        <div className="stat-card">
          <h3>Активных (7 дн.)</h3>
          <div className="stat-value" data-asciify="lg">{stats.activeUsersLast7Days}</div>
          <div className="stat-sub">пользователей</div>
        </div>
        <div className="stat-card">
          <h3>Размер БД</h3>
          <div className="stat-value" data-asciify="lg">{formatBytes(stats.totalDbSizeBytes)}</div>
          <div className="stat-sub">всего</div>
        </div>
        <div className="stat-card">
          <h3>Анализов</h3>
          <div className="stat-value" data-asciify="lg">{stats.totalAnalyses}</div>
          <div className="stat-sub">всего</div>
        </div>
        <div className="stat-card">
          <h3>Курсов</h3>
          <div className="stat-value" data-asciify="lg">{stats.totalCourses}</div>
          <div className="stat-sub">всего</div>
        </div>
        <div className="stat-card">
          <h3>Тренировок</h3>
          <div className="stat-value" data-asciify="lg">{stats.totalWorkouts}</div>
          <div className="stat-sub">всего</div>
        </div>
      </div>

      {stats.recentRegistrations.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <div className="card-title" data-asciify="md">
              [ РЕГИСТРАЦИИ (30 ДНЕЙ) ]
            </div>
          </div>
          <div ref={chartRef} />
        </div>
      )}
    </>
  )
}

// ─── Admin Page (default export for lazy loading) ──────────────

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('users')

  return (
    <>
      <DungeonTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      <div
        className="admin-tab-content"
        style={{ display: activeTab === 'users' ? 'block' : 'none' }}
      >
        {activeTab === 'users' && <UsersTab />}
      </div>

      <div
        className="admin-tab-content"
        style={{ display: activeTab === 'stats' ? 'block' : 'none' }}
      >
        {activeTab === 'stats' && <StatsTab />}
      </div>
    </>
  )
}
