import { useState } from 'react'
import { COUNTRIES, countryName } from '../lib/countries'

interface Props {
  value: string[]
  onChange: (codes: string[]) => void
  placeholder?: string
}

export function CountrySelect({ value, onChange, placeholder }: Props) {
  const [query, setQuery] = useState('')

  const matches = COUNTRIES.filter(
    (c) =>
      !value.includes(c.code) &&
      (c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.code.toLowerCase().includes(query.toLowerCase())),
  )

  const addCountry = (code: string) => {
    if (!code) return
    onChange([...value, code])
    setQuery('')
  }

  const removeCountry = (code: string) => {
    onChange(value.filter((c) => c !== code))
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 rounded-t-lg border border-b-0 border-border bg-surface-2 px-2 py-2">
        {value.length === 0 && (
          <span className="px-1 py-1 text-sm text-text-muted">No countries selected — Global</span>
        )}
        {value.map((code) => (
          <span
            key={code}
            className="flex items-center gap-1 rounded-full bg-gradient-to-r from-accent/25 to-violet-500/25 px-2.5 py-1 text-xs font-medium text-text ring-1 ring-inset ring-accent/30"
          >
            {countryName(code)}
            <button
              type="button"
              onClick={() => removeCountry(code)}
              className="text-text-muted transition-colors hover:text-text"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2 rounded-b-lg border border-border bg-surface-2 p-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder ?? 'Filter countries…'}
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none transition-colors focus:border-accent"
        />
        <select
          value=""
          onChange={(e) => addCountry(e.target.value)}
          className="w-48 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none transition-colors focus:border-accent"
        >
          <option value="">+ Add country…</option>
          {matches.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
