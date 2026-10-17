import { useState } from 'react'
import api from '../api/client.js'

const EMPTY = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  department: '',
  designation: '',
  dateOfJoining: '',
  baseSalary: '',
  role: 'EMPLOYEE',
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100'

// employee = null → "add" mode; employee = {...} → "edit" mode.
export default function EmployeeForm({ employee, isAdmin, onClose, onSaved }) {
  const editing = !!employee
  const [form, setForm] = useState(
    editing
      ? {
          ...EMPTY,
          ...employee,
          phone: employee.phone || '',
          baseSalary: String(employee.baseSalary ?? ''),
        }
      : EMPTY,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setFieldErrors({})
    const common = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      department: form.department.trim(),
      designation: form.designation.trim(),
      dateOfJoining: form.dateOfJoining,
      baseSalary: form.baseSalary === '' ? null : Number(form.baseSalary),
    }
    try {
      if (editing) {
        await api.put(`/api/employees/${employee.id}`, common)
      } else {
        await api.post('/api/employees', {
          ...common,
          email: form.email.trim(),
          password: form.password,
          role: form.role,
        })
      }
      onSaved(editing ? 'Employee updated.' : 'Employee created.')
    } catch (err) {
      const data = err.response?.data
      if (data?.fieldErrors) setFieldErrors(data.fieldErrors)
      setError(data?.message || (err.response ? 'Something went wrong.' : 'Cannot reach the server.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold">{editing ? `Edit ${employee.employeeCode}` : 'Add employee'}</h2>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="First name" error={fieldErrors.firstName}>
            <input className={inputCls} value={form.firstName} onChange={set('firstName')} required />
          </Field>
          <Field label="Last name" error={fieldErrors.lastName}>
            <input className={inputCls} value={form.lastName} onChange={set('lastName')} required />
          </Field>

          {!editing && (
            <>
              <Field label="Email" error={fieldErrors.email}>
                <input type="email" className={inputCls} value={form.email} onChange={set('email')} required />
              </Field>
              <Field label="Temporary password (min 8)" error={fieldErrors.password}>
                <input
                  type="password"
                  className={inputCls}
                  value={form.password}
                  onChange={set('password')}
                  minLength={8}
                  required
                />
              </Field>
            </>
          )}

          <Field label="Phone" error={fieldErrors.phone}>
            <input className={inputCls} value={form.phone} onChange={set('phone')} />
          </Field>
          <Field label="Date of joining" error={fieldErrors.dateOfJoining}>
            <input type="date" className={inputCls} value={form.dateOfJoining} onChange={set('dateOfJoining')} required />
          </Field>
          <Field label="Department" error={fieldErrors.department}>
            <input className={inputCls} value={form.department} onChange={set('department')} required />
          </Field>
          <Field label="Designation" error={fieldErrors.designation}>
            <input className={inputCls} value={form.designation} onChange={set('designation')} required />
          </Field>
          <Field label="Base salary (monthly)" error={fieldErrors.baseSalary}>
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputCls}
              value={form.baseSalary}
              onChange={set('baseSalary')}
              required
            />
          </Field>

          {!editing && (
            <Field label="Role">
              <select className={inputCls} value={form.role} onChange={set('role')}>
                <option value="EMPLOYEE">EMPLOYEE</option>
                {isAdmin && <option value="HR">HR</option>}
              </select>
            </Field>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
