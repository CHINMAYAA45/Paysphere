import { useCallback, useEffect, useState } from 'react'
import api from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'

const PAGE_SIZE = 10
const TYPES = ['CASUAL', 'SICK', 'EARNED']

const fmtDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const todayStr = () => fmtDate(new Date())
const day = (v) =>
  new Date(v + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

// Working days (Mon–Fri) between two YYYY-MM-DD dates, inclusive. Same rule as the server.
function workingDays(from, to) {
  if (!from || !to || to < from) return 0
  let count = 0
  const end = new Date(to + 'T00:00:00')
  for (let d = new Date(from + 'T00:00:00'); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) count++
  }
  return count
}

const STATUS_CLS = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-200 text-slate-600',
}

function StatusBadge({ status }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLS[status] || ''}`}>{status}</span>
  )
}

function Alert({ kind, children }) {
  const cls =
    kind === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-green-200 bg-green-50 text-green-700'
  return <div className={`mt-4 rounded-lg border px-3 py-2 text-sm ${cls}`}>{children}</div>
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

/* ---------- Apply form (modal) ---------- */
function ApplyForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ leaveType: 'CASUAL', startDate: '', endDate: '', reason: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const days = workingDays(form.startDate, form.endDate)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post('/api/leaves', { ...form, reason: form.reason.trim() })
      onSaved('Leave request submitted.')
    } catch (err) {
      const data = err.response?.data
      const fields = data?.fieldErrors ? Object.values(data.fieldErrors).join(', ') : ''
      setError(data?.message ? `${data.message}${fields ? ': ' + fields : ''}` : 'Could not submit the request.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Apply for leave</h2>
        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Leave type</span>
            <select className={inputCls} value={form.leaveType} onChange={set('leaveType')}>
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">From</span>
              <input type="date" className={inputCls} min={todayStr()} value={form.startDate} onChange={set('startDate')} required />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">To</span>
              <input type="date" className={inputCls} min={form.startDate || todayStr()} value={form.endDate} onChange={set('endDate')} required />
            </label>
          </div>
          {form.startDate && form.endDate && (
            <p className="text-sm text-slate-500">
              {days} working day(s) (weekends are not counted)
            </p>
          )}
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Reason</span>
            <textarea
              className={inputCls}
              rows="3"
              maxLength={500}
              value={form.reason}
              onChange={set('reason')}
              required
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ---------- My leave (balance + requests) ---------- */
function MyLeave({ noProfile }) {
  const [balance, setBalance] = useState([])
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    try {
      const [b, r] = await Promise.all([api.get('/api/leaves/balance'), api.get('/api/leaves/me')])
      setBalance(b.data)
      setRows(r.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load your leave data.')
    }
  }, [])

  useEffect(() => {
    if (!noProfile) load()
  }, [load, noProfile])

  async function cancel(r) {
    if (!window.confirm(`Cancel your ${r.leaveType} leave from ${day(r.startDate)}?`)) return
    setError('')
    setNotice('')
    try {
      await api.delete(`/api/leaves/${r.id}`)
      setNotice('Leave request cancelled.')
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not cancel.')
    }
  }

  if (noProfile) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
        This account has no employee profile, so it has no leave balance. Use the “Review requests” tab
        to approve or reject leave.
      </div>
    )
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        {balance.map((b) => (
          <div key={b.leaveType} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{b.leaveType}</div>
            <div className="mt-1 text-3xl font-semibold">
              {b.remaining}
              <span className="text-base font-normal text-slate-500"> / {b.allowed} days left</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">{b.used} used or pending this year</div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">My requests</h2>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Apply for leave
        </button>
      </div>

      {notice && <Alert kind="ok">{notice}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}

      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Days</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows && rows.length === 0 && (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">No leave requests yet.</td></tr>
            )}
            {rows?.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">{r.leaveType}</td>
                <td className="px-4 py-3">
                  {day(r.startDate)}
                  {r.endDate !== r.startDate && ` → ${day(r.endDate)}`}
                </td>
                <td className="px-4 py-3">{r.days}</td>
                <td className="max-w-xs px-4 py-3">
                  <div className="truncate" title={r.reason}>{r.reason}</div>
                  {r.reviewComment && (
                    <div className="mt-0.5 text-xs text-slate-500" title={r.reviewComment}>
                      {r.reviewedBy}: “{r.reviewComment}”
                    </div>
                  )}
                </td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-right">
                  {r.status === 'PENDING' && (
                    <button
                      onClick={() => cancel(r)}
                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <ApplyForm
          onClose={() => setShowForm(false)}
          onSaved={(msg) => {
            setShowForm(false)
            setNotice(msg)
            setError('')
            load()
          }}
        />
      )}
    </div>
  )
}

/* ---------- Reject dialog ---------- */
function RejectDialog({ request, onClose, onDone }) {
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.patch(`/api/leaves/${request.id}/reject`, { comment: comment.trim() })
      onDone('Request rejected.')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reject.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Reject request</h2>
        <p className="mt-1 text-sm text-slate-500">
          {request.employeeName} · {request.leaveType} · {day(request.startDate)}
        </p>
        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Reason for rejecting (required)</span>
          <textarea className={inputCls} rows="3" maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} required />
        </label>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100">
            Back
          </button>
          <button
            type="submit"
            disabled={busy || !comment.trim()}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {busy ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ---------- Review requests (ADMIN / HR) ---------- */
function ReviewRequests() {
  const [status, setStatus] = useState('PENDING')
  const [page, setPage] = useState(0)
  const [data, setData] = useState(null)
  const [myCode, setMyCode] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [rejecting, setRejecting] = useState(null)
  const [tick, setTick] = useState(0)

  // So we can hide the buttons on the reviewer's own requests (admin has no profile → ignore).
  useEffect(() => {
    api.get('/api/employees/me').then((r) => setMyCode(r.data.employeeCode)).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    const params = { page, size: PAGE_SIZE }
    if (status) params.status = status
    api
      .get('/api/leaves', { params })
      .then((res) => {
        if (!cancelled) {
          setData(res.data)
          setError('')
        }
      })
      .catch((err) => !cancelled && setError(err.response?.data?.message || 'Could not load requests.'))
    return () => {
      cancelled = true
    }
  }, [status, page, tick])

  async function approve(r) {
    setError('')
    setNotice('')
    try {
      await api.patch(`/api/leaves/${r.id}/approve`, {})
      setNotice('Request approved.')
      setTick((t) => t + 1)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not approve.')
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(0)
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        {data && <span className="text-sm text-slate-500">{data.totalElements} request(s)</span>}
      </div>

      {notice && <Alert kind="ok">{notice}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}

      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Days</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data && data.content.length === 0 && (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">Nothing here.</td></tr>
            )}
            {data?.content.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  <div className="font-medium">{r.employeeName}</div>
                  <div className="font-mono text-xs text-slate-500">{r.employeeCode}</div>
                </td>
                <td className="px-4 py-3">{r.leaveType}</td>
                <td className="px-4 py-3">
                  {day(r.startDate)}
                  {r.endDate !== r.startDate && ` → ${day(r.endDate)}`}
                </td>
                <td className="px-4 py-3">{r.days}</td>
                <td className="max-w-xs px-4 py-3">
                  <div className="truncate" title={r.reason}>{r.reason}</div>
                  {r.reviewComment && (
                    <div className="mt-0.5 text-xs text-slate-500">{r.reviewedBy}: “{r.reviewComment}”</div>
                  )}
                </td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-right">
                  {r.status !== 'PENDING' ? null : r.employeeCode === myCode ? (
                    <span className="text-xs text-slate-400">Your request</span>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => approve(r)}
                        className="rounded border border-green-300 px-2 py-1 text-xs text-green-700 hover:bg-green-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setRejecting(r)}
                        className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
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

      {rejecting && (
        <RejectDialog
          request={rejecting}
          onClose={() => setRejecting(null)}
          onDone={(msg) => {
            setRejecting(null)
            setNotice(msg)
            setError('')
            setTick((t) => t + 1)
          }}
        />
      )}
    </div>
  )
}

/* ---------- Page ---------- */
export default function Leave() {
  const { auth } = useAuth()
  const isStaff = auth.role === 'ADMIN' || auth.role === 'HR'
  // Admin has no employee profile: start on the review tab.
  const [tab, setTab] = useState(auth.role === 'ADMIN' ? 'review' : 'mine')
  const noProfile = auth.role === 'ADMIN'

  const tabCls = (active) =>
    `rounded-lg px-4 py-2 text-sm font-medium ${
      active ? 'bg-indigo-600 text-white' : 'border border-slate-300 hover:bg-slate-100'
    }`

  return (
    <div>
      <h1 className="text-2xl font-semibold">Leave</h1>

      {isStaff && (
        <div className="mt-4 flex gap-2">
          <button onClick={() => setTab('mine')} className={tabCls(tab === 'mine')}>My leave</button>
          <button onClick={() => setTab('review')} className={tabCls(tab === 'review')}>Review requests</button>
        </div>
      )}

      <div className="mt-4">
        {tab === 'review' && isStaff ? <ReviewRequests /> : <MyLeave noProfile={noProfile} />}
      </div>
    </div>
  )
}
