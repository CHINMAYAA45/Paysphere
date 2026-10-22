const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const monthName = (m) => MONTHS[m - 1]

export const money = (v) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(v ?? 0)

function Row({ label, value, bold, negative }) {
  return (
    <div className={`flex justify-between py-1.5 text-sm ${bold ? 'border-t border-slate-300 font-semibold' : ''}`}>
      <span>{label}</span>
      <span className={negative ? 'text-red-600' : ''}>{negative ? '− ' : ''}{money(value)}</span>
    </div>
  )
}

export function PayslipStatusBadge({ status }) {
  const cls = status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>
}

// A full-screen dialog showing one payslip, with a Print button.
export default function PayslipView({ payslip: p, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-6 w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div id="payslip-print" className="p-8">
          <div className="flex items-start justify-between border-b border-slate-200 pb-4">
            <div>
              <div className="text-xl font-bold tracking-tight">
                Pay<span className="text-indigo-600">Sphere</span>
              </div>
              <div className="text-sm text-slate-500">Payslip for {monthName(p.month)} {p.year}</div>
            </div>
            <PayslipStatusBadge status={p.status} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-y-1 text-sm">
            <div><span className="text-slate-500">Employee: </span>{p.employeeName}</div>
            <div><span className="text-slate-500">Code: </span>{p.employeeCode}</div>
            <div><span className="text-slate-500">Department: </span>{p.department}</div>
            <div><span className="text-slate-500">Designation: </span>{p.designation}</div>
          </div>

          <div className="mt-4 grid grid-cols-5 gap-2 rounded-lg bg-slate-50 p-3 text-center text-xs">
            <div><div className="text-base font-semibold">{p.workingDays}</div>Working days</div>
            <div><div className="text-base font-semibold">{p.presentDays}</div>Present</div>
            <div><div className="text-base font-semibold">{p.halfDays}</div>Half days</div>
            <div><div className="text-base font-semibold">{p.leaveDays}</div>Paid leave</div>
            <div><div className="text-base font-semibold">{p.lopDays}</div>Loss of pay</div>
          </div>

          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Earnings</h3>
              <Row label="Gross monthly salary" value={p.grossSalary} />
              <Row label={`Loss of pay (${p.lopDays} day)`} value={p.lopDeduction} negative />
              <Row label="Basic" value={p.basic} />
              <Row label="HRA" value={p.hra} />
              <Row label="Special allowance" value={p.specialAllowance} />
              <Row label="Earned gross" value={p.earnedGross} bold />
            </div>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Deductions</h3>
              <Row label="Provident fund (12% of basic)" value={p.pf} />
              <Row label="Professional tax" value={p.professionalTax} />
              <Row label="Income tax (simplified)" value={p.incomeTax} />
              <Row label="Total deductions" value={p.totalDeductions} bold />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-lg bg-indigo-50 px-4 py-3">
            <span className="font-medium">Net pay</span>
            <span className="text-2xl font-bold text-indigo-700">{money(p.netSalary)}</span>
          </div>

          <p className="mt-4 text-xs text-slate-400">
            Generated on {new Date(p.generatedAt).toLocaleDateString('en-IN')}
            {p.paidAt && ` · Paid on ${new Date(p.paidAt).toLocaleDateString('en-IN')}`}.
            This is a computer-generated demo payslip.
          </p>
        </div>

        <div className="no-print flex justify-end gap-3 border-t border-slate-200 px-8 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
          >
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Print / Save as PDF
          </button>
        </div>
      </div>
    </div>
  )
}
