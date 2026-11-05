import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { AdCopyTask } from '../lib/types'

export function AdCopyDetail() {
  const { id } = useParams()
  const queryClient = useQueryClient()

  const { data: task, isLoading } = useQuery({
    queryKey: ['ad-copy-task', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('ad_copy_tasks').select('*').eq('id', id).single()
      if (error) throw error
      return data as AdCopyTask
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'PENDING' || status === 'CRAWLING' || status === 'GENERATING' ? 2000 : false
    },
  })

  const retry = useMutation({
    mutationFn: async () => {
      await supabase.from('ad_copy_tasks').update({ status: 'PENDING', error_message: null }).eq('id', id)
      const { error } = await supabase.functions.invoke('generate-ad-copy', { body: { taskId: id } })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ad-copy-task', id] }),
  })

  if (isLoading || !task) {
    return <div className="text-text-muted">Loading…</div>
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <span className="h-6 w-1 rounded-full bg-gradient-to-b from-accent to-violet-500" />
            Ad Copy Task
          </h1>
          <p className="text-sm text-text-muted">{task.landing_page_url}</p>
        </div>
        <Link
          to="/ad-copy"
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted transition-colors hover:border-accent/40 hover:bg-surface-2"
        >
          Back to Studio
        </Link>
      </div>

      <div className="card p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="text-sm text-text-muted">Status:</span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
              task.status === 'DONE'
                ? 'bg-success/10 text-success ring-success/30'
                : task.status === 'FAILED'
                  ? 'bg-danger/10 text-danger ring-danger/30'
                  : 'bg-accent/10 text-accent ring-accent/30'
            }`}
          >
            {task.status}
          </span>
          {(task.status === 'FAILED' || task.status === 'PENDING') && (
            <button
              onClick={() => retry.mutate()}
              disabled={retry.isPending}
              className="btn-primary ml-auto rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              {retry.isPending ? 'Running…' : 'Run Generation'}
            </button>
          )}
        </div>

        {task.status === 'FAILED' && task.error_message && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            {task.error_message}
          </div>
        )}

        {(task.status === 'CRAWLING' || task.status === 'GENERATING') && (
          <p className="text-sm text-text-muted">
            {task.status === 'CRAWLING' ? 'Crawling landing page…' : 'Generating ad copy…'}
          </p>
        )}

        {task.status === 'DONE' && task.result && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-accent">
                <span className="h-1 w-4 rounded-full bg-accent" />
                Headlines
              </h3>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {task.result.headlines.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cyan-400">
                <span className="h-1 w-4 rounded-full bg-cyan-400" />
                Descriptions
              </h3>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {task.result.descriptions.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-400">
                <span className="h-1 w-4 rounded-full bg-violet-400" />
                Keyword Clusters
              </h3>
              <div className="flex flex-wrap gap-2">
                {task.result.keyword_clusters.map((k, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-gradient-to-r from-violet-400/15 to-accent/15 px-3 py-1 text-xs font-medium ring-1 ring-inset ring-violet-400/30"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-400">
                <span className="h-1 w-4 rounded-full bg-emerald-400" />
                Extensions
              </h3>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {task.result.extensions.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
