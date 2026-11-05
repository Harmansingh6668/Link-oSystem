import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Campaign, ClickLog } from '../lib/types'
import { StatusBadge } from '../components/StatusBadge'
import { daysAgoInputValue, todayDateInputValue } from '../lib/dateUtils'

type Tab = 'summary' | 'device' | 'geo'

function toCsv(rows: ClickLog[]): string {
  const header = [
    'clicked_at',
    'campaign_id',
    'offer_id',
    'is_main',
    'is_consumed',
    'is_google',
    'device_type',
    'country',
    'referrer',
    'destination_url',
  ]
  const lines = [header.join(',')]
  for (const r of rows) {
    lines.push(
      header
        .map((h) => {
          const v = (r as unknown as Record<string, unknown>)[h]
          const s = v == null ? '' : String(v)
          return `"${s.replace(/"/g, '""')}"`
        })
        .join(','),
    )
  }
  return lines.join('\n')
}

export function Reports() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [from, setFrom] = useState(daysAgoInputValue(6))
  const [to, setTo] = useState(todayDateInputValue())
  const [tab, setTab] = useState<Tab>('summary')

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('campaigns').select('*').order('name')
      if (error) throw error
      return data as Campaign[]
    },
    enabled: !!user,
  })

  const { data: clicks = [], isLoading } = useQuery({
    queryKey: ['reports-clicks', user?.id, from, to, campaigns.map((c) => c.id).join(',')],
    queryFn: async () => {
      const campaignIds = campaigns.map((c) => c.id)
      if (campaignIds.length === 0) return []
      const fromIso = new Date(`${from}T00:00:00.000Z`).toISOString()
      const toDate = new Date(`${to}T00:00:00.000Z`)
      toDate.setUTCDate(toDate.getUTCDate() + 1)
      const { data, error } = await supabase
        .from('click_logs')
        .select('*')
        .in('campaign_id', campaignIds)
        .gte('clicked_at', fromIso)
        .lt('clicked_at', toDate.toISOString())
      if (error) throw error
      return data as ClickLog[]
    },
    enabled: !!user && campaigns.length > 0,
  })

  const campaignById = useMemo(() => new Map(campaigns.map((c) => [c.id, c])), [campaigns])

  const totals = useMemo(() => {
    return {
      total: clicks.length,
      main: clicks.filter((c) => c.is_main).length,
      consumed: clicks.filter((c) => c.is_consumed).length,
      google: clicks.filter((c) => c.is_google).length,
    }
  }, [clicks])

  const byCampaign = useMemo(() => {
    const map = new Map<string, { total: number; main: number; consumed: number; google: number }>()
    for (const c of clicks) {
      const entry = map.get(c.campaign_id) ?? { total: 0, main: 0, consumed: 0, google: 0 }
      entry.total++
      if (c.is_main) entry.main++
      if (c.is_consumed) entry.consumed++
      if (c.is_google) entry.google++
      map.set(c.campaign_id, entry)
    }
    return Array.from(map.entries())
      .map(([campaignId, stats]) => ({ campaign: campaignById.get(campaignId), ...stats }))
      .filter((r) => r.campaign)
      .sort((a, b) => b.google - a.google)
  }, [clicks, campaignById])

  const byCampaignDevice = useMemo(() => {
    const map = new Map<string, Record<string, number>>()
    for (const c of clicks) {
      const key = c.campaign_id
      const device = c.device_type ?? 'unknown'
      const entry = map.get(key) ?? {}
      entry[device] = (entry[device] ?? 0) + 1
      map.set(key, entry)
    }
    const rows: { campaign: Campaign; device: string; clicks: number }[] = []
    for (const [campaignId, devices] of map.entries()) {
      const campaign = campaignById.get(campaignId)
      if (!campaign) continue
      for (const [device, n] of Object.entries(devices)) {
        rows.push({ campaign, device, clicks: n })
      }
    }
    return rows.sort((a, b) => b.clicks - a.clicks)
  }, [clicks, campaignById])

  const byCampaignGeo = useMemo(() => {
    const map = new Map<string, Record<string, number>>()
    for (const c of clicks) {
      if (!c.country) continue
      const entry = map.get(c.campaign_id) ?? {}
      entry[c.country] = (entry[c.country] ?? 0) + 1
      map.set(c.campaign_id, entry)
    }
    const rows: { campaign: Campaign; country: string; clicks: number }[] = []
    for (const [campaignId, geos] of map.entries()) {
      const campaign = campaignById.get(campaignId)
      if (!campaign) continue
      for (const [country, n] of Object.entries(geos)) {
        rows.push({ campaign, country, clicks: n })
      }
    }
    return rows.sort((a, b) => b.clicks - a.clicks)
  }, [clicks, campaignById])

  const exportCsv = () => {
    const csv = toCsv(clicks)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${from}-to-${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="bg-gradient-to-r from-text to-text/70 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            Reports & Analytics
          </h1>
          <p className="text-sm text-text-muted">
            Detailed traffic logs and dimensions (max 45d past lookback, up to 31d per query)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            className="rounded-lg border border-border px-3 py-2 text-sm text-text-muted transition-colors hover:border-accent/40 hover:bg-surface-2 hover:text-text"
          >
            📤 Export CSV
          </button>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['reports-clicks'] })}
            className="btn-primary rounded-lg px-3 py-2 text-sm font-semibold text-white"
          >
            ↻ Update Data
          </button>
        </div>
      </div>

      <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
        <label className="flex items-center gap-2 text-sm text-text-muted">
          From:
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-text"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          To:
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-text"
          />
        </label>
        <div className="ml-auto flex gap-1 rounded-lg bg-surface-2 p-1">
          {(['summary', 'device', 'geo'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-all ${
                tab === t
                  ? 'bg-gradient-to-r from-accent to-violet-500 text-white shadow-[0_2px_10px_-2px_rgba(99,102,241,0.6)]'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatBox label="Total Inbound Clicks" value={totals.total} accent="from-indigo-400 to-accent" />
        <StatBox label="Main Clicks Target" value={totals.main} accent="from-violet-400 to-fuchsia-400" />
        <StatBox label="Consumed Clicks" value={totals.consumed} accent="from-emerald-400 to-teal-400" />
        <StatBox label="Google Ads Delivered" value={totals.google} accent="from-cyan-400 to-accent" />
      </div>

      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="px-4 py-6 text-center text-text-muted">Loading…</div>
        ) : tab === 'summary' ? (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-text-muted">
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Total Clicks</th>
                <th className="px-4 py-3">Main Clicks</th>
                <th className="px-4 py-3">Consumed</th>
                <th className="px-4 py-3">Google Clicks</th>
              </tr>
            </thead>
            <tbody>
              {byCampaign.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-text-muted">
                    No click data found between {from} and {to}.
                  </td>
                </tr>
              )}
              {byCampaign.map((row) => (
                <tr key={row.campaign!.id} className="table-row-hover border-b border-border transition-colors last:border-0">
                  <td className="px-4 py-3 font-medium">{row.campaign!.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.campaign!.status} />
                  </td>
                  <td className="px-4 py-3">{row.total}</td>
                  <td className="px-4 py-3">{row.main}</td>
                  <td className="px-4 py-3">{row.consumed}</td>
                  <td className="px-4 py-3">{row.google}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : tab === 'device' ? (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-text-muted">
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Device Type</th>
                <th className="px-4 py-3">Impressions</th>
                <th className="px-4 py-3">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {byCampaignDevice.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-text-muted">
                    No device logs found between {from} and {to}.
                  </td>
                </tr>
              )}
              {byCampaignDevice.map((row, i) => (
                <tr key={i} className="table-row-hover border-b border-border transition-colors last:border-0">
                  <td className="px-4 py-3 font-medium">{row.campaign.name}</td>
                  <td className="px-4 py-3 capitalize">{row.device}</td>
                  <td className="px-4 py-3">{row.clicks}</td>
                  <td className="px-4 py-3">{row.clicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-text-muted">
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Country / Region</th>
                <th className="px-4 py-3">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {byCampaignGeo.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-text-muted">
                    No geographic click data found between {from} and {to}.
                  </td>
                </tr>
              )}
              {byCampaignGeo.map((row, i) => (
                <tr key={i} className="table-row-hover border-b border-border transition-colors last:border-0">
                  <td className="px-4 py-3 font-medium">{row.campaign.name}</td>
                  <td className="px-4 py-3">{row.country}</td>
                  <td className="px-4 py-3">{row.clicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function StatBox({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="card relative overflow-hidden p-4">
      <div className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${accent}`} />
      <div className="text-xs uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  )
}
