import { confirm, input } from '@inquirer/prompts'
import ora from 'ora'
import pc from 'picocolors'
import { loadCredentials } from '../lib/auth.js'
import { getSupabaseClient } from '../lib/supabase.js'
import type { ServiceFormData } from '../lib/validation.js'
import {
  validateAll,
  validateDescription,
  validateLogoUrl,
  validateName,
  validateTagline,
  validateUrl,
} from '../lib/validation.js'

interface SubmitOptions {
  name?: string
  url?: string
  tagline?: string
  description?: string
  logoUrl?: string
  interactive?: boolean
}

function shouldUseInteractive(options: SubmitOptions): boolean {
  return options.interactive === true || !options.name || !options.url
}

async function promptServiceData(): Promise<ServiceFormData> {
  const name = await input({
    message: 'プロダクト名（必須）:',
    validate: (value) => validateName(value) ?? true,
  })

  const url = await input({
    message: 'プロダクトURL（必須）:',
    validate: (value) => validateUrl(value) ?? true,
  })

  const tagline = await input({
    message: 'タグライン（省略可）:',
    validate: (value) => {
      if (!value) return true
      return validateTagline(value) ?? true
    },
  })

  const description = await input({
    message: '説明（省略可）:',
    validate: (value) => {
      if (!value) return true
      return validateDescription(value) ?? true
    },
  })

  const logo_url = await input({
    message: 'ロゴURL（省略可）:',
    validate: (value) => {
      if (!value) return true
      return validateLogoUrl(value) ?? true
    },
  })

  return {
    name,
    url,
    tagline: tagline || undefined,
    description: description || undefined,
    logo_url: logo_url || undefined,
  }
}

function displaySummary(data: ServiceFormData): void {
  console.log(pc.bold('\n投稿内容:'))
  console.log(`  プロダクト名: ${data.name}`)
  console.log(`  URL: ${data.url}`)
  if (data.tagline) console.log(`  タグライン: ${data.tagline}`)
  if (data.description) console.log(`  説明: ${data.description}`)
  if (data.logo_url) console.log(`  ロゴURL: ${data.logo_url}`)
  console.log('')
}

function displayErrors(errors: Record<string, string>): void {
  console.log(pc.red('\nバリデーションエラー:'))
  for (const [, message] of Object.entries(errors)) {
    console.log(pc.red(`  - ${message}`))
  }
}

export async function submit(options: SubmitOptions): Promise<void> {
  // 1. Authentication check
  const credentials = await loadCredentials()
  if (!credentials) {
    console.log(pc.red('ログインが必要です。`urur login` を実行してください。'))
    process.exitCode = 1
    return
  }

  const supabase = getSupabaseClient()
  await supabase.auth.setSession({
    access_token: credentials.access_token,
    refresh_token: credentials.refresh_token,
  })

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    console.log(
      pc.red(
        `認証エラー: ${userError?.message ?? 'ユーザー情報を取得できませんでした'}。\`urur login\` で再ログインしてください。`,
      ),
    )
    process.exitCode = 1
    return
  }

  // 2. Data collection
  let formData: ServiceFormData

  if (shouldUseInteractive(options)) {
    formData = await promptServiceData()
  } else {
    // Build form data from CLI options
    formData = {
      name: options.name as string,
      url: options.url as string,
      tagline: options.tagline,
      description: options.description,
      logo_url: options.logoUrl,
    }

    // 3. Validation (CLI mode only)
    const result = validateAll(formData)
    if (!result.valid) {
      displayErrors(result.errors)
      process.exitCode = 1
      return
    }
  }

  // 4. Summary and confirmation
  displaySummary(formData)

  const confirmed = await confirm({
    message: '投稿しますか？',
    default: true,
  })

  if (!confirmed) {
    console.log(pc.yellow('投稿をキャンセルしました。'))
    return
  }

  // 5. Submit to Supabase
  const spinner = ora('投稿中...').start()

  const { error: insertError } = await supabase
    .from('services')
    .insert({
      user_id: userData.user.id,
      name: formData.name,
      url: formData.url,
      tagline: formData.tagline ?? null,
      description: formData.description ?? null,
      logo_url: formData.logo_url ?? null,
      source: 'cli' as const,
    })
    .select()
    .single()

  if (insertError) {
    spinner.fail()
    console.log(pc.red(`投稿エラー: ${insertError.message}`))
    process.exitCode = 1
    return
  }

  spinner.succeed()
  console.log(pc.green(`「${formData.name}」を投稿しました！`))
}
