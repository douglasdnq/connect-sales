import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export type Platform = {
  id: number
  name: string
}

export type Customer = {
  id: string
  email: string
  phone_e164?: string
  cpf?: string
  name?: string
  created_at: string
}

export type Order = {
  id: string
  platform_id: number
  platform_order_id: string
  customer_id?: string
  order_date?: string
  currency: string
  gross_amount?: number
  net_amount?: number
  status: 'pending' | 'paid' | 'refunded' | 'chargeback' | 'canceled'
  created_at: string
  platform?: Platform
  customer?: Customer
}

export type RawEvent = {
  id: number
  platform_id: number
  received_at: string
  event_type?: string
  payload_json: any
  event_hash: string
  platform?: Platform
}

export type EventError = {
  id: number
  platform_id?: number
  error_at: string
  reason?: string
  payload_json: any
  platform?: Platform
}

export type AdInsight = {
  id: number
  date: string
  account_id?: string
  campaign_id?: string
  adset_id?: string
  ad_id?: string
  spend?: number
  impressions?: number
  clicks?: number
  leads?: number
  created_at: string
}