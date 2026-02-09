import pc from 'picocolors'
import { clearCredentials, loadCredentials } from '../lib/auth.js'

export async function logout(): Promise<void> {
  const credentials = await loadCredentials()
  if (!credentials) {
    console.log(pc.yellow('ログインしていません。'))
    return
  }

  await clearCredentials()
  console.log(pc.green('ログアウトしました。'))
}
