import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { IntegrationSettings } from '../lib/types'

export function Settings() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [aiProvider, setAiProvider] = useState<'claude' | 'openai'>('claude')

  const { data: settings, isLoading } = useQuery({
    queryKey: ['integration-settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_settings')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle()
      if (error) throw error
      return data as IntegrationSettings | null
    },
    enabled: !!user,
  })

  useEffect(() => {
    if (settings) setAiProvider(settings.ai_provider)
  }, [settings])

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('integration_settings')
        .upsert({ user_id: user!.id, ai_provider: aiProvider }, { onConflict: 'user_id' })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integration-settings'] }),
  })

  if (isLoading) return <div className="text-text-muted">Loading…</div>

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="bg-gradient-to-r from-text to-text/70 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
          Settings
        </h1>
        <p className="text-sm text-text-muted">
          Integration configuration for Google Ads and AI-powered Ad Copy Studio
        </p>
      </div>

      <div className="card relative overflow-hidden p-6">
        <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-emerald-400/15 to-cyan-400/15 blur-2xl" />
        <h2 className="relative mb-1 flex items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300 ring-1 ring-inset ring-emerald-400/30">
            G
          </span>
          Google Ads Integration
        </h2>
        <p className="relative mb-4 text-sm text-text-muted">
          MCC ID and Customer Account ID are stored per-campaign (see Campaigns → Edit). "Google Clicks
          Delivered" is currently computed from your own redirect/click-tracking data, not a live Google
          Ads API pull.
        </p>
        <div className="relative flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              settings?.google_ads_connected ? 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-text-muted'
            }`}
          />
          <span className="text-sm">
            {settings?.google_ads_connected ? 'Connected' : 'Not connected — manual data only'}
          </span>
        </div>
        <p className="relative mt-3 text-xs text-text-muted">
          To enable live Google Ads API data in the future: create a Google Ads API OAuth client, add{' '}
          <code className="rounded-md bg-surface-2 px-1.5 py-0.5 text-accent">GOOGLE_ADS_CLIENT_ID</code>,{' '}
          <code className="rounded-md bg-surface-2 px-1.5 py-0.5 text-accent">GOOGLE_ADS_CLIENT_SECRET</code>, and{' '}
          <code className="rounded-md bg-surface-2 px-1.5 py-0.5 text-accent">GOOGLE_ADS_DEVELOPER_TOKEN</code> as
          Edge Function secrets in your Supabase project (Edge Functions → Secrets), then this flag can be
          wired to a real sync job.
        </p>
      </div>

      <div className="card relative overflow-hidden p-6">
        <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-accent/20 to-violet-400/15 blur-2xl" />
        <h2 className="relative mb-1 flex items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-inset ring-accent/30">
            ✨
          </span>
          Ad Copy Studio — AI Provider
        </h2>
        <p className="relative mb-4 text-sm text-text-muted">
          Choose which AI provider generates headlines, descriptions, and keyword clusters.
        </p>
        <div className="relative mb-4 flex gap-3">
          {(['claude', 'openai'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setAiProvider(p)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-all ${
                aiProvider === p
                  ? 'border-accent/50 bg-gradient-to-r from-accent/15 to-violet-500/15 text-accent ring-1 ring-inset ring-accent/30'
                  : 'border-border text-text-muted hover:bg-surface-2'
              }`}
            >
              {p === 'claude' ? 'Claude (Anthropic)' : 'OpenAI (GPT)'}
            </button>
          ))}
        </div>
        <p className="relative mb-4 text-xs text-text-muted">
          API keys are never entered here or stored in the database. Add{' '}
          <code className="rounded-md bg-surface-2 px-1.5 py-0.5 text-accent">ANTHROPIC_API_KEY</code> (for
          Claude) or <code className="rounded-md bg-surface-2 px-1.5 py-0.5 text-accent">OPENAI_API_KEY</code>{' '}
          (for OpenAI) as an Edge Function secret in your Supabase dashboard: Edge Functions → Secrets.
          Until a key is configured, generation tasks will fail with a clear error instead of returning
          fake results.
        </p>
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="btn-primary relative rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {save.isPending ? 'Saving…' : 'Save Provider'}
        </button>
      </div>
    </div>
  )
}
