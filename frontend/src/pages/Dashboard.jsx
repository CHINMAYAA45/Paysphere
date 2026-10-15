import { useEffect, useState } from 'react'
import api from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'

const CARDS = {
  ADMIN: ['Manage users', 'Employees', 'Payroll runs', 'Reports'],
  HR: ['Employees', 'Leave requests', 'Attendance', 'Payroll runs'],
  EMPLOYEE: ['My profile', 'My attendance', 'Apply for leave', 'My payslips'],
}

export default function Dashboard() {
  const { auth } = useAuth()
  const [check, setCheck] = useState({ state: 'loading', account: null })

  // Proves the JWT works: calls a protected backend endpoint.
  useEffect(() => {
    let cancelled = false
    api
      .get('/api/account/me')
      .then(({ data }) => {
        if (!cancelled) setCheck({ state: 'ok', account: data })
      })
      .catch(() => {
        if (!cancelled) setCheck({ state: 'error', account: null })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const fullName = check.account?.fullName

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold">Welcome back{fullName ? `, ${fullName}` : ''}</h1>
      <p className="mt-1 text-slate-600">
        Signed in as <span className="font-medium">{auth.email}</span>{' '}
        <span className="ml-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
          {auth.role}
        </span>
      </p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Backend connection
        </h2>
        {check.state === 'loading' && <p className="mt-2 text-sm text-slate-500">Checking…</p>}
        {check.state === 'ok' && (
          <p className="mt-2 break-words text-sm text-emerald-700">
            ✓ Connected. The server recognises you as {check.account.email} ({check.account.role}).
          </p>
        )}
        {check.state === 'error' && (
          <p className="mt-2 text-sm text-red-600">✗ Could not reach the backend.</p>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {(CARDS[auth.role] || []).map((title) => (
          <div key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="font-semibold">{title}</div>
            <div className="mt-1 text-sm text-slate-500">Coming in a later day of the build.</div>
          </div>
        ))}
      </div>
    </div>
  )
}
