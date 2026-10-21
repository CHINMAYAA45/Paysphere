import { useCallback, useEffect, useState } from 'react'
import api from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'

const PAGE_SIZE = 15

// Local date as YYYY-MM-DD (toISOString would shift the day because of UTC).
const fmtDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const monthStart = () => {
  const d = new Date()
  return fmtDate(new Date(d.getFullYear(), d.getMonth(), 1))
}
const today = () => fmtDate(new Date())

const time = (v) =>
  v ? new Date(v).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'
const day = (v) =>
  new Date(v + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
const worked = (m) => (m == null ? '—' : m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`)

function StatusBadge({ status }) {
  const cls = status === 'PRESENT' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status === 'HALF_DAY' ? 'HALF DAY' : status}
    </span>
  )
}

function Alert({ kind, children }) {
  const cls =
    kind === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-green-200 bg-green-50 text-green-700'
  return <div className={`mt-4 rounded-lg border px-3 py-2 text-sm ${cls}`}>{children}</div>
}

/* ---------- Today card with check-in / check-out ---------- */
function TodayCard({ onChanged, noProfile }) {
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/attendance/today')
      setRecord(res.status === 204 ? null : res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load today’s status.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!noProfile) load()
  }, [load, noProfile])

  async function act(path, okMsg) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const res = await api.post(`/api/attendance/${path}`)
      setRecord(res.data)
      setNotice(okMsg)
      onChanged()
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed.')
    } finally {
      setBusy(false)
    }
  }

  if (noProfile) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
        This account has no employee profile, so there is nothing to check in. Use the
        “All employees” tab to view everyone’s attendance.
      </div>
    )
  }

  const checkedIn = !!record
  const checkedOut = !!record?.checkOut

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm text-slate-500">Today · {day(today())}</div>
          {loading ? (
            <div className="mt-1 text-slate-500">Loading…</div>
          ) : !checkedIn ? (
            <div className="mt-1 text-lg font-semibold">You haven’t checked in yet</div>
          ) : !checkedOut ? (
            <div className="mt-1 text-lg font-semibold">
              Checked in at {time(record.checkIn)}
            </div>
          ) : (
            <div className="mt-1 text-lg font-semibold">
              {time(record.checkIn)} → {time(record.checkOut)}{' '}
              <span className="text-sm font-normal text-slate-500">({worked(record.workedMinutes)})</span>{' '}
              <StatusBadge status={record.status} />
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            disabled={busy || loading || checkedIn}
            onClick={() => act('check-in', 'Checked in. Have a good day!')}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            Check in
          </button>
          <button
            disabled={busy || loading || !checkedIn || checkedOut}
            onClick={() => act('check-out', 'Checked out. See you tomorrow!')}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-40"
          >
            Check out
          </button>
        </div>
      </div>
      {notice && <Alert kind="ok">{notice}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}
    </div>
  )
}

/* ---------- Date range inputs ---------- */
function DateRange({ from, to, setFrom, setTo }) {
  const cls = 'rounded-lg border border-slate-300 px-3 py-2 text-sm'
  return (
    <>
      <label className="text-sm text-slate-600">
        From <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={cls} />
      </label>
      <label className="text-sm text-slate-600">
        To <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={cls} />
      </label>
    </>
  )
}

/* ---------- My records ---------- */
function MyRecords({ refreshKey, noProfile }) {
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(today)
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (noProfile || !from || !to) return
    let cancelled = false
    api
      .get('/api/attendance/me', { params: { from, to } })
      .then((res) => {
        if (!cancelled) {
          setRows(res.data)
          setError('')
        }
      })
      .catch((err) => !cancelled && setError(err.response?.data?.message || 'Could not load records.'))
    return () => {
      cancelled = true
    }
  }, [from, to, refreshKey, noProfile])

  if (noProfile) return null

  const fullDays = rows?.filter((r) => r.status === 'PRESENT').length ?? 0
  const halfDays = rows?.filter((r) => r.status === 'HALF_DAY').length ?? 0

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-lg font-semibold">My records</h2>
        <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
      </div>
      {rows && (
        <p className="mt-2 text-sm text-slate-500">
          {rows.length} day(s) · {fullDays} full · {halfDays} half
        </p>
      )}
      {error && <Alert kind="error">{error}</Alert>}
      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Check in</th>
              <th className="px-4 py-3">Check out</th>
              <th className="px-4 py-3">Worked</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows && rows.length === 0 && (
              <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">No records in this range.</td></tr>
            )}
            {rows?.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">{day(r.workDate)}</td>
                <td className="px-4 py-3">{time(r.checkIn)}</td>
                <td className="px-4 py-3">{time(r.checkOut)}</td>
                <td className="px-4 py-3">{worked(r.workedMinutes)}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------- All employees (ADMIN / HR) ---------- */
function AllRecords({ refreshKey }) {
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(today)
  const [employeeId, setEmployeeId] = useState('')
  const [employees, setEmployees] = useState([])
  const [page, setPage] = useState(0)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/api/employees', { params: { size: 100, sortBy: 'firstName', dir: 'asc' } })
      .then((res) => setEmployees(res.data.content))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!from || !to) return
    let cancelled = false
    const params = { from, to, page, size: PAGE_SIZE }
    if (employeeId) params.employeeId = employeeId
    api
      .get('/api/attendance', { params })
      .then((res) => {
        if (!cancelled) {
          setData(res.data)
          setError('')
        }
      })
      .catch((err) => !cancelled && setError(err.response?.data?.message || 'Could not load records.'))
    return () => {
      cancelled = true
    }
  }, [from, to, employeeId, page, refreshKey])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={employeeId}
          onChange={(e) => {
            setEmployeeId(e.target.value)
            setPage(0)
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All employees</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.employeeCode} · {e.firstName} {e.lastName}
            </option>
          ))}
        </select>
        <DateRange
          from={from}
          to={to}
          setFrom={(v) => {
            setFrom(v)
            setPage(0)
          }}
          setTo={(v) => {
            setTo(v)
            setPage(0)
          }}
        />
      </div>
      {data && <p className="mt-2 text-sm text-slate-500">{data.totalElements} record(s)</p>}
      {error && <Alert kind="error">{error}</Alert>}

      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Check in</th>
              <th className="px-4 py-3">Check out</th>
              <th className="px-4 py-3">Worked</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data && data.content.length === 0 && (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">No records found.</td></tr>
            )}
            {data?.content.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">{day(r.workDate)}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{r.employeeName}</div>
                  <div className="font-mono text-xs text-slate-500">{r.employeeCode}</div>
                </td>
                <td className="px-4 py-3">{time(r.checkIn)}</td>
                <td className="px-4 py-3">{time(r.checkOut)}</td>
                <td className="px-4 py-3">{worked(r.workedMinutes)}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-slate-500">Page {data.page + 1} of {data.totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-100 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page + 1 >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-100 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- Page ---------- */
export default function Attendance() {
  const { auth } = useAuth()
  const isStaff = auth.role === 'ADMIN' || auth.role === 'HR'
  const [tab, setTab] = useState('mine')
  const [refreshKey, setRefreshKey] = useState(0)
  const [noProfile, setNoProfile] = useState(false)

  // The admin account has no employee profile. Detect it once.
  useEffect(() => {
    api.get('/api/attendance/today').catch((err) => {
      if (err.response?.status === 400) setNoProfile(true)
    })
  }, [])

  const tabCls = (active) =>
    `rounded-lg px-4 py-2 text-sm font-medium ${
      active ? 'bg-indigo-600 text-white' : 'border border-slate-300 hover:bg-slate-100'
    }`

  return (
    <div>
      <h1 className="text-2xl font-semibold">Attendance</h1>

      {isStaff && (
        <div className="mt-4 flex gap-2">
          <button onClick={() => setTab('mine')} className={tabCls(tab === 'mine')}>My attendance</button>
          <button onClick={() => setTab('all')} className={tabCls(tab === 'all')}>All employees</button>
        </div>
      )}

      <div className="mt-4">
        {tab === 'mine' || !isStaff ? (
          <>
            <TodayCard noProfile={noProfile} onChanged={() => setRefreshKey((k) => k + 1)} />
            <MyRecords noProfile={noProfile} refreshKey={refreshKey} />
          </>
        ) : (
          <AllRecords refreshKey={refreshKey} />
        )}
      </div>
    </div>
  )
}
