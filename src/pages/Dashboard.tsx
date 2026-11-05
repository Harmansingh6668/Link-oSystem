import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Campaign, ClickLog, Offer } from '../lib/types'
import { StatusBadge } from '../components/StatusBadge'
import { dayRange, todayDateInputValue } from '../lib/dateUtils'
import {
  IconCursorClick,
  IconTarget,
  IconCheckCircle,
  IconGlobe,
  IconCampaign,
  IconOffer,
  IconDevices,
} from '../components/Icons'

const METRIC_STYLES = [
  { icon: IconCursorClick, ring: 'ring-indigo-400/30', bg: 'bg-indigo-400/10', fg: 'text-indigo-300' },
  { icon: IconTarget, ring: 'ring-violet-400/30', bg: 'bg-violet-400/10', fg: 'text-violet-300' },
  { icon: IconCheckCircle, ring: 'ring-emerald-400/30', bg: 'bg-emerald-400/10', fg: 'text-emerald-300' },
  { icon: IconGlobe, ring: 'ring-cyan-400/30', bg: 'bg-cyan-400/10', fg: 'text-cyan-300' },
]

function StatCard({
  label,
  value,
  index,
}: {
  label: string
  value: number | string
  index: number
}) {
  const style = METRIC_STYLES[index % METRIC_STYLES.length]
  return (
    <div className="card flex items-center gap-3 p-3 transition-transform hover:-translate-y-0.5">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.bg} ${style.fg} ring-1 ${style.ring}`}>
        <style.icon width={16} height={16} />
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wide text-text-muted">{label}</div>
        <div className="text-xl font-bold">{value}</div>
      </div>
    </div>
  )
}

export function Dashboard() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [date, setDate] = useState(todayDateInputValue())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED'>('ALL')
  const [showCount, setShowCount] = useState(10)

  const { start, end } = useMemo(() => dayRange(date), [date])
  const isToday = date === todayDateInputValue()

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
      return data as Offer[]
    },
    enabled: !!user,
  })

  const { data: clicks = [], isLoading: clicksLoading } = useQuery({
    queryKey: ['dashboard-clicks', user?.id, date],
    queryFn: async () => {
      const campaignIds = campaigns.map((c) => c.id)
      if (campaignIds.length === 0) return []
      const { data, error } = await supabase
        .from('click_logs')
        .select('*')
        .in('campaign_id', campaignIds)
        .gte('clicked_at', start)
        .lt('clicked_at', end)
      if (error) throw error
      return data as ClickLog[]
    },
    enabled: !!user && campaigns.length > 0,
  })

  const stats = useMemo(() => {
    const totalClicks = clicks.length
    const mainClicks = clicks.filter((c) => c.is_main).length
    const consumed = clicks.filter((c) => c.is_consumed).length
    const googleClicks = clicks.filter((c) => c.is_google).length
    const device: Record<string, number> = {}
    for (const c of clicks) {
      const key = c.device_type ?? 'unknown'
      device[key] = (device[key] ?? 0) + 1
    }
    return { totalClicks, mainClicks, consumed, googleClicks, device }
  }, [clicks])

  const perCampaign = useMemo(() => {
    const map = new Map<string, { total: number; main: number; consumed: number; google: number }>()
    for (const c of clicks) {
      const entry = map.get(c.campaign_id) ?? { total: 0, main: 0, consumed: 0, google: 0 }
      entry.total++
      if (c.is_main) entry.main++
      if (c.is_consumed) entry.consumed++
      if (c.is_google) entry.google++
      map.set(c.campaign_id, entry)
    }
    return map
  }, [clicks])

  const filteredCampaigns = useMemo(() => {
    let rows = campaigns
    if (statusFilter !== 'ALL') rows = rows.filter((c) => c.status === statusFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter((c) => c.name.toLowerCase().includes(q))
    }
    return rows.slice(0, showCount)
  }, [campaigns, statusFilter, search, showCount])

  const refreshAll = useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dashboard-clicks'] })
      await queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      await queryClient.invalidateQueries({ queryKey: ['offers-all'] })
    },
  })

  const activeCampaigns = campaigns.filter((c) => c.status === 'ACTIVE').length
  const activeOffers = offers.filter((o) => o.status === 'ACTIVE').length
  const targetYield = campaigns.reduce(
    (sum, c) => sum + c.click_rate_multiplier * (c.max_clicks || 1),
    0,
  )
  const fulfillment = targetYield > 0 ? Math.min(100, (stats.mainClicks / targetYield) * 100) : 0

  const deviceOrder = ['desktop', 'mobile', 'tablet']
  const deviceTotal = Object.values(stats.device).reduce((a, b) => a + b, 0)

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="bg-gradient-to-r from-text to-text/70 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            Dashboard Overview
          </h1>
          <p className="text-sm text-text-muted">Live advertising metrics & campaign delivery status</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-text-muted">
            Date:
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-text"
            />
          </label>
          {isToday && (
            <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success ring-1 ring-inset ring-success/30">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
              LIVE TODAY
            </span>
          )}
          <button
            onClick={() => refreshAll.mutate()}
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

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card p-4 md:col-span-1">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold">Traffic Analytics</span>
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent ring-1 ring-inset ring-accent/30">
              {stats.totalClicks > 0 ? ((stats.consumed / stats.totalClicks) * 100).toFixed(1) : '0.0'}%
              Delivery
            </span>
          </div>
          <p className="mb-3 text-xs text-text-muted">Performance & Conversion Rate</p>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total Clicks" value={stats.totalClicks} index={0} />
            <StatCard label="Main Clicks" value={stats.mainClicks} index={1} />
            <StatCard label="Consumed" value={stats.consumed} index={2} />
            <StatCard label="Google Clicks" value={stats.googleClicks} index={3} />
          </div>
        </div>

        <div className="card relative overflow-hidden p-4">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-accent/20 to-cyan-400/20 blur-2xl" />
          <div className="relative mb-2 flex items-center justify-between">
            <span className="font-semibold">Active Traffic Rate</span>
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success ring-1 ring-inset ring-success/30">
              +{stats.googleClicks}
            </span>
          </div>
          <div className="relative bg-gradient-to-r from-accent to-cyan-400 bg-clip-text text-4xl font-extrabold text-transparent">
            {stats.googleClicks}
          </div>
          <p className="relative mt-1 text-xs text-text-muted">
            Total Delivered Google Clicks {isToday ? 'Today' : 'on ' + date}
          </p>
        </div>

        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold">
              <IconCampaign width={15} height={15} className="text-accent" />
              Campaign Portfolio
            </span>
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent ring-1 ring-inset ring-accent/30">
              {activeCampaigns} Active
            </span>
          </div>
          <div className="text-2xl font-bold">{campaigns.length} Campaigns</div>
          <p className="mb-3 text-xs text-text-muted">
            {campaigns.length - activeCampaigns} paused • monitored endpoints
          </p>
          <div className="mb-1 flex justify-between text-xs text-text-muted">
            <span>Fulfillment Progress</span>
            <span className="font-semibold text-text">{fulfillment.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-violet-500 transition-all"
              style={{ width: `${fulfillment}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-text-muted">
            <span>Target Click Yield</span>
            <span>{targetYield > 0 ? '100% Target' : '—'}</span>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
              <IconOffer width={13} height={13} className="text-amber-400" />
              Linked Offers Inventory
            </span>
            <span className="rounded-full bg-amber-400/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300 ring-1 ring-inset ring-amber-400/30">
              {activeOffers} Active
            </span>
          </div>
          <div className="text-2xl font-bold">{offers.length} Offers</div>
          <p className="mb-3 text-xs text-text-muted">
            Affiliate network endpoints available for traffic distribution
          </p>
          <div className="flex gap-2">
            <Link
              to="/offers"
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-accent/40 hover:bg-surface-2 hover:text-text"
            >
              View All Offers →
            </Link>
            <Link
              to="/offers/new"
              className="btn-primary rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
            >
              + Add Offer
            </Link>
          </div>
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
              <IconDevices width={13} height={13} className="text-cyan-400" />
              Device Breakdown
            </span>
            <span className="text-xs text-text-muted">{deviceTotal} Clicks</span>
          </div>
          <div className="space-y-3 text-sm">
            {deviceOrder.map((d) => {
              const n = stats.device[d] ?? 0
              const pct = deviceTotal > 0 ? (n / deviceTotal) * 100 : 0
              return (
                <div key={d}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="capitalize">{d}</span>
                    <span className="text-text-muted">
                      {n} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-accent"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
              <IconGlobe width={13} height={13} className="text-emerald-400" />
              Top Geo Delivery
            </span>
            <span className="text-xs text-text-muted">{stats.totalClicks} Clicks</span>
          </div>
          {clicks.filter((c) => c.country).length === 0 ? (
            <p className="text-sm text-text-muted">No geographic data recorded for this date.</p>
          ) : (
            <div className="space-y-1 text-sm">
              {Object.entries(
                clicks.reduce<Record<string, number>>((acc, c) => {
                  if (c.country) acc[c.country] = (acc[c.country] ?? 0) + 1
                  return acc
                }, {}),
              )
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([country, n]) => (
                  <div key={country} className="flex justify-between">
                    <span>{country}</span>
                    <span className="text-text-muted">{n}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between gap-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search campaigns..."
          className="w-full max-w-md rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
        />
        <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
          <label className="flex items-center gap-2">
            Status:
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'PAUSED')}
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
              <th className="px-4 py-3">Campaign</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Total Clicks</th>
              <th className="px-4 py-3">Main Clicks</th>
              <th className="px-4 py-3">Consumed</th>
              <th className="px-4 py-3">Google Clicks</th>
              <th className="px-4 py-3">Delivery Rate</th>
            </tr>
          </thead>
          <tbody>
            {clicksLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!clicksLoading && filteredCampaigns.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-text-muted">
                  No campaigns found.
                </td>
              </tr>
            )}
            {filteredCampaigns.map((c) => {
              const s = perCampaign.get(c.id) ?? { total: 0, main: 0, consumed: 0, google: 0 }
              const rate = s.total > 0 ? ((s.consumed / s.total) * 100).toFixed(1) : '0.0'
              return (
                <tr key={c.id} className="table-row-hover border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3">{s.total}</td>
                  <td className="px-4 py-3">{s.main}</td>
                  <td className="px-4 py-3">{s.consumed}</td>
                  <td className="px-4 py-3">
                    <Link to="/click-logs" className="font-semibold text-accent hover:underline">
                      {s.google}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{rate}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
