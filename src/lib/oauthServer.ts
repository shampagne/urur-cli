import http from 'node:http'

export type OAuthServerErrorType = 'PORT_IN_USE' | 'TIMEOUT' | 'CALLBACK_ERROR'

export class OAuthServerError extends Error {
  type: OAuthServerErrorType

  constructor(type: OAuthServerErrorType, message: string) {
    super(message)
    this.type = type
    this.name = 'OAuthServerError'
  }
}

export interface OAuthCallbackResult {
  code: string
}

export function createOAuthServer() {
  let server: http.Server | null = null

  function close() {
    server?.close()
    server = null
  }

  function waitForCallback(
    port: number,
    timeoutMs: number,
  ): Promise<OAuthCallbackResult> {
    return new Promise((resolve, reject) => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null
      let settled = false

      function settle(
        fn: typeof resolve | typeof reject,
        value: OAuthCallbackResult | OAuthServerError,
      ) {
        if (settled) return
        settled = true
        if (timeoutId) clearTimeout(timeoutId)
        close()
        fn(value as OAuthCallbackResult & OAuthServerError)
      }

      server = http.createServer((req, res) => {
        const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`)

        if (url.pathname !== '/callback') {
          res.writeHead(404)
          res.end('Not Found')
          return
        }

        const error = url.searchParams.get('error')
        if (error) {
          const description = url.searchParams.get('error_description') ?? error
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end('<html><body><h1>認証エラー</h1></body></html>')
          settle(reject, new OAuthServerError('CALLBACK_ERROR', description))
          return
        }

        const code = url.searchParams.get('code')
        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(
            '<html><body><h1>認証エラー: コードがありません</h1></body></html>',
          )
          settle(
            reject,
            new OAuthServerError(
              'CALLBACK_ERROR',
              'コールバックに認可コードが含まれていません',
            ),
          )
          return
        }

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(
          '<html><body><h1>認証完了</h1><p>このウィンドウを閉じて、ターミナルに戻ってください。</p></body></html>',
        )
        settle(resolve, { code })
      })

      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          settle(
            reject,
            new OAuthServerError(
              'PORT_IN_USE',
              `ポート ${port} は既に使用中です。--port オプションで別のポートを指定してください。`,
            ),
          )
        } else {
          settle(reject, new OAuthServerError('PORT_IN_USE', err.message))
        }
      })

      server.listen(port, '127.0.0.1')

      timeoutId = setTimeout(() => {
        settle(
          reject,
          new OAuthServerError(
            'TIMEOUT',
            '認証がタイムアウトしました。再度 urur login を実行してください。',
          ),
        )
      }, timeoutMs)
    })
  }

  return { waitForCallback, close }
}
