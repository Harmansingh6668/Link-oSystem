import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { CountrySelect } from '../components/CountrySelect'

export function AdCopyForm() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [url, setUrl] = useState('')
  const [geo, setGeo] = useState<string[]>(['US'])
  const [error, setError] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('ad_copy_tasks')
        .insert({
          user_id: user!.id,
          landing_page_url: url,
          target_geo_countries: geo,
          status: 'PENDING',
        })
        .select('id')
        .single()
      if (error) throw error
      supabase.functions.invoke('generate-ad-copy', { body: { taskId: data.id } }).catch(() => {})
      return data.id as string
    },
    onSuccess: (id) => navigate(`/ad-copy/${id}`),
    onError: (e: Error) => setError(e.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!url.trim()) {
      setError('Landing page URL is required.')
      return
    }
    if (geo.length === 0) {
      setError('Select at least one target geo market.')
      return
    }
    create.mutate()
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <span className="h-6 w-1 rounded-full bg-gradient-to-b from-accent to-violet-500" />
            New Ad Copy Studio Task
          </h1>
          <p className="text-sm text-text-muted">
            Crawl landing page, generate responsive search ads, clusters & extensions
          </p>
        </div>
        <Link
          to="/ad-copy"
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted transition-colors hover:border-accent/40 hover:bg-surface-2"
        >
          Back to Studio
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5 p-6">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">
            Landing Page / Final URL *
          </label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/product-landing-page"
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
          />
          <p className="mt-1 text-xs text-text-muted">
            Our headless crawler will inspect this page to derive thematic keywords, brands, and sales
            hooks.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">
            Target Geo Market *
          </label>
          <CountrySelect value={geo} onChange={setGeo} />
        </div>

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-border pt-5">
          <Link
            to="/ad-copy"
            className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:bg-surface-2"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={create.isPending}
            className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {create.isPending ? 'Starting…' : 'Generate Ad Assets'}
          </button>
        </div>
      </form>
    </div>
  )
}
