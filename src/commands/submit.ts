import pc from 'picocolors'

interface SubmitOptions {
  name?: string
  url?: string
  tagline?: string
  description?: string
  logoUrl?: string
  interactive?: boolean
}

export async function submit(options: SubmitOptions): Promise<void> {
  console.log(
    pc.yellow('⚠ urur submit は未実装です。Kiro specで実装を進めてください。'),
  )
}
