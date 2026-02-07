import { describe, expect, it } from 'vitest'
import { getSupabaseClient } from '../../src/lib/supabase.js'

describe('supabase', () => {
  describe('getSupabaseClient', () => {
    it('should create a Supabase client', () => {
      const client = getSupabaseClient()
      expect(client).toBeDefined()
      expect(client.auth).toBeDefined()
    })

    it('should have signInWithOAuth method for PKCE flow', () => {
      const client = getSupabaseClient()
      expect(typeof client.auth.signInWithOAuth).toBe('function')
    })

    it('should have exchangeCodeForSession method for PKCE flow', () => {
      const client = getSupabaseClient()
      expect(typeof client.auth.exchangeCodeForSession).toBe('function')
    })
  })
})
