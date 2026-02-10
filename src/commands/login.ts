import { confirm, input, select } from '@inquirer/prompts'
import open from 'open'
import ora from 'ora'
import pc from 'picocolors'
import {
  clearCredentials,
  loadCredentials,
  saveCredentials,
} from '../lib/auth.js'
import { pollForSession, requestCode } from '../lib/deviceFlow.js'
import { sendOtp, verifyOtp } from '../lib/magicLink.js'
import { getSupabaseClient } from '../lib/supabase.js'

const MAX_OTP_ATTEMPTS = 3

export async function login(): Promise<void> {
  const supabase = getSupabaseClient()

  // Check existing credentials
  const existing = await loadCredentials()
  if (existing) {
    await supabase.auth.setSession({
      access_token: existing.access_token,
      refresh_token: existing.refresh_token,
    })
    const { data } = await supabase.auth.getUser()
    const username = data?.user?.user_metadata?.user_name ?? '不明'

    console.log(pc.green(`既にログイン済みです: ${username}`))

    const shouldRelogin = await confirm({
      message: '再ログインしますか？',
      default: false,
    })

    if (!shouldRelogin) {
      return
    }

    await clearCredentials()
  }

  // Select login method
  const method = await select({
    message: 'ログイン方法を選択してください',
    choices: [
      { name: 'GitHub', value: 'github' },
      { name: 'メールアドレス', value: 'email' },
    ],
  })

  if (method === 'github') {
    await loginWithGitHub()
  } else {
    await loginWithEmail()
  }
}

async function loginWithGitHub(): Promise<void> {
  try {
    const deviceCode = await requestCode()

    console.log()
    console.log(pc.bold(`認証コード: ${pc.cyan(deviceCode.userCode)}`))
    console.log(
      `以下の URL でコードを入力してください: ${deviceCode.verificationUri}`,
    )
    console.log()

    await open(deviceCode.verificationUri)

    const spinner = ora('GitHub で認証を待っています...').start()

    try {
      const session = await pollForSession(
        deviceCode.deviceCode,
        deviceCode.interval,
        deviceCode.expiresIn,
      )

      spinner.succeed('認証完了')

      await saveCredentials({
        access_token: session.accessToken,
        refresh_token: session.refreshToken,
        expires_at: session.expiresAt,
      })

      console.log(pc.green(`ログイン成功: ${session.userName}`))
      printPostLoginGuide()
    } catch (err) {
      spinner.fail('認証に失敗しました')
      throw err
    }
  } catch (err) {
    console.log(
      pc.red(`エラー: ${err instanceof Error ? err.message : String(err)}`),
    )
    process.exitCode = 1
  }
}

async function loginWithEmail(): Promise<void> {
  try {
    const email = await input({
      message: 'メールアドレスを入力してください',
      validate: (value) => {
        if (!value.includes('@')) {
          return '有効なメールアドレスを入力してください'
        }
        return true
      },
    })

    await sendOtp(email)
    console.log(pc.green(`${email} に認証コードを送信しました`))

    const session = await attemptOtpVerification(email)

    if (session) {
      await saveCredentials({
        access_token: session.accessToken,
        refresh_token: session.refreshToken,
        expires_at: session.expiresAt,
      })

      console.log(pc.green(`ログイン成功: ${session.email}`))
      printPostLoginGuide()
    }
  } catch (err) {
    console.log(
      pc.red(`エラー: ${err instanceof Error ? err.message : String(err)}`),
    )
    process.exitCode = 1
  }
}

async function attemptOtpVerification(email: string): Promise<{
  accessToken: string
  refreshToken: string
  expiresAt: number
  email: string
} | null> {
  for (let attempt = 0; attempt < MAX_OTP_ATTEMPTS; attempt++) {
    const token = await input({
      message: '認証コードを入力してください',
    })

    try {
      return await verifyOtp(email, token)
    } catch {
      const remaining = MAX_OTP_ATTEMPTS - attempt - 1
      if (remaining > 0) {
        console.log(
          pc.yellow(`認証コードが無効です。残り ${remaining} 回試行できます。`),
        )
      }
    }
  }

  // All attempts failed, offer resend
  const shouldResend = await confirm({
    message: '認証コードを再送信しますか？',
    default: true,
  })

  if (shouldResend) {
    await sendOtp(email)
    console.log(pc.green(`${email} に認証コードを再送信しました`))

    const token = await input({
      message: '認証コードを入力してください',
    })

    return await verifyOtp(email, token)
  }

  return null
}

function printPostLoginGuide(): void {
  console.log()
  console.log(
    `次のステップ: ${pc.cyan('urur submit')} でプロダクトを投稿できます`,
  )
}
