import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import { money, monthName } from '../components/PayslipView.jsx'

function StatCard({ label, value, hint, to }) {
  const body = (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  )
  return to ? <Link to={to}>{body}</Link> : body
}

function Section({ title, children, action }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  )
}

const TODAY_TEXT = {
  NOT_CHECKED_IN: 'Not checked in yet',
  CHECKED_IN: 'Checked in',
  CHECKED_OUT: 'Checked out for the day',
}

const clock = (v) =>
  v ? new Date(v).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''

/* ---------- Company overview (ADMIN / HR) ---------- */
function Overview() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/api/dashboard/overview')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Could not load the company overview.'))
  }, [])

  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!data) return <p className="text-sm text-slate-500">Loading company overview…</p>

  const maxDept = Math.max(1, ...data.departments.map((d) => d.count))
  const maxNet = Math.max(1, ...data.payrollTrend.map((m) => Number(m.netTotal)))

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active employees" value={data.activeEmployees} to="/employees" />
        <StatCard
          label="Present today"
          value={data.presentToday}
          hint={data.halfDayToday ? `${data.halfDayToday} half day` : 'Checked in today'}
          to="/attendance"
        />
        <StatCard label="On leave today" value={data.onLeaveToday} hint="Approved leave" to="/leave" />
        <StatCard label="Pending leave requests" value={data.pendingLeaves} hint="Waiting for review" to="/leave" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Headcount by department">
          {data.departments.length === 0 ? (
            <p className="text-sm text-slate-500">No active employees.</p>
          ) : (
            <ul className="space-y-2">
              {data.departments.map((d) => (
                <li key={d.department}>
                  <div className="flex justify-between text-sm">
                    <span>{d.department}</span>
                    <span className="font-medium">{d.count}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-indigo-500"
                      style={{ width: `${(d.count / maxDept) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Net payroll by month"
          action={
            <Link to="/payroll" className="text-xs font-medium text-indigo-600 hover:underline">
              Open payroll
            </Link>
          }
        >
          {data.payrollTrend.length === 0 ? (
            <p className="text-sm text-slate-500">No payroll generated yet.</p>
          ) : (
            <div className="flex h-44 items-end gap-3">
              {data.payrollTrend.map((m) => {
                const h = Math.max(6, (Number(m.netTotal) / maxNet) * 100)
                const allPaid = m.paid === m.payslips
                return (
                  <div key={`${m.year}-${m.month}`} className="flex flex-1 flex-col items-center justify-end gap-1">
                    <div className="text-[10px] text-slate-500">{money(m.netTotal).replace('.00', '')}</div>
                    <div
                      className={`w-full rounded-t ${allPaid ? 'bg-emerald-500' : 'bg-amber-400'}`}
                      style={{ height: `${h}%` }}
                      title={`${monthName(m.month)} ${m.year}: ${m.paid}/${m.payslips} paid`}
                    />
                    <div className="text-xs text-slate-600">{monthName(m.month).slice(0, 3)}</div>
                  </div>
                )
              })}
            </div>
          )}
          <p className="mt-3 text-xs text-slate-500">
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" /> all paid
            <span className="ml-3 mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" /> some unpaid
          </p>
        </Section>
      </div>
    </div>
  )
}

/* ---------- Personal overview (EMPLOYEE / HR) ---------- */
function MyOverview() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/api/dashboard/me')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Could not load your overview.'))
  }, [])

  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!data) return <p className="text-sm text-slate-500">Loading your overview…</p>

  const p = data.latestPayslip

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today"
          value={TODAY_TEXT[data.todayStatus]}
          hint={
            data.todayStatus === 'CHECKED_IN'
              ? `Since ${clock(data.checkIn)}`
              : data.todayStatus === 'CHECKED_OUT'
                ? `${clock(data.checkIn)} → ${clock(data.checkOut)}`
                : 'Go to Attendance to check in'
          }
          to="/attendance"
        />
        <StatCard
          label="This month"
          value={`${data.presentDaysThisMonth} days`}
          hint={`${data.halfDaysThisMonth} half day(s)`}
          to="/attendance"
        />
        <StatCard label="Pending leave requests" value={data.pendingLeaves} to="/leave" />
        <StatCard
          label="Latest net pay"
          value={p ? money(p.netSalary).replace('.00', '') : '—'}
          hint={p ? `${monthName(p.month)} ${p.year} · ${p.status}` : 'No payslip yet'}
          to="/payslips"
        />
      </div>

      <Section
        title="Leave balance"
        action={
          <Link to="/leave" className="text-xs font-medium text-indigo-600 hover:underline">
            Apply for leave
          </Link>
        }
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {data.leaveBalance.map((b) => (
            <div key={b.leaveType}>
              <div className="flex justify-between text-sm">
                <span>{b.leaveType}</span>
                <span className="font-medium">
                  {b.remaining} / {b.allowed}
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-indigo-500"
                  style={{ width: `${(b.remaining / b.allowed) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

/* ---------- Page ---------- */
export default function Dashboard() {
  const { auth } = useAuth()
  const [fullName, setFullName] = useState('')
  const isStaff = auth.role === 'ADMIN' || auth.role === 'HR'
  const hasProfile = auth.role !== 'ADMIN'

  useEffect(() => {
    api
      .get('/api/account/me')
      .then(({ data }) => setFullName(data.fullName || ''))
      .catch(() => {})
  }, [])

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold">Welcome back{fullName ? `, ${fullName}` : ''}</h1>
      <p className="mt-1 text-slate-600">
        Signed in as <span className="font-medium">{auth.email}</span>{' '}
        <span className="ml-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
          {auth.role}
        </span>
      </p>

      {isStaff && (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Company overview</h2>
          <Overview />
        </div>
      )}

      {hasProfile && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">{isStaff ? 'My overview' : 'Your overview'}</h2>
          <MyOverview />
        </div>
      )}
    </div>
  )
}
