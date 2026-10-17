import { useCallback, useEffect, useState } from 'react'
import api from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import EmployeeForm from '../components/EmployeeForm.jsx'

const PAGE_SIZE = 10

const money = (v) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)

export default function Employees() {
  const { auth } = useAuth()
  const isAdmin = auth.role === 'ADMIN'

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [formState, setFormState] = useState(null) // null = closed, {employee} = open

  // Wait 400 ms after typing stops before searching.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(0)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page, size: PAGE_SIZE, sortBy: 'id', dir: 'asc' }
      if (search) params.search = search
      if (department.trim()) params.department = department.trim()
      if (status) params.status = status
      const res = await api.get('/api/employees', { params })
      setData(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load employees.')
    } finally {
      setLoading(false)
    }
  }, [page, search, department, status])

  useEffect(() => {
    load()
  }, [load])

  async function toggleStatus(emp) {
    const deactivating = emp.status === 'ACTIVE'
    if (deactivating && !window.confirm(`Deactivate ${emp.firstName} ${emp.lastName}? They will lose access immediately.`)) {
      return
    }
    setNotice('')
    setError('')
    try {
      if (deactivating) await api.delete(`/api/employees/${emp.id}`)
      else await api.patch(`/api/employees/${emp.id}/activate`)
      setNotice(deactivating ? 'Employee deactivated.' : 'Employee reactivated.')
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed.')
    }
  }

  function canManage(emp) {
    return isAdmin || emp.role === 'EMPLOYEE'
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Employees</h1>
          <p className="text-sm text-slate-500">{data ? `${data.totalElements} total` : ' '}</p>
        </div>
        <button
          onClick={() => setFormState({ employee: null })}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Add employee
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search name, email or code…"
          className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          value={department}
          onChange={(e) => {
            setDepartment(e.target.value)
            setPage(0)
          }}
          placeholder="Department"
          className="w-44 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(0)
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {notice && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {notice}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Designation</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3 text-right">Salary</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && !data && (
              <tr>
                <td colSpan="8" className="px-4 py-8 text-center text-slate-500">Loading…</td>
              </tr>
            )}
            {data && data.content.length === 0 && (
              <tr>
                <td colSpan="8" className="px-4 py-8 text-center text-slate-500">No employees found.</td>
              </tr>
            )}
            {data?.content.map((emp) => (
              <tr key={emp.id} className={emp.status === 'INACTIVE' ? 'bg-slate-50 text-slate-400' : ''}>
                <td className="px-4 py-3 font-mono text-xs">{emp.employeeCode}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{emp.firstName} {emp.lastName}</div>
                  <div className="text-xs text-slate-500">{emp.email}</div>
                </td>
                <td className="px-4 py-3">{emp.department}</td>
                <td className="px-4 py-3">{emp.designation}</td>
                <td className="px-4 py-3">{emp.role}</td>
                <td className="px-4 py-3 text-right">{money(emp.baseSalary)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      emp.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {emp.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {canManage(emp) ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setFormState({ employee: emp })}
                        className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleStatus(emp)}
                        className={`rounded border px-2 py-1 text-xs ${
                          emp.status === 'ACTIVE'
                            ? 'border-red-300 text-red-600 hover:bg-red-50'
                            : 'border-green-300 text-green-700 hover:bg-green-50'
                        }`}
                      >
                        {emp.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Admin only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-slate-500">
            Page {data.page + 1} of {data.totalPages}
          </span>
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

      {formState && (
        <EmployeeForm
          employee={formState.employee}
          isAdmin={isAdmin}
          onClose={() => setFormState(null)}
          onSaved={(msg) => {
            setFormState(null)
            setNotice(msg)
            load()
          }}
        />
      )}
    </div>
  )
}
