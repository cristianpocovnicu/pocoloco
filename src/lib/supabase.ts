import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types matching our database schema
export type Profile = {
  id: string
  username: string
  full_name: string
  bio: string | null
  avatar_url: string | null
  is_guide: boolean
  guide_level: number
  xp: number
  created_at: string
}

export type Location = {
  id: string
  name: string
  description: string
  address: string
  city: string
  country: string
  latitude: number
  longitude: number
  category: string
  cover_image: string | null
  score: number
  experience_count: number
  trip_count: number
  status: 'pending' | 'approved' | 'rejected'
  added_by: string
  created_at: string
}

export type Experience = {
  id: string
  location_id: string
  author_id: string
  content: string
  rating_experience: number
  rating_access: number | null
  rating_crowd: number | null
  images: string[]
  tips: string[]
  upvotes: number
  downvotes: number
  comment_count: number
  status: 'active' | 'reported' | 'removed'
  created_at: string
}

export type Trip = {
  id: string
  author_id: string
  title: string
  description: string
  duration_days: number
  transport_type: string
  transport_types: string[]
  person_count: number
  countries: string[]
  cover_image: string | null
  save_count: number
  like_count: number
  view_count: number
  status: 'active' | 'reported' | 'removed'
  created_at: string
}

export type Report = {
  id: string
  content_type: 'experience' | 'location' | 'trip' | 'user'
  content_id: string
  reason: string
  reporter_id: string
  status: 'pending' | 'resolved' | 'dismissed'
  created_at: string
}
