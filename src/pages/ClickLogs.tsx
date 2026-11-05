import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Campaign, ClickLog } from '../lib/types'
import { daysAgoInputValue, todayDateInputValue } from '../lib/dateUtils'

function clickType(c: ClickLog): string {
  if (c.is_consumed) return 'CONSUMED'
  if (c.is_main) return 'MAIN'
  return 'FILTERED'
}

export function ClickLogs() {
  const { user } = useAuth()
  const [start, setStart] = useState(daysAgoInputValue(6))
  const [end, setEnd] = useState(todayDateInputValue())
  const [campaignFilter, setCampaignFilter] = useState('')
  const [viewLimit, setViewLimit] = useState(5000)
  const [sortAsc, setSortAsc] = useState(false)
  const [rowFilter, setRowFilter] = useState('')
  const [hasRun, setHasRun] = useState(false)

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('campaigns').select('*').order('name')
      if (error) throw error
      return data as Campaign[]
    },
    enabled: !!user,
  })

  const { data: offers = [] } = useQuery({
    queryKey: ['offers-all', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('offers').select('*')
      if (error) throw error
      return data
    },
    enabled: !!user,
  })

  const { data: logs = [], isFetching, refetch } = useQuery({
    queryKey: ['click-logs-explorer', user?.id, start, end, campaignFilter, viewLimit, sortAsc],
    queryFn: async () => {
      const campaignIds = campaignFilter ? [campaignFilter] : campaigns.map((c) => c.id)
      if (campaignIds.length === 0) return []
      const fromIso = new Date(`${start}T00:00:00.000Z`).toISOString()
      const toDate = new Date(`${end}T00:00:00.000Z`)
      toDate.setUTCDate(toDate.getUTCDate() + 1)
      const { data, error } = await supabase
        .from('click_logs')
        .select('*')
        .in('campaign_id', campaignIds)
        .gte('clicked_at', fromIso)
        .lt('clicked_at', toDate.toISOString())
        .order('clicked_at', { ascending: sortAsc })
        .limit(viewLimit)
      if (error) throw error
      return data as ClickLog[]
    },
    enabled: false,
  })

  const campaignById = useMemo(() => new Map(campaigns.map((c) => [c.id, c])), [campaigns])
  const offerById = useMemo(
    () => new Map((offers as { id: string; name: string }[]).map((o) => [o.id, o])),
    [offers],
  )

  const filteredLogs = useMemo(() => {
    if (!rowFilter.trim()) return logs
    const q = rowFilter.trim().toLowerCase()
    return logs.filter((l) => {
      const campaign = campaignById.get(l.campaign_id)
      const offer = l.offer_id ? offerById.get(l.offer_id) : null
      return (
        campaign?.name.toLowerCase().includes(q) ||
        offer?.name.toLowerCase().includes(q) ||
        (l.destination_url ?? '').toLowerCase().includes(q)
      )
    })
  }, [logs, rowFilter, campaignById, offerById])

  const applyPreset = (preset: 'today' | 'yesterday' | '7d' | '14d' | '30d') => {
    const today = todayDateInputValue()
    if (preset === 'today') {
      setStart(today)
      setEnd(today)
    } else if (preset === 'yesterday') {
      const y = daysAgoInputValue(1)
      setStart(y)
      setEnd(y)
    } else if (preset === '7d') {
      setStart(daysAgoInputValue(6))
      setEnd(today)
    } else if (preset === '14d') {
      setStart(daysAgoInputValue(13))
      setEnd(today)
    } else if (preset === '30d') {
      setStart(daysAgoInputValue(29))
      setEnd(today)
    }
  }

  const run = () => {
    setHasRun(true)
    refetch()
  }

  const downloadCsv = () => {
    const header = ['clicked_at', 'campaign', 'offer', 'type', 'device_type', 'country', 'referrer', 'destination_url']
    const lines = [header.join(',')]
    for (const l of filteredLogs) {
      const campaign = campaignById.get(l.campaign_id)
      const offer = l.offer_id ? offerById.get(l.offer_id) : null
      lines.push(
        [
          l.clicked_at,
          campaign?.name ?? '',
          offer?.name ?? '',
          clickType(l),
          l.device_type ?? '',
          l.country ?? '',
          l.referrer ?? '',
          l.destination_url ?? '',
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(','),
      )
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `click-logs-${start}-to-${end}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="card mb-4 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="bg-gradient-to-r from-text to-text/70 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
              Click Logs Explorer
            </h1>
            <p className="text-sm text-text-muted">
              View Top 5,000 real-time clicks or export up to 100K raw redirect records into CSV.
            </p>
          </div>
          <div className="flex gap-1">
            {(['today', 'yesterday', '7d', '14d', '30d'] as const).map((p) => (
              <button
                key={p}
                onClick={() => applyPreset(p)}
                className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:border-accent/40 hover:bg-surface-2 hover:text-text"
              >
                {p === 'today'
                  ? 'Today'
                  : p === 'yesterday'
                    ? 'Yesterday'
                    : p === '7d'
                      ? 'Last 7 Days'
                      : p === '14d'
                        ? 'Last 14 Days'
                        : 'Last 30 Days'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-text-muted">
            Start Date
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="mt-1 block rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-text"
            />
          </label>
          <label className="text-sm text-text-muted">
            End Date
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="mt-1 block rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-text"
            />
          </label>
          <label className="text-sm text-text-muted">
            Optional Filter: Campaign
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="mt-1 block rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-text"
            >
              <option value="">All Campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-text-muted">
            View Limit
            <select
              value={viewLimit}
              onChange={(e) => setViewLimit(Number(e.target.value))}
              className="mt-1 block rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-text"
            >
              <option value={1000}>Top 1,000</option>
              <option value={5000}>Top 5,000 (Maximum)</option>
            </select>
          </label>
          <label className="text-sm text-text-muted">
            Sort Order
            <select
              value={sortAsc ? 'asc' : 'desc'}
              onChange={(e) => setSortAsc(e.target.value === 'asc')}
              className="mt-1 block rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-text"
            >
              <option value="asc">Ascending (Oldest First)</option>
              <option value="desc">Descending (Newest First)</option>
            </select>
          </label>
          <button
            onClick={run}
            className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold text-white"
          >
            🔍 View Top {viewLimit >= 5000 ? '5,000' : viewLimit.toLocaleString()}
          </button>
          <button
            onClick={downloadCsv}
            disabled={filteredLogs.length === 0}
            className="rounded-lg border border-success/40 px-4 py-2 text-sm font-semibold text-success transition-colors hover:bg-success/10 disabled:opacity-50"
          >
            ⬇ Download CSV (Max 100K)
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-semibold">Results ({filteredLogs.length})</span>
          <input
            value={rowFilter}
            onChange={(e) => setRowFilter(e.target.value)}
            placeholder="Filter rows by campaign, offer, url..."
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm outline-none transition-colors focus:border-accent sm:w-72"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-text-muted">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Click Date</th>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Offer</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Destination URL</th>
              </tr>
            </thead>
            <tbody>
              {!hasRun && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-text-muted">
                    Click "View Top {viewLimit >= 5000 ? '5,000' : viewLimit}" to load results.
                  </td>
                </tr>
              )}
              {hasRun && isFetching && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-text-muted">
                    Loading…
                  </td>
                </tr>
              )}
              {hasRun && !isFetching && filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-text-muted">
                    No click logs found for the selected filters.
                  </td>
                </tr>
              )}
              {hasRun &&
                !isFetching &&
                filteredLogs.map((l, i) => (
                  <tr key={l.id} className="table-row-hover border-b border-border transition-colors last:border-0">
                    <td className="px-4 py-3 text-text-muted">{i + 1}</td>
                    <td className="px-4 py-3">{new Date(l.clicked_at).toLocaleString()}</td>
                    <td className="px-4 py-3">{campaignById.get(l.campaign_id)?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      {l.offer_id ? (offerById.get(l.offer_id)?.name ?? '—') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                          clickType(l) === 'CONSUMED'
                            ? 'bg-success/10 text-success ring-success/30'
                            : clickType(l) === 'MAIN'
                              ? 'bg-accent/10 text-accent ring-accent/30'
                              : 'bg-text-muted/10 text-text-muted ring-text-muted/20'
                        }`}
                      >
                        {clickType(l)}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize">{l.device_type ?? '—'}</td>
                    <td className="px-4 py-3">{l.country ?? '—'}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-text-muted">
                      {l.destination_url ?? '—'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
