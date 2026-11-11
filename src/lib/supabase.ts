import { createClient } from "@supabase/supabase-js"

export const SUPABASE_URL = "https://<project>.supabase.co"
export const SUPABASE_ANON_KEY = "<anon key>"
export const DEMO_MODE = SUPABASE_URL.includes("<project>")

export const db = DEMO_MODE
  ? null
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
