import { describe, expect, it } from 'vitest'
import {
  validateAll,
  validateDescription,
  validateLogoUrl,
  validateName,
  validateTagline,
  validateUrl,
} from '../../src/lib/validation.js'

describe('validateName', () => {
  it('should return null for valid name', () => {
    expect(validateName('My Service')).toBeNull()
  })

  it('should return error for empty string', () => {
    expect(validateName('')).toBe('サービス名は必須です')
  })

  it('should return error for whitespace only', () => {
    expect(validateName('   ')).toBe('サービス名は必須です')
  })

  it('should return error for name exceeding 100 characters', () => {
    const longName = 'a'.repeat(101)
    expect(validateName(longName)).toBe(
      'サービス名は100文字以内で入力してください',
    )
  })

  it('should return null for name with exactly 100 characters', () => {
    const exactName = 'a'.repeat(100)
    expect(validateName(exactName)).toBeNull()
  })

  it('should trim whitespace before validation', () => {
    expect(validateName('  My Service  ')).toBeNull()
  })
})

describe('validateUrl', () => {
  it('should return null for valid URL', () => {
    expect(validateUrl('https://example.com')).toBeNull()
  })

  it('should return error for empty string', () => {
    expect(validateUrl('')).toBe('URLは必須です')
  })

  it('should return error for whitespace only', () => {
    expect(validateUrl('   ')).toBe('URLは必須です')
  })

  it('should return error for invalid URL', () => {
    expect(validateUrl('not-a-url')).toBe('有効なURLを入力してください')
  })

  it('should return null for URL with http scheme', () => {
    expect(validateUrl('http://example.com')).toBeNull()
  })

  it('should trim whitespace before validation', () => {
    expect(validateUrl('  https://example.com  ')).toBeNull()
  })
})

describe('validateTagline', () => {
  it('should return null for undefined', () => {
    expect(validateTagline(undefined)).toBeNull()
  })

  it('should return null for empty string', () => {
    expect(validateTagline('')).toBeNull()
  })

  it('should return null for valid tagline', () => {
    expect(validateTagline('A great service')).toBeNull()
  })

  it('should return error for tagline exceeding 200 characters', () => {
    const longTagline = 'a'.repeat(201)
    expect(validateTagline(longTagline)).toBe(
      'タグラインは200文字以内で入力してください',
    )
  })

  it('should return null for tagline with exactly 200 characters', () => {
    const exactTagline = 'a'.repeat(200)
    expect(validateTagline(exactTagline)).toBeNull()
  })
})

describe('validateDescription', () => {
  it('should return null for undefined', () => {
    expect(validateDescription(undefined)).toBeNull()
  })

  it('should return null for empty string', () => {
    expect(validateDescription('')).toBeNull()
  })

  it('should return null for valid description', () => {
    expect(validateDescription('A detailed description')).toBeNull()
  })

  it('should return error for description exceeding 2000 characters', () => {
    const longDescription = 'a'.repeat(2001)
    expect(validateDescription(longDescription)).toBe(
      '説明は2000文字以内で入力してください',
    )
  })

  it('should return null for description with exactly 2000 characters', () => {
    const exactDescription = 'a'.repeat(2000)
    expect(validateDescription(exactDescription)).toBeNull()
  })
})

describe('validateLogoUrl', () => {
  it('should return null for undefined', () => {
    expect(validateLogoUrl(undefined)).toBeNull()
  })

  it('should return null for empty string', () => {
    expect(validateLogoUrl('')).toBeNull()
  })

  it('should return null for valid URL', () => {
    expect(validateLogoUrl('https://example.com/logo.png')).toBeNull()
  })

  it('should return error for invalid URL', () => {
    expect(validateLogoUrl('not-a-url')).toBe('有効なURLを入力してください')
  })
})

describe('validateAll', () => {
  it('should return valid for complete valid data', () => {
    const result = validateAll({
      name: 'My Service',
      url: 'https://example.com',
      tagline: 'A great service',
      description: 'Detailed description',
      logo_url: 'https://example.com/logo.png',
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual({})
  })

  it('should return valid for minimal required data', () => {
    const result = validateAll({
      name: 'My Service',
      url: 'https://example.com',
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual({})
  })

  it('should return errors for missing required fields', () => {
    const result = validateAll({})
    expect(result.valid).toBe(false)
    expect(result.errors.name).toBe('サービス名は必須です')
    expect(result.errors.url).toBe('URLは必須です')
  })

  it('should return multiple errors', () => {
    const result = validateAll({
      name: '',
      url: 'not-a-url',
      tagline: 'a'.repeat(201),
    })
    expect(result.valid).toBe(false)
    expect(Object.keys(result.errors).length).toBe(3)
    expect(result.errors.name).toBeDefined()
    expect(result.errors.url).toBeDefined()
    expect(result.errors.tagline).toBeDefined()
  })

  it('should not include errors for valid optional fields', () => {
    const result = validateAll({
      name: 'My Service',
      url: 'https://example.com',
      tagline: 'Valid tagline',
      description: 'Valid description',
      logo_url: 'https://example.com/logo.png',
    })
    expect(result.valid).toBe(true)
    expect(Object.keys(result.errors).length).toBe(0)
  })
})
