// supabase.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ЗАМЕНИ НА СВОИ РЕАЛЬНЫЕ КЛЮЧИ!
const supabaseUrl = 'https://uyfhlpmugqgazedantwf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5ZmhscG11Z3FnYXplZGFudHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyOTQ5MjcsImV4cCI6MjA3ODg3MDkyN30.wh4eazRMpyjNQ9unP3OmIt7f8e7P6vyyHWTlZEtgFFM'

// Создаем клиент Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
})