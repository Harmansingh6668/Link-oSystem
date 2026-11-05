import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { AdCopyTask } from '../lib/types'

function StatusPill({ status }: { status: AdCopyTask['status'] }) {
  const styles: Record<AdCopyTask['status'], string> = {
    PENDING: 'bg-text-muted/10 text-text-muted ring-text-muted/20',
    CRAWLING: 'bg-accent/10 text-accent ring-accent/30',
    GENERATING: 'bg-accent/10 text-accent ring-accent/30',
    DONE: 'bg-success/10 text-success ring-success/30',
    FAILED: 'bg-danger/10 text-danger ring-danger/30',
  }
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[status]}`}>
      {status}
    </span>
  )
}

export function AdCopyStudio() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['ad-copy-tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_copy_tasks')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as AdCopyTask[]
    },
    enabled: !!user,
  })

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 bg-gradient-to-r from-text to-text/70 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            ✨ Ad Copy Studio
          </h1>
          <p className="text-sm text-text-muted">
            AI-powered Google Ads copy, dynamic keywords, extensions, and Quality Score analysis
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['ad-copy-tasks'] })}
            className="rounded-lg border border-border px-3 py-2 text-sm text-text-muted transition-colors hover:border-accent/40 hover:bg-surface-2 hover:text-text"
          >
            ↻ Refresh
          </button>
          <Link
            to="/ad-copy/new"
            className="btn-primary rounded-lg px-3 py-2 text-sm font-semibold text-white"
          >
            + Generate Ad Copy
          </Link>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-text-muted">
              <th className="px-4 py-3">Destination URL</th>
              <th className="px-4 py-3">Geo Target</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created At</th>
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
            {!isLoading && tasks.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                  No generation tasks found. Click "+ Generate Ad Copy" to create one.
                </td>
              </tr>
            )}
            {tasks.map((t) => (
              <tr key={t.id} className="table-row-hover border-b border-border transition-colors last:border-0">
                <td className="max-w-xs truncate px-4 py-3">{t.landing_page_url}</td>
                <td className="px-4 py-3 text-text-muted">
                  {t.target_geo_countries.join(', ') || 'Global'}
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={t.status} />
                </td>
                <td className="px-4 py-3 text-text-muted">
                  {new Date(t.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/ad-copy/${t.id}`}
                    className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:border-accent/40 hover:bg-surface-2"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
