/**
 * Service submission form validation
 * Shared between client and server
 */

export interface ServiceFormData {
  name: string
  url: string
  category_id?: string
  tagline?: string
  description?: string
  logo_url?: string
}

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

// Error messages in Japanese
const ERROR_MESSAGES = {
  name: {
    required: 'プロダクト名は必須です',
    maxLength: 'プロダクト名は100文字以内で入力してください',
  },
  url: {
    required: 'URLは必須です',
    invalid: '有効なURLを入力してください',
  },
  tagline: {
    maxLength: 'タグラインは200文字以内で入力してください',
  },
  description: {
    maxLength: '説明は2000文字以内で入力してください',
  },
  logo_url: {
    invalid: '有効なURLを入力してください',
  },
} as const

// Validation rules
const VALIDATION_RULES = {
  name: { required: true, maxLength: 100 },
  url: { required: true },
  tagline: { maxLength: 200 },
  description: { maxLength: 2000 },
} as const

function isValidUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

export function validateName(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return ERROR_MESSAGES.name.required
  }
  if (trimmed.length > VALIDATION_RULES.name.maxLength) {
    return ERROR_MESSAGES.name.maxLength
  }
  return null
}

export function validateUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return ERROR_MESSAGES.url.required
  }
  if (!isValidUrl(trimmed)) {
    return ERROR_MESSAGES.url.invalid
  }
  return null
}

export function validateTagline(value: string | undefined): string | null {
  if (!value) {
    return null
  }
  if (value.length > VALIDATION_RULES.tagline.maxLength) {
    return ERROR_MESSAGES.tagline.maxLength
  }
  return null
}

export function validateDescription(value: string | undefined): string | null {
  if (!value) {
    return null
  }
  if (value.length > VALIDATION_RULES.description.maxLength) {
    return ERROR_MESSAGES.description.maxLength
  }
  return null
}

export function validateLogoUrl(value: string | undefined): string | null {
  if (!value) {
    return null
  }
  if (!isValidUrl(value)) {
    return ERROR_MESSAGES.logo_url.invalid
  }
  return null
}

export function validateAll(data: Partial<ServiceFormData>): ValidationResult {
  const errors: Record<string, string> = {}

  const nameError = validateName(data.name ?? '')
  if (nameError) {
    errors.name = nameError
  }

  const urlError = validateUrl(data.url ?? '')
  if (urlError) {
    errors.url = urlError
  }

  const taglineError = validateTagline(data.tagline)
  if (taglineError) {
    errors.tagline = taglineError
  }

  const descriptionError = validateDescription(data.description)
  if (descriptionError) {
    errors.description = descriptionError
  }

  const logoUrlError = validateLogoUrl(data.logo_url)
  if (logoUrlError) {
    errors.logo_url = logoUrlError
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}
