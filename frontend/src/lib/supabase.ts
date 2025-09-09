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

export type Goal = {
  id: number
  month: number
  year: number
  dza_sales_target: number
  mentoria_sales_target: number
  dza_revenue_target: number
  mentoria_revenue_target: number
  global_revenue_target: number
  created_at: string
  updated_at: string
}

export type Lead = {
  id: string
  full_name?: string
  whatsapp?: string
  email?: string
  age?: number
  education?: string
  work_situation?: string
  happy_with_work?: string
  salary_range?: string
  fiscal_study_moment?: string
  study_time_dedication?: string
  why_mentoria_ideal?: string
  why_deserve_spot?: string
  investment_type?: string
  priority_start?: string
  score?: number
  form_id?: string
  form_date?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  gclid?: string
  fbclid?: string
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
  lead_source: string
  converted_to_customer_id?: string
  converted_at?: string
  created_at: string
  updated_at: string
}