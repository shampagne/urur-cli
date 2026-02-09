/**
 * Database type definitions for urur.dev
 * Manually defined types that match the Supabase schema
 */

// Service status enum type
export type ServiceStatus = 'draft' | 'pending' | 'approved' | 'rejected'

// Profile types
export interface Profile {
  id: string
  github_username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  website_url: string | null
  twitter_handle: string | null
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface ProfileInsert {
  id: string
  github_username: string
  display_name?: string | null
  avatar_url?: string | null
  bio?: string | null
  website_url?: string | null
  twitter_handle?: string | null
}

export interface ProfileUpdate {
  display_name?: string | null
  avatar_url?: string | null
  bio?: string | null
  website_url?: string | null
  twitter_handle?: string | null
}

// Service types
export interface Service {
  id: string
  user_id: string
  category_id: string | null
  name: string
  tagline: string | null
  description: string | null
  url: string
  logo_url: string | null
  status: ServiceStatus
  source: string
  created_at: string
  updated_at: string
}

export interface ServiceInsert {
  user_id: string
  category_id?: string | null
  name: string
  tagline?: string | null
  description?: string | null
  url: string
  logo_url?: string | null
  status?: ServiceStatus
  source?: 'web' | 'cli'
}

export interface ServiceUpdate {
  category_id?: string | null
  name?: string
  tagline?: string | null
  description?: string | null
  url?: string
  logo_url?: string | null
  status?: ServiceStatus
}

// Service with related data (for queries with joins)
export interface ServiceWithProfile extends Service {
  profiles: Profile
}

export interface ServiceWithCategory extends Service {
  categories: Category | null
}

export interface ServiceWithRelations extends Service {
  profiles: Profile
  categories: Category | null
}

// Category types
export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  display_order: number
  created_at: string
}

// Service Review Log types
export interface ServiceReviewLog {
  id: string
  service_id: string
  reviewer_id: string
  previous_status: ServiceStatus
  new_status: ServiceStatus
  reviewed_at: string
}

export interface ServiceReviewLogInsert {
  service_id: string
  reviewer_id: string
  previous_status: ServiceStatus
  new_status: ServiceStatus
}

export interface ServiceReviewLogWithReviewer extends ServiceReviewLog {
  profiles: {
    github_username: string
    display_name: string | null
  }
}
