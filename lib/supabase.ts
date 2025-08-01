// lib/supabase.ts
'use client'

import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'
import { type SupabaseClient } from '@supabase/supabase-js'

export const supabase: SupabaseClient = createPagesBrowserClient()

