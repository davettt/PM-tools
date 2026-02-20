import type { StatusOption } from '../types'

interface StatusDropdownProps {
  value: StatusOption
  onChange: (value: StatusOption) => void
}

const STATUS_OPTIONS: StatusOption[] = ['VERIFIED', 'INCOMPLETE', 'MISSING']

const STATUS_STYLES: Record<StatusOption, string> = {
  VERIFIED: 'bg-green-100 text-green-800 border-green-300',
  INCOMPLETE: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  MISSING: 'bg-red-100 text-red-800 border-red-300',
}

const StatusDropdown = ({ value, onChange }: StatusDropdownProps) => {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as StatusOption)}
      className={`text-sm font-semibold border rounded px-2 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 ${STATUS_STYLES[value]}`}
    >
      {STATUS_OPTIONS.map(opt => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  )
}

export default StatusDropdown
