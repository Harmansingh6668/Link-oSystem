import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Campaign } from '../lib/types'
import { StatusBadge } from '../components/StatusBadge'

type SortKey = 'name' | 'mapping_key' | 'status'
type StatusFilter = 'ALL' | 'ACTIVE' | 'PAUSED'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string

function redirectUrl(mappingKey: string) {
  return `${supabaseUrl}/functions/v1/redirect/${mappingKey}`
}

export function Campaigns() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [showCount, setShowCount] = useState(10)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortAsc, setSortAsc] = useState(true)

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('campaigns').select('*').order('name')
      if (error) throw error
      return data as Campaign[]
    },
    enabled: !!user,
  })

  const toggleStatus = useMutation({
    mutationFn: async (c: Campaign) => {
      const next = c.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
      const { error } = await supabase.from('campaigns').update({ status: next }).eq('id', c.id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  })

  const filtered = useMemo(() => {
    let rows = campaigns
    if (statusFilter !== 'ALL') rows = rows.filter((c) => c.status === statusFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.final_destination_url.toLowerCase().includes(q) ||
          c.mapping_key.toLowerCase().includes(q),
      )
    }
    rows = [...rows].sort((a, b) => {
      const av = (a[sortKey] ?? '').toString().toLowerCase()
      const bv = (b[sortKey] ?? '').toString().toLowerCase()
      const cmp = av.localeCompare(bv)
      return sortAsc ? cmp : -cmp
    })
    return rows.slice(0, showCount)
  }, [campaigns, statusFilter, search, sortKey, sortAsc, showCount])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="bg-gradient-to-r from-text to-text/70 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            Campaigns
          </h1>
          <p className="text-sm text-text-muted">Manage routing destinations and linked offers</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['campaigns'] })}
            className="rounded-lg border border-border px-3 py-2 text-sm text-text-muted transition-colors hover:border-accent/40 hover:bg-surface-2 hover:text-text"
          >
            ↻ Sync
          </button>
          <Link
            to="/campaigns/new"
            className="btn-primary rounded-lg px-3 py-2 text-sm font-semibold text-white"
          >
            + New Campaign
          </Link>
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search campaigns, URLs, keys..."
          className="w-full max-w-md rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
        />
        <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
          <label className="flex items-center gap-2">
            Status:
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-text"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="PAUSED">Paused Only</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            Show:
            <select
              value={showCount}
              onChange={(e) => setShowCount(Number(e.target.value))}
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-text"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={9999}>All</option>
            </select>
          </label>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-text-muted">
              <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort('name')}>
                Campaign Name {sortKey === 'name' && (sortAsc ? '↑' : '↓')}
              </th>
              <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort('mapping_key')}>
                Mapping Key {sortKey === 'mapping_key' && (sortAsc ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3">Rate / Max</th>
              <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort('status')}>
                Status {sortKey === 'status' && (sortAsc ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                  No campaigns found.
                </td>
              </tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id} className="table-row-hover border-b border-border transition-colors last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{c.name}</div>
                  <div className="max-w-xs truncate text-xs text-text-muted">
                    {c.final_destination_url}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-surface-2 px-2 py-1 font-mono text-xs text-cyan-300 ring-1 ring-inset ring-border">
                    {c.mapping_key}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-muted">
                  {c.click_rate_multiplier}x / {c.max_clicks === 0 ? 'Unlimited' : c.max_clicks}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <a
                      href={redirectUrl(c.mapping_key)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-accent/40 px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/10"
                    >
                      Test
                    </a>
                    <Link
                      to={`/campaigns/${c.id}`}
                      className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:border-accent/40 hover:bg-surface-2"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => toggleStatus.mutate(c)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                        c.status === 'ACTIVE'
                          ? 'border-danger/40 text-danger hover:bg-danger/10'
                          : 'border-success/40 text-success hover:bg-success/10'
                      }`}
                    >
                      {c.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
