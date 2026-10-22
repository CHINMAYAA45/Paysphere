import { useEffect, useState } from 'react'
import api from '../api/client.js'
import PayslipView, { money, monthName, PayslipStatusBadge } from '../components/PayslipView.jsx'

const PAGE_SIZE = 15

// The most recent completed month (payroll can't be run for the current month).
function lastMonth() {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function Alert({ kind, children }) {
  const cls =
    kind === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-green-200 bg-green-50 text-green-700'
  return <div className={`mt-4 rounded-lg border px-3 py-2 text-sm ${cls}`}>{children}</div>
}

const selectCls = 'rounded-lg border border-slate-300 px-3 py-2 text-sm'

export default function Payroll() {
  const last = lastMonth()
  const [genYear, setGenYear] = useState(last.year)
  const [genMonth, setGenMonth] = useState(last.month)
  const [generating, setGenerating] = useState(false)

  const [year, setYear] = useState(last.year)
  const [month, setMonth] = useState(String(last.month)) // '' = all months
  const [page, setPage] = useState(0)
  const [data, setData] = useState(null)
  const [tick, setTick] = useState(0)

  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!year) return
    let cancelled = false
    const params = { year, page, size: PAGE_SIZE }
    if (month) params.month = month
    api
      .get('/api/payroll', { params })
      .then((res) => {
        if (!cancelled) setData(res.data)
      })
      .catch((err) => !cancelled && setError(err.response?.data?.message || 'Could not load payslips.'))
    return () => {
      cancelled = true
    }
  }, [year, month, page, tick])

  async function generate(e) {
    e.preventDefault()
    setGenerating(true)
    setError('')
    setNotice('')
    try {
      const res = await api.post('/api/payroll/generate', { year: Number(genYear), month: Number(genMonth) })
      const r = res.data
      setNotice(
        `${monthName(r.month)} ${r.year}: ${r.generated} payslip(s) generated, ` +
          `${r.alreadyExisted} already existed, ${r.notYetJoined} not yet joined.`,
      )
      // Show the month we just generated.
      setYear(r.year)
      setMonth(String(r.month))
      setPage(0)
      setTick((t) => t + 1)
    } catch (err) {
      const d = err.response?.data
      setError(
        d?.fieldErrors ? Object.values(d.fieldErrors).join(', ') : d?.message || 'Could not generate payroll.',
      )
    } finally {
      setGenerating(false)
    }
  }

  async function markPaid(p) {
    if (!window.confirm(`Mark ${p.employeeName}'s ${monthName(p.month)} payslip as paid?`)) return
    setError('')
    setNotice('')
    try {
      await api.patch(`/api/payroll/${p.id}/pay`)
      setNotice('Payslip marked as paid.')
      setTick((t) => t + 1)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not mark as paid.')
    }
  }

  async function remove(p) {
    if (!window.confirm(`Delete ${p.employeeName}'s ${monthName(p.month)} payslip? You can generate it again afterwards.`)) {
      return
    }
    setError('')
    setNotice('')
    try {
      await api.delete(`/api/payroll/${p.id}`)
      setNotice('Payslip deleted.')
      setTick((t) => t + 1)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete.')
    }
  }

  const totalNet = data?.content.reduce((sum, p) => sum + Number(p.netSalary), 0) ?? 0

  return (
    <div>
      <h1 className="text-2xl font-semibold">Payroll</h1>

      {/* Generate */}
      <form onSubmit={generate} className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <div className="mb-1 text-sm font-medium text-slate-700">Generate payroll for</div>
          <div className="flex gap-2">
            <select value={genMonth} onChange={(e) => setGenMonth(e.target.value)} className={selectCls}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{monthName(i + 1)}</option>
              ))}
            </select>
            <input
              type="number"
              min="2000"
              max="2100"
              value={genYear}
              onChange={(e) => setGenYear(e.target.value)}
              className={`${selectCls} w-24`}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={generating}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {generating ? 'Generating…' : 'Generate payroll'}
        </button>
        <p className="w-full text-xs text-slate-500">
          Works for completed months only. Running it again is safe: existing payslips are kept.
        </p>
      </form>

      {notice && <Alert kind="ok">{notice}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-lg font-semibold">Payslips</h2>
        <select
          value={month}
          onChange={(e) => {
            setMonth(e.target.value)
            setPage(0)
          }}
          className={selectCls}
        >
          <option value="">All months</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{monthName(i + 1)}</option>
          ))}
        </select>
        <input
          type="number"
          min="2000"
          max="2100"
          value={year}
          onChange={(e) => {
            setYear(e.target.value)
            setPage(0)
          }}
          className={`${selectCls} w-24`}
        />
      </div>
      {data && (
        <p className="mt-2 text-sm text-slate-500">
          {data.totalElements} payslip(s) · net pay on this page {money(totalNet)}
        </p>
      )}

      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3">LOP</th>
              <th className="px-4 py-3 text-right">Gross</th>
              <th className="px-4 py-3 text-right">Deductions</th>
              <th className="px-4 py-3 text-right">Net pay</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data && data.content.length === 0 && (
              <tr><td colSpan="8" className="px-4 py-8 text-center text-slate-500">No payslips for this selection.</td></tr>
            )}
            {data?.content.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <div className="font-medium">{p.employeeName}</div>
                  <div className="font-mono text-xs text-slate-500">{p.employeeCode}</div>
                </td>
                <td className="px-4 py-3">{monthName(p.month)} {p.year}</td>
                <td className="px-4 py-3">{p.lopDays}</td>
                <td className="px-4 py-3 text-right">{money(p.earnedGross)}</td>
                <td className="px-4 py-3 text-right">{money(p.totalDeductions)}</td>
                <td className="px-4 py-3 text-right font-medium">{money(p.netSalary)}</td>
                <td className="px-4 py-3"><PayslipStatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setSelected(p)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                    >
                      View
                    </button>
                    {p.status === 'GENERATED' && (
                      <>
                        <button
                          onClick={() => markPaid(p)}
                          className="rounded border border-green-300 px-2 py-1 text-xs text-green-700 hover:bg-green-50"
                        >
                          Mark paid
                        </button>
                        <button
                          onClick={() => remove(p)}
                          className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
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

      {selected && <PayslipView payslip={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
