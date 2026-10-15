import { useAuth } from '../context/AuthContext.jsx'

const NAV = [
  { label: 'Dashboard', roles: ['ADMIN', 'HR', 'EMPLOYEE'], active: true },
  { label: 'Employees', roles: ['ADMIN', 'HR'], soon: true },
  { label: 'Attendance', roles: ['ADMIN', 'HR', 'EMPLOYEE'], soon: true },
  { label: 'Leave', roles: ['ADMIN', 'HR', 'EMPLOYEE'], soon: true },
  { label: 'Payroll', roles: ['ADMIN', 'HR'], soon: true },
  { label: 'My Payslips', roles: ['EMPLOYEE'], soon: true },
]

export default function Layout({ children }) {
  const { auth, logout } = useAuth()
  const items = NAV.filter((item) => item.roles.includes(auth.role))

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 flex-col bg-slate-900 text-slate-200 md:flex">
        <div className="px-6 py-5 text-xl font-bold tracking-tight text-white">
          Pay<span className="text-indigo-400">Sphere</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {items.map((item) => (
            <div
              key={item.label}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                item.active
                  ? 'bg-indigo-600 text-white'
                  : 'cursor-not-allowed text-slate-400'
              }`}
            >
              <span>{item.label}</span>
              {item.soon && (
                <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                  soon
                </span>
              )}
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="text-sm text-slate-500 md:hidden font-semibold">PaySphere</div>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium">{auth.email}</div>
              <div className="text-xs text-slate-500">{auth.role}</div>
            </div>
            <button
              onClick={logout}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Log out
            </button>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
