import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { AppNotification } from '../lib/types'

export function Notifications() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*, campaign:campaigns(id, name), offer:offers(id, name)')
        .neq('status', 'RESOLVED')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as AppNotification[]
    },
    enabled: !!user,
  })

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'ACKED' | 'RESOLVED' }) => {
      const { error } = await supabase.from('notifications').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const runCheck = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('check-destinations')
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="bg-gradient-to-r from-text to-text/70 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            Notification Center
          </h1>
          <p className="text-sm text-text-muted">Real-time link redirect and offer destination failure alerts</p>
        </div>
        <button
          onClick={() => runCheck.mutate()}
          disabled={runCheck.isPending}
          className="btn-primary rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {runCheck.isPending ? 'Checking…' : '↻ Refresh Alerts'}
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-text-muted">
              <th className="px-4 py-3">Type / Stage</th>
              <th className="px-4 py-3">Campaign / Offer</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">Status</th>
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
            {!isLoading && notifications.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                  No active alerts. All campaigns are delivering normally.
                </td>
              </tr>
            )}
            {notifications.map((n) => (
              <tr key={n.id} className="table-row-hover border-b border-border align-top transition-colors last:border-0">
                <td className="px-4 py-3">
                  <span className="rounded-md bg-danger/10 px-2 py-1 font-mono text-[11px] font-semibold text-danger ring-1 ring-inset ring-danger/30">
                    {n.type}
                    {n.http_status ? ` (HTTP ${n.http_status})` : ''}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">Campaign #{n.campaign?.name ?? n.campaign_id}</div>
                  {n.offer && <div className="text-accent">Offer #{n.offer.name}</div>}
                </td>
                <td className="px-4 py-3 text-text-muted">
                  <div>
                    Campaign failed to reach final destination {n.consecutive_failures} consecutive
                    times.
                  </div>
                  {n.stuck_at_url && (
                    <div className="mt-1 truncate text-xs">
                      <span className="text-warning">Stuck At:</span> {n.stuck_at_url}
                    </div>
                  )}
                  {n.final_url && (
                    <div className="truncate text-xs">
                      <span className="text-text-muted">Final URL:</span> {n.final_url}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                      n.status === 'UNREAD'
                        ? 'bg-danger/10 text-danger ring-danger/30'
                        : 'bg-text-muted/10 text-text-muted ring-text-muted/20'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${n.status === 'UNREAD' ? 'bg-danger' : 'bg-text-muted'}`} />
                    {n.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setStatus.mutate({ id: n.id, status: 'RESOLVED' })}
                      className="rounded-lg border border-success/40 px-2.5 py-1 text-xs font-medium text-success transition-colors hover:bg-success/10"
                    >
                      Resolve
                    </button>
                    {n.status === 'UNREAD' && (
                      <button
                        onClick={() => setStatus.mutate({ id: n.id, status: 'ACKED' })}
                        className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:border-accent/40 hover:bg-surface-2"
                      >
                        Ack
                      </button>
                    )}
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
