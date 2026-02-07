import http from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createOAuthServer,
  OAuthServerError,
} from '../../src/lib/oauthServer.js'

describe('oauthServer', () => {
  let server: ReturnType<typeof createOAuthServer> | null = null

  afterEach(() => {
    server?.close()
    server = null
  })

  describe('waitForCallback', () => {
    it('should receive authorization code from callback', async () => {
      server = createOAuthServer()
      const port = 18976

      const callbackPromise = server.waitForCallback(port, 5000)

      await new Promise((resolve) => setTimeout(resolve, 100))

      const response = await fetch(
        `http://127.0.0.1:${port}/callback?code=test-auth-code`,
      )
      expect(response.status).toBe(200)
      const html = await response.text()
      expect(html).toContain('認証完了')

      const result = await callbackPromise
      expect(result.code).toBe('test-auth-code')
    })

    it('should respond with completion HTML to browser', async () => {
      server = createOAuthServer()
      const port = 18977

      const callbackPromise = server.waitForCallback(port, 5000)

      await new Promise((resolve) => setTimeout(resolve, 100))

      const response = await fetch(
        `http://127.0.0.1:${port}/callback?code=abc123`,
      )
      const html = await response.text()
      expect(html).toContain('ターミナルに戻ってください')

      await callbackPromise
    })

    it('should auto-close server after receiving code', async () => {
      server = createOAuthServer()
      const port = 18978

      const callbackPromise = server.waitForCallback(port, 5000)

      await new Promise((resolve) => setTimeout(resolve, 100))

      await fetch(`http://127.0.0.1:${port}/callback?code=abc`)
      await callbackPromise

      await expect(
        fetch(`http://127.0.0.1:${port}/callback?code=xyz`),
      ).rejects.toThrow()

      server = null
    })
  })

  describe('error handling', () => {
    it('should reject with PORT_IN_USE when port is occupied', async () => {
      const blocker = http.createServer()
      const port = 18979
      await new Promise<void>((resolve) =>
        blocker.listen(port, '127.0.0.1', resolve),
      )

      try {
        server = createOAuthServer()
        const err = await server
          .waitForCallback(port, 5000)
          .catch((e: OAuthServerError) => e)
        expect(err).toBeInstanceOf(OAuthServerError)
        expect(err.type).toBe('PORT_IN_USE')
        expect(err.message).toContain(`${port}`)
      } finally {
        blocker.close()
      }
    })

    it('should reject with CALLBACK_ERROR when error param present', async () => {
      server = createOAuthServer()
      const port = 18980

      const callbackPromise = server
        .waitForCallback(port, 5000)
        .catch((e: OAuthServerError) => e)

      await new Promise((resolve) => setTimeout(resolve, 100))

      const response = await fetch(
        `http://127.0.0.1:${port}/callback?error=access_denied&error_description=User+denied+access`,
      )
      expect(response.status).toBe(400)

      const err = await callbackPromise
      expect(err).toBeInstanceOf(OAuthServerError)
      expect(err.type).toBe('CALLBACK_ERROR')
      expect(err.message).toBe('User denied access')

      server = null
    })

    it('should reject with TIMEOUT when no callback received', async () => {
      server = createOAuthServer()
      const port = 18981

      const err = await server
        .waitForCallback(port, 200)
        .catch((e: OAuthServerError) => e)
      expect(err).toBeInstanceOf(OAuthServerError)
      expect(err.type).toBe('TIMEOUT')
      expect(err.message).toContain('タイムアウト')

      server = null
    })

    it('should reject with CALLBACK_ERROR when code param is missing', async () => {
      server = createOAuthServer()
      const port = 18982

      const callbackPromise = server
        .waitForCallback(port, 5000)
        .catch((e: OAuthServerError) => e)

      await new Promise((resolve) => setTimeout(resolve, 100))

      const response = await fetch(`http://127.0.0.1:${port}/callback`)
      expect(response.status).toBe(400)

      const err = await callbackPromise
      expect(err).toBeInstanceOf(OAuthServerError)
      expect(err.type).toBe('CALLBACK_ERROR')

      server = null
    })
  })
})
