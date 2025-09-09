-- Migration: Create leads table for Respondi form data
-- Created: 2025-01-09

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
    converted_to_customer_id UUID REFERENCES customers(id),
    converted_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_whatsapp ON leads(whatsapp); 
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_form_date ON leads(form_date);
CREATE INDEX idx_leads_utm_source ON leads(utm_source);
CREATE INDEX idx_leads_utm_campaign ON leads(utm_campaign);
CREATE INDEX idx_leads_score ON leads(score);
CREATE INDEX idx_leads_created_at ON leads(created_at);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leads_updated_at 
    BEFORE UPDATE ON leads 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust based on your auth setup)
CREATE POLICY "Allow all operations for authenticated users" ON leads
    FOR ALL USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON leads TO anon, authenticated, service_role;

-- Create view for lead analytics
CREATE OR REPLACE VIEW lead_analytics AS
SELECT 
    DATE_TRUNC('day', form_date) as date,
    COUNT(*) as total_leads,
    COUNT(*) FILTER (WHERE status = 'converted') as converted_leads,
    ROUND(
        (COUNT(*) FILTER (WHERE status = 'converted')::DECIMAL / NULLIF(COUNT(*), 0) * 100), 
        2
    ) as conversion_rate,
    utm_source,
    utm_campaign,
    AVG(score) as avg_score,
    COUNT(*) FILTER (WHERE score >= 50) as high_quality_leads
FROM leads 
WHERE form_date IS NOT NULL
GROUP BY DATE_TRUNC('day', form_date), utm_source, utm_campaign
ORDER BY date DESC;

-- Grant access to view
GRANT SELECT ON lead_analytics TO anon, authenticated, service_role;