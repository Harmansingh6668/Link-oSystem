import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Offer } from '../lib/types'
import { CountrySelect } from '../components/CountrySelect'

export function OfferForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [networkName, setNetworkName] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')
  const [geo, setGeo] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const { data: existing } = useQuery({
    queryKey: ['offer', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('offers').select('*').eq('id', id).single()
      if (error) throw error
      return data as Offer
    },
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing) {
      setName(existing.name)
      setNetworkName(existing.network_name ?? '')
      setTrackingUrl(existing.tracking_destination_url)
      setGeo(existing.geo_countries)
    }
  }, [existing])

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        network_name: networkName || null,
        tracking_destination_url: trackingUrl,
        geo_countries: geo,
      }
      if (isEdit) {
        const { error } = await supabase.from('offers').update(payload).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('offers').insert({ ...payload, user_id: user!.id })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      navigate('/offers')
    },
    onError: (e: Error) => setError(e.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !trackingUrl.trim()) {
      setError('Offer name and tracking destination URL are required.')
      return
    }
    save.mutate()
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <span className="h-6 w-1 rounded-full bg-gradient-to-b from-accent to-violet-500" />
            {isEdit ? 'Edit Offer' : 'Create New Offer'}
          </h1>
          <p className="text-sm text-text-muted">
            {isEdit
              ? 'Update affiliate network and link targeting parameters'
              : 'Register affiliate networks and link targeting parameters'}
          </p>
        </div>
        <Link
          to="/offers"
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted transition-colors hover:border-accent/40 hover:bg-surface-2"
        >
          Back to Offers
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5 p-6">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">
            Offer Name *
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Finance App Install (US/CA)"
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">
            Network Name
          </label>
          <input
            value={networkName}
            onChange={(e) => setNetworkName(e.target.value)}
            placeholder="e.g. CJ, Impact, MaxBounty"
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">
            Tracking Destination URL *
          </label>
          <input
            value={trackingUrl}
            onChange={(e) => setTrackingUrl(e.target.value)}
            placeholder="https://affiliatenetwork.com/track?offer_id=123"
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">
            Geo Targeting Countries
          </label>
          <CountrySelect
            value={geo}
            onChange={setGeo}
            placeholder="Select countries (leave empty for Global/All)..."
          />
        </div>

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-border pt-5">
          <Link
            to="/offers"
            className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:bg-surface-2"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={save.isPending}
            className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {save.isPending ? 'Saving…' : 'Save Offer'}
          </button>
        </div>
      </form>
    </div>
  )
}
