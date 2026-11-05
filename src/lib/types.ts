export type Status = 'ACTIVE' | 'PAUSED'

export interface Offer {
  id: string
  user_id: string
  name: string
  network_name: string | null
  tracking_destination_url: string
  geo_countries: string[]
  status: Status
  created_at: string
  updated_at: string
}

export interface Campaign {
  id: string
  user_id: string
  name: string
  final_destination_url: string
  mapping_key: string
  click_rate_multiplier: number
  max_clicks: number
  google_ads_mcc_id: string | null
  google_ads_customer_id: string | null
  geo_countries: string[]
  referrers: string[]
  status: Status
  created_at: string
  updated_at: string
}

export interface CampaignOffer {
  id: string
  campaign_id: string
  offer_id: string
  weight: number
  offer?: Offer
}

export interface ClickLog {
  id: number
  campaign_id: string
  offer_id: string | null
  clicked_at: string
  is_main: boolean
  is_consumed: boolean
  is_google: boolean
  device_type: string | null
  country: string | null
  referrer: string | null
  destination_url: string | null
  user_agent: string | null
  campaign?: Pick<Campaign, 'id' | 'name' | 'status'>
  offer?: Pick<Offer, 'id' | 'name'>
}

export type NotificationStatus = 'UNREAD' | 'ACKED' | 'RESOLVED'

export interface AppNotification {
  id: string
  user_id: string
  campaign_id: string | null
  offer_id: string | null
  type: string
  http_status: number | null
  stuck_at_url: string | null
  final_url: string | null
  consecutive_failures: number
  status: NotificationStatus
  created_at: string
  campaign?: Pick<Campaign, 'id' | 'name'>
  offer?: Pick<Offer, 'id' | 'name'>
}

export type AdCopyStatus = 'PENDING' | 'CRAWLING' | 'GENERATING' | 'DONE' | 'FAILED'

export interface AdCopyResult {
  headlines: string[]
  descriptions: string[]
  keyword_clusters: string[]
  extensions: string[]
}

export interface AdCopyTask {
  id: string
  user_id: string
  landing_page_url: string
  target_geo_countries: string[]
  status: AdCopyStatus
  result: AdCopyResult | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface IntegrationSettings {
  user_id: string
  google_ads_connected: boolean
  ai_provider: 'claude' | 'openai'
  updated_at: string
}
