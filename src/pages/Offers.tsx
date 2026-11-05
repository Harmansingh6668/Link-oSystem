import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Offer } from '../lib/types'
import { StatusBadge } from '../components/StatusBadge'

type SortKey = 'name' | 'network_name' | 'status'
type StatusFilter = 'ALL' | 'ACTIVE' | 'PAUSED'

export function Offers() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [showCount, setShowCount] = useState(10)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortAsc, setSortAsc] = useState(true)

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ['offers', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .order('name', { ascending: true })
      if (error) throw error
      return data as Offer[]
    },
    enabled: !!user,
  })

  const toggleStatus = useMutation({
    mutationFn: async (offer: Offer) => {
      const next = offer.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
      const { error } = await supabase.from('offers').update({ status: next }).eq('id', offer.id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['offers'] }),
  })

  const duplicate = useMutation({
    mutationFn: async (offer: Offer) => {
      const { error } = await supabase.from('offers').insert({
        user_id: offer.user_id,
        name: `${offer.name} (copy)`,
        network_name: offer.network_name,
        tracking_destination_url: offer.tracking_destination_url,
        geo_countries: offer.geo_countries,
        status: offer.status,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['offers'] }),
  })

  const filtered = useMemo(() => {
    let rows = offers
    if (statusFilter !== 'ALL') rows = rows.filter((o) => o.status === statusFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          (o.network_name ?? '').toLowerCase().includes(q) ||
          o.tracking_destination_url.toLowerCase().includes(q) ||
          o.geo_countries.some((c) => c.toLowerCase().includes(q)),
      )
    }
    rows = [...rows].sort((a, b) => {
      const av = (a[sortKey] ?? '').toString().toLowerCase()
      const bv = (b[sortKey] ?? '').toString().toLowerCase()
      const cmp = av.localeCompare(bv)
      return sortAsc ? cmp : -cmp
    })
    return rows.slice(0, showCount)
  }, [offers, statusFilter, search, sortKey, sortAsc, showCount])

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
            Offers
          </h1>
          <p className="text-sm text-text-muted">
            Manage affiliate networks, tracking destinations, and geo targeting rules
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['offers'] })}
            className="rounded-lg border border-border px-3 py-2 text-sm text-text-muted transition-colors hover:border-accent/40 hover:bg-surface-2 hover:text-text"
          >
            ↻ Sync
          </button>
          <Link
            to="/offers/new"
            className="btn-primary rounded-lg px-3 py-2 text-sm font-semibold text-white"
          >
            + New Offer
          </Link>
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search offers, networks, URLs, geos..."
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
                Offer Name {sortKey === 'name' && (sortAsc ? '↑' : '↓')}
              </th>
              <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort('network_name')}>
                Network {sortKey === 'network_name' && (sortAsc ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3">Geo Targeting</th>
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
                  No offers found.
                </td>
              </tr>
            )}
            {filtered.map((offer) => (
              <tr key={offer.id} className="table-row-hover border-b border-border transition-colors last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{offer.name}</div>
                  <div className="max-w-xs truncate text-xs text-text-muted">
                    {offer.tracking_destination_url}
                  </div>
                </td>
                <td className="px-4 py-3 text-text-muted">{offer.network_name || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {offer.geo_countries.length === 0 ? (
                      <span className="text-text-muted">Global</span>
                    ) : (
                      offer.geo_countries.map((c) => (
                        <span
                          key={c}
                          className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-text-muted ring-1 ring-inset ring-border"
                        >
                          {c}
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={offer.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => duplicate.mutate(offer)}
                      className="rounded-lg border border-accent/40 px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/10"
                    >
                      Duplicate
                    </button>
                    <Link
                      to={`/offers/${offer.id}`}
                      className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:border-accent/40 hover:bg-surface-2"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => toggleStatus.mutate(offer)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                        offer.status === 'ACTIVE'
                          ? 'border-danger/40 text-danger hover:bg-danger/10'
                          : 'border-success/40 text-success hover:bg-success/10'
                      }`}
                    >
                      {offer.status === 'ACTIVE' ? 'Pause' : 'Activate'}
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
