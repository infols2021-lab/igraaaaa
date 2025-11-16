// supabase.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ЗАМЕНИ НА СВОИ РЕАЛЬНЫЕ КЛЮЧИ!
const supabaseUrl = 'https://твой-проект.supabase.co'
const supabaseAnonKey = 'твой_anon_ключ'

// Создаем клиент Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
})