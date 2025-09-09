import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    message: 'Execute this SQL in Supabase to fix RLS for leads table:',
    sql: `
-- Temporarily disable RLS for leads table
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;

-- Or create a more permissive policy
-- DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON leads;
-- CREATE POLICY "Allow all operations" ON leads FOR ALL USING (true);
    `
  })
}