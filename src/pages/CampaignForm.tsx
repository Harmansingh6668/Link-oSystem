import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Campaign, CampaignOffer, Offer } from '../lib/types'
import { CountrySelect } from '../components/CountrySelect'

interface SelectedOffer {
  offer_id: string
  weight: number
}

export function CampaignForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [finalUrl, setFinalUrl] = useState('')
  const [clickRate, setClickRate] = useState(1)
  const [maxClicks, setMaxClicks] = useState(0)
  const [mccId, setMccId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [geo, setGeo] = useState<string[]>([])
  const [referrers, setReferrers] = useState('')
  const [status, setStatus] = useState<'ACTIVE' | 'PAUSED'>('ACTIVE')
  const [selectedOffers, setSelectedOffers] = useState<SelectedOffer[]>([])
  const [offerSearch, setOfferSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: offers = [] } = useQuery({
    queryKey: ['offers-all', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('offers').select('*').order('name')
      if (error) throw error
      return data as Offer[]
    },
    enabled: !!user,
  })

  const { data: existing } = useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('campaigns').select('*').eq('id', id).single()
      if (error) throw error
      return data as Campaign
    },
    enabled: isEdit,
  })

  const { data: existingOffers } = useQuery({
    queryKey: ['campaign-offers', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_offers')
        .select('*')
        .eq('campaign_id', id)
      if (error) throw error
      return data as CampaignOffer[]
    },
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing) {
      setName(existing.name)
      setFinalUrl(existing.final_destination_url)
      setClickRate(existing.click_rate_multiplier)
      setMaxClicks(existing.max_clicks)
      setMccId(existing.google_ads_mcc_id ?? '')
      setCustomerId(existing.google_ads_customer_id ?? '')
      setGeo(existing.geo_countries)
      setReferrers(existing.referrers.join('\n'))
      setStatus(existing.status)
    }
  }, [existing])

  useEffect(() => {
    if (existingOffers) {
      setSelectedOffers(existingOffers.map((o) => ({ offer_id: o.offer_id, weight: o.weight })))
    }
  }, [existingOffers])

  const totalWeight = selectedOffers.reduce((sum, o) => sum + o.weight, 0) || 1

  const offerById = useMemo(() => new Map(offers.map((o) => [o.id, o])), [offers])

  const availableOffers = useMemo(() => {
    const selectedIds = new Set(selectedOffers.map((o) => o.offer_id))
    const q = offerSearch.trim().toLowerCase()
    return offers.filter(
      (o) =>
        !selectedIds.has(o.id) &&
        (q === '' || o.name.toLowerCase().includes(q) || (o.network_name ?? '').toLowerCase().includes(q)),
    )
  }, [offers, selectedOffers, offerSearch])

  const addOffer = (offerId: string) => {
    setSelectedOffers((prev) => [...prev, { offer_id: offerId, weight: 100 }])
  }

  const removeOffer = (offerId: string) => {
    setSelectedOffers((prev) => prev.filter((o) => o.offer_id !== offerId))
  }

  const setWeight = (offerId: string, weight: number) => {
    setSelectedOffers((prev) => prev.map((o) => (o.offer_id === offerId ? { ...o, weight } : o)))
  }

  const save = useMutation({
    mutationFn: async () => {
      const referrerList = referrers
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean)
      const payload = {
        name,
        final_destination_url: finalUrl,
        click_rate_multiplier: clickRate,
        max_clicks: maxClicks,
        google_ads_mcc_id: mccId || null,
        google_ads_customer_id: customerId || null,
        geo_countries: geo,
        referrers: referrerList,
      }

      let campaignId = id
      if (isEdit) {
        const { error } = await supabase
          .from('campaigns')
          .update({ ...payload, status })
          .eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('campaigns')
          .insert({ ...payload, user_id: user!.id })
          .select('id')
          .single()
        if (error) throw error
        campaignId = data.id
      }

      if (isEdit) {
        const { error: delError } = await supabase
          .from('campaign_offers')
          .delete()
          .eq('campaign_id', campaignId)
        if (delError) throw delError
      }
      if (selectedOffers.length > 0) {
        const { error: insError } = await supabase.from('campaign_offers').insert(
          selectedOffers.map((o) => ({
            campaign_id: campaignId,
            offer_id: o.offer_id,
            weight: o.weight,
          })),
        )
        if (insError) throw insError
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      navigate('/campaigns')
    },
    onError: (e: Error) => setError(e.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !finalUrl.trim()) {
      setError('Campaign name and final destination URL are required.')
      return
    }
    save.mutate()
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <span className="h-6 w-1 rounded-full bg-gradient-to-b from-accent to-violet-500" />
            {isEdit ? `Edit Campaign #${id?.slice(0, 8)}` : 'Create New Campaign'}
          </h1>
          <p className="text-sm text-text-muted">
            {isEdit
              ? 'Update URL targets, geo filter rules, and linked offers'
              : 'Configure destination URL, geo targeting, and affiliate routing'}
          </p>
        </div>
        <Link
          to="/campaigns"
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted transition-colors hover:border-accent/40 hover:bg-surface-2"
        >
          Back to Campaigns
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5 p-6">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">
            Campaign Name *
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Summer Promo 2026"
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">
            Final Destination URL *
          </label>
          <input
            value={finalUrl}
            onChange={(e) => setFinalUrl(e.target.value)}
            placeholder="https://example.com/landing"
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">
              Click Rate Multiplier
            </label>
            <input
              type="number"
              min={1}
              value={clickRate}
              onChange={(e) => setClickRate(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">
              Max Clicks (0 = unlimited)
            </label>
            <input
              type="number"
              min={0}
              value={maxClicks}
              onChange={(e) => setMaxClicks(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
            />
          </div>
          {isEdit && (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'PAUSED')}
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="PAUSED">PAUSED</option>
              </select>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">
              Google Ads MCC ID
            </label>
            <input
              value={mccId}
              onChange={(e) => setMccId(e.target.value)}
              placeholder="123-456-7890"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">
              Customer / Account ID
            </label>
            <input
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="987-654-3210"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">
            Geo Targeting Countries
          </label>
          <CountrySelect value={geo} onChange={setGeo} placeholder="Select target countries..." />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">
            Referrers (one per line)
          </label>
          <textarea
            value={referrers}
            onChange={(e) => setReferrers(e.target.value)}
            placeholder={'https://google.com\nhttps://facebook.com'}
            rows={3}
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
          />
          <p className="mt-1 text-xs text-text-muted">Leave empty to allow all referrers.</p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">
            Assign Offers & Click Weightage
          </label>
          <p className="mb-2 text-xs text-text-muted">
            Distribute clicks across multiple mapped offers based on assigned weights.
          </p>

          {selectedOffers.length > 0 && (
            <div className="mb-3 rounded-lg border border-border bg-surface-2 p-3">
              <div className="mb-1.5 flex items-center justify-between text-xs text-text-muted">
                <span>Traffic Distribution Preview</span>
                <span className="font-semibold text-accent">{selectedOffers.length} offer(s) mapped</span>
              </div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface">
                {selectedOffers.map((o, i) => (
                  <div
                    key={o.offer_id}
                    className={
                      ['bg-gradient-to-r from-accent to-violet-500', 'bg-gradient-to-r from-cyan-400 to-accent', 'bg-gradient-to-r from-violet-500 to-fuchsia-500'][i % 3]
                    }
                    style={{ width: `${(o.weight / totalWeight) * 100}%` }}
                  />
                ))}
              </div>
            </div>
          )}

          {selectedOffers.length > 0 && (
            <div className="mb-3 space-y-1.5 rounded-lg border border-border bg-surface-2 p-2">
              <div className="px-1 text-xs font-semibold uppercase tracking-wide text-accent">
                Selected Offers ({selectedOffers.length})
              </div>
              {selectedOffers.map((o) => {
                const offer = offerById.get(o.offer_id)
                return (
                  <div
                    key={o.offer_id}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface"
                  >
                    <label className="flex flex-1 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked
                        onChange={() => removeOffer(o.offer_id)}
                        className="accent-accent"
                      />
                      <span className="font-medium">{offer?.name ?? 'Unknown offer'}</span>
                      <span className="text-text-muted">
                        ({offer?.network_name || 'Direct'})
                      </span>
                    </label>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <span>Weight:</span>
                      <input
                        type="number"
                        min={0}
                        value={o.weight}
                        onChange={(e) => setWeight(o.offer_id, Number(e.target.value))}
                        className="w-16 rounded-lg border border-border bg-surface px-2 py-1 text-text outline-none transition-colors focus:border-accent"
                      />
                      <span className="w-12 text-right font-semibold text-text">
                        {((o.weight / totalWeight) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <input
            value={offerSearch}
            onChange={(e) => setOfferSearch(e.target.value)}
            placeholder="Search offers by name or network..."
            className="mb-2 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
          />
          <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-surface-2">
            {availableOffers.length === 0 && (
              <div className="px-3 py-3 text-sm text-text-muted">No more offers to add.</div>
            )}
            {availableOffers.map((o) => (
              <label
                key={o.id}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-surface"
              >
                <input type="checkbox" checked={false} onChange={() => addOffer(o.id)} className="accent-accent" />
                {o.name} <span className="text-text-muted">({o.network_name || 'Direct'})</span>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-border pt-5">
          <Link
            to="/campaigns"
            className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:bg-surface-2"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={save.isPending}
            className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {save.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Campaign'}
          </button>
        </div>
      </form>
    </div>
  )
}
