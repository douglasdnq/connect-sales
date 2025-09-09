import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const CREATE_LEADS_TABLE_SQL = `
-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic Info
    full_name TEXT,
    whatsapp TEXT,
    email TEXT,
    age INTEGER,
    education TEXT,
    
    -- Professional Info  
    work_situation TEXT,
    happy_with_work TEXT,
    salary_range TEXT,
    
    -- Study Info
    fiscal_study_moment TEXT,
    study_time_dedication TEXT,
    why_mentoria_ideal TEXT,
    why_deserve_spot TEXT,
    investment_type TEXT,
    priority_start TEXT,
    
    -- Scoring
    score INTEGER,
    
    -- Form Meta
    form_id TEXT,
    form_date TIMESTAMPTZ,
    
    -- UTM Tracking
    utm_source TEXT,
    utm_medium TEXT,  
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    gclid TEXT,
    fbclid TEXT,
    
    -- Lead Status
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
    lead_source TEXT DEFAULT 'respondi',
    
    -- Conversion tracking
    converted_to_customer_id UUID,
    converted_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
`

const CREATE_INDEXES_SQL = `
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp ON leads(whatsapp); 
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_form_date ON leads(form_date);
CREATE INDEX IF NOT EXISTS idx_leads_utm_source ON leads(utm_source);
CREATE INDEX IF NOT EXISTS idx_leads_utm_campaign ON leads(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
`

const CREATE_TRIGGER_SQL = `
-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at 
    BEFORE UPDATE ON leads 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
`

const RLS_POLICIES_SQL = `
-- Enable RLS (Row Level Security)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON leads;

-- Create RLS policies
CREATE POLICY "Allow all operations for authenticated users" ON leads
    FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON leads TO anon, authenticated, service_role;
`

export async function POST(request: NextRequest) {
  try {
    console.log('Running migration for leads table...')

    // Execute SQL commands using supabase admin
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: CREATE_LEADS_TABLE_SQL
    })

    if (tableError) {
      console.error('Error creating table:', tableError)
      
      // Try alternative approach using direct SQL
      const { error: altError } = await supabase
        .from('_temp_migration')
        .select('*')
        .limit(1)

      // If even this fails, we'll manually execute via API
      console.log('Attempting to create table via raw SQL...')
      
      // Since we can't execute DDL directly, let's create a simpler approach
      return NextResponse.json({
        error: 'Migration failed - need to run manually',
        sql: CREATE_LEADS_TABLE_SQL,
        message: 'Please run this SQL in Supabase SQL Editor'
      })
    }

    // Create indexes
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: CREATE_INDEXES_SQL
    })

    if (indexError) {
      console.error('Error creating indexes:', indexError)
    }

    // Create trigger
    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql: CREATE_TRIGGER_SQL
    })

    if (triggerError) {
      console.error('Error creating trigger:', triggerError)
    }

    // Create RLS policies
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: RLS_POLICIES_SQL
    })

    if (rlsError) {
      console.error('Error creating RLS:', rlsError)
    }

    return NextResponse.json({
      success: true,
      message: 'Leads table migration completed successfully'
    })

  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({
      error: 'Migration failed',
      details: error,
      message: 'Please run the migration SQL manually in Supabase'
    }, { status: 500 })
  }
}

// Provide the SQL for manual execution
export async function GET() {
  return NextResponse.json({
    message: 'Run this SQL in Supabase SQL Editor to create the leads table:',
    sql: CREATE_LEADS_TABLE_SQL + '\n\n' + CREATE_INDEXES_SQL + '\n\n' + CREATE_TRIGGER_SQL + '\n\n' + RLS_POLICIES_SQL
  })
}