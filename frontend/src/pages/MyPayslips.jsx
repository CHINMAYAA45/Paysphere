import { useEffect, useState } from 'react'
import api from '../api/client.js'
import PayslipView, { money, monthName, PayslipStatusBadge } from '../components/PayslipView.jsx'

export default function MyPayslips() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    api
      .get('/api/payroll/me')
      .then((res) => setRows(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Could not load your payslips.'))
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-semibold">My payslips</h1>
      <p className="text-sm text-slate-500">Payslips appear here after HR generates payroll for a month.</p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3">Loss of pay</th>
              <th className="px-4 py-3 text-right">Net pay</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows && rows.length === 0 && (
              <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">No payslips yet.</td></tr>
            )}
            {rows?.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-medium">{monthName(p.month)} {p.year}</td>
                <td className="px-4 py-3">{p.lopDays} day(s)</td>
                <td className="px-4 py-3 text-right font-medium">{money(p.netSalary)}</td>
                <td className="px-4 py-3"><PayslipStatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setSelected(p)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && <PayslipView payslip={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
