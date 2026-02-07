import fs from 'node:fs/promises'
import { CONFIG_DIR, CREDENTIALS_PATH } from './config.js'

export interface Credentials {
  access_token: string
  refresh_token: string
  expires_at: number
}

export async function loadCredentials(): Promise<Credentials | null> {
  try {
    const data = await fs.readFile(CREDENTIALS_PATH, 'utf-8')
    return JSON.parse(data) as Credentials
  } catch {
    return null
  }
}

export async function saveCredentials(credentials: Credentials): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true })
  await fs.writeFile(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2))
}

export async function clearCredentials(): Promise<void> {
  try {
    await fs.unlink(CREDENTIALS_PATH)
  } catch {
    // Ignore if file doesn't exist
  }
}
