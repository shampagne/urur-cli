import pc from 'picocolors'

interface LoginOptions {
  port: string
}

export async function login(options: LoginOptions): Promise<void> {
  console.log(
    pc.yellow('⚠ urur login は未実装です。Kiro specで実装を進めてください。'),
  )
}
