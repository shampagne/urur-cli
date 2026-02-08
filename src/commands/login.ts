import { confirm } from '@inquirer/prompts'
import open from 'open'
import ora from 'ora'
import pc from 'picocolors'
import {
  clearCredentials,
  loadCredentials,
  saveCredentials,
} from '../lib/auth.js'
import { WEB_URL } from '../lib/config.js'
import { createOAuthServer, OAuthServerError } from '../lib/oauthServer.js'
import { getSupabaseClient } from '../lib/supabase.js'

interface LoginOptions {
  port: string
}

export async function login(options: LoginOptions): Promise<void> {
  const port = Number.parseInt(options.port, 10)
  const supabase = getSupabaseClient()

  // Check existing credentials
  const existing = await loadCredentials()
  if (existing) {
    // Try to get user info from existing session
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

  // Start OAuth flow
  const { data: oauthData, error: oauthError } =
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `http://127.0.0.1:${port}/callback`,
        skipBrowserRedirect: true,
      },
    })

  if (oauthError || !oauthData.url) {
    console.log(
      pc.red(
        `OAuth エラー: ${oauthError?.message ?? 'URLが取得できませんでした'}`,
      ),
    )
    process.exitCode = 1
    return
  }

  const redirectUri = `http://127.0.0.1:${port}/callback`
  const consentUrl = `${WEB_URL}/cli/consent?oauth_url=${encodeURIComponent(oauthData.url)}&redirect_uri=${encodeURIComponent(redirectUri)}`

  const server = createOAuthServer()
  const spinner = ora('ブラウザで GitHub 認証を待っています...').start()

  try {
    const callbackPromise = server.waitForCallback(port, 60000)
    await open(consentUrl)

    const { code } = await callbackPromise
    spinner.stop()

    const { data: sessionData, error: sessionError } =
      await supabase.auth.exchangeCodeForSession(code)

    if (sessionError || !sessionData.session) {
      console.log(
        pc.red(
          `セッション取得エラー: ${sessionError?.message ?? 'セッションが取得できませんでした'}`,
        ),
      )
      process.exitCode = 1
      return
    }

    const { session } = sessionData
    await saveCredentials({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at ?? 0,
    })

    const username = session.user?.user_metadata?.user_name ?? '不明'
    console.log(pc.green(`ログイン成功: ${username}`))
  } catch (err) {
    spinner.stop()
    server.close()

    if (err instanceof OAuthServerError) {
      console.log(pc.red(err.message))
      if (err.type === 'PORT_IN_USE') {
        console.log(
          pc.yellow('--port オプションで別のポートを指定してください。'),
        )
      }
    } else {
      console.log(
        pc.red(
          `予期しないエラー: ${err instanceof Error ? err.message : String(err)}`,
        ),
      )
    }
    process.exitCode = 1
  }
}
