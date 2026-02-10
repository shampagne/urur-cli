# Implementation Plan

- [ ] 1. Edge Function: cli-auth の実装
- [ ] 1.1 device-code アクションの実装
  - Edge Function のエントリーポイントを作成し、リクエストボディの action フィールドでルーティングする
  - GitHub API にデバイスコード要求を送信し、user_code, verification_uri, expires_in, interval, device_code を返す
  - GITHUB_CLIENT_ID を環境変数から読み取り、GitHub API への POST リクエストに含める
  - Accept: application/json ヘッダーを付与して JSON レスポンスを取得する
  - Supabase の anon key による認可チェックを含める（Authorization ヘッダー検証）
  - GitHub API エラー時は status: error とメッセージを返す
  - _Requirements: 4.1, 4.7_

- [ ] 1.2 poll-token アクションの実装
  - device_code を受け取り、GitHub API にトークンをポーリングする
  - authorization_pending の場合は status: pending を返す
  - expired_token の場合は status: expired を返す
  - access_denied の場合は status: error とキャンセルメッセージを返す
  - 認証成功時は GitHub access_token を取得し、GitHub /user/emails API で verified かつ primary のメールアドレスを取得する
  - verified メールがない場合は status: error を返す
  - admin.generateLink({ type: 'magiclink', email }) で hashed_token を取得し、verifyOtp({ token_hash, type: 'email' }) で Supabase セッションを生成する
  - GitHub /user API からユーザー名を取得し、セッション情報と合わせて返す
  - SUPABASE_SERVICE_ROLE_KEY はサーバーサイドのみで使用する
  - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [ ] 1.3 Edge Function のテスト
  - device-code アクションが GitHub API を呼び出し、正しいレスポンスを返すことをテストする
  - poll-token アクションの各ステータス（pending, expired, success, error）をテストする
  - GitHub API からの verified メール取得とセッション生成の統合をテストする
  - 不正なアクション名やリクエストボディに対するエラーレスポンスをテストする
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 2. CLI: EdgeFunctionAPI クライアントの実装
- [ ] 2.1 (P) Edge Function への HTTP 通信モジュールの実装
  - SUPABASE_URL から Edge Function の URL を構築する（/functions/v1/cli-auth）
  - requestDeviceCode 関数を実装し、action: device-code をリクエストして DeviceCodeResponse を返す
  - pollToken 関数を実装し、action: poll-token と deviceCode をリクエストして PollTokenResponse を返す
  - リクエスト時に Authorization ヘッダーに anon key を含める
  - HTTP エラーとネットワークエラーのハンドリングを実装する
  - _Requirements: 4.1, 4.2, 5.2_

- [ ] 2.2 (P) EdgeFunctionAPI のテスト
  - requestDeviceCode が正しいリクエストを構築し、レスポンスをパースすることをテストする
  - pollToken の各ステータスレスポンスを正しくパースすることをテストする
  - HTTP エラーとネットワークエラーのハンドリングをテストする
  - _Requirements: 4.1, 4.2, 5.2_

- [ ] 3. CLI: DeviceFlow モジュールの実装
- [ ] 3.1 デバイスコード取得とポーリング制御の実装
  - EdgeFunctionAPI を使用してデバイスコードを取得する requestDeviceCode 関数を実装する
  - pollForSession 関数を実装し、interval に基づいてポーリングを繰り返す
  - slow_down エラー時にポーリング間隔を +5 秒に調整する
  - expires_in に基づいてタイムアウトを制御し、期限切れ時にエラーをスローする
  - 成功時に DeviceFlowSession（accessToken, refreshToken, expiresAt, userName）を返す
  - _Requirements: 2.1, 2.3, 2.4, 5.1_

- [ ] 3.2 DeviceFlow のテスト
  - ポーリング間隔が interval に従うことをテストする
  - slow_down レスポンス後に間隔が +5 秒されることをテストする
  - expires_in 経過後にタイムアウトエラーが発生することをテストする
  - 認証成功時に正しいセッション情報が返ることをテストする
  - expired_token と access_denied のエラーハンドリングをテストする
  - _Requirements: 2.1, 2.3, 2.4, 5.1_

- [ ] 4. CLI: MagicLink モジュールの実装
- [ ] 4.1 (P) OTP 送信と検証の実装
  - Supabase の signInWithOtp を使用してメールアドレスに OTP を送信する sendOtp 関数を実装する
  - verifyOtp 関数を実装し、メールアドレスと OTP トークンで Supabase セッションを取得する
  - 成功時に MagicLinkSession（accessToken, refreshToken, expiresAt, email）を返す
  - Supabase のエラーをハンドリングし、適切なエラーメッセージを生成する
  - _Requirements: 3.2, 3.4_

- [ ] 4.2 (P) MagicLink のテスト
  - sendOtp がメールアドレスで Supabase signInWithOtp を呼び出すことをテストする
  - verifyOtp が正しいセッション情報を返すことをテストする
  - Supabase API エラー時のハンドリングをテストする
  - _Requirements: 3.2, 3.4_

- [ ] 5. CLI: login コマンドの書き換え
- [ ] 5.1 ログイン方法の選択と既存ログイン確認の実装
  - 既存の認証情報を確認し、ログイン済みの場合はユーザー名を表示して再ログインを確認する
  - ログイン方法の選択肢（GitHub / メールアドレス）を表示する
  - 選択に応じて GitHub Device Flow または Magic Link フローを呼び出す
  - --port オプションを削除し、oauthServer への依存を除去する
  - WEB_URL の consent ページへの依存を除去する
  - _Requirements: 1.1, 1.2, 1.3, 6.1, 6.2, 6.3_

- [ ] 5.2 GitHub Device Flow のユーザーインタラクション実装
  - DeviceFlow モジュールを呼び出してデバイスコードを取得する
  - ユーザーコードと認証 URL を視覚的にわかりやすく表示する
  - 認証 URL をブラウザで自動的に開く
  - スピナーを表示しながらポーリングでセッション取得を待つ
  - 成功時に認証情報をローカルに保存し、ユーザー名を表示する
  - タイムアウト、ネットワークエラー、Edge Function エラーのメッセージを表示する
  - エラー時は process.exitCode = 1 を設定する（process.exit は使用しない）
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3, 5.5_

- [ ] 5.3 Magic Link のユーザーインタラクション実装
  - メールアドレスの入力を求め、バリデーションを行う（無効な場合は再入力）
  - MagicLink モジュールを呼び出して OTP を送信する
  - OTP コードの入力を求め、検証する
  - 無効な OTP の場合はエラーを表示して再入力を求める（最大3回）
  - 3回失敗した場合はメールの再送を提案する
  - 成功時に認証情報をローカルに保存し、成功メッセージを表示する
  - エラー時は process.exitCode = 1 を設定する（process.exit は使用しない）
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.4, 5.5_

- [ ] 5.4 login コマンドのテスト
  - ログイン方法の選択が正しく表示されることをテストする
  - 既存ログイン状態での再ログイン確認をテストする
  - GitHub 選択時に DeviceFlow モジュールが呼ばれることをテストする
  - メール選択時に MagicLink モジュールが呼ばれることをテストする
  - 各エラーケースのメッセージと exitCode をテストする
  - _Requirements: 1.1, 1.2, 1.3, 5.2, 5.3, 5.5_

- [ ] 6. 既存コードのクリーンアップ
- [ ] 6.1 ローカルサーバー関連コードの削除
  - oauthServer モジュールとそのテストファイルを削除する
  - program.ts から --port オプションの定義を削除する
  - login コマンドのヘルプテキストから --port の説明を削除する
  - 未使用の import を削除する
  - 全テストが通ることを確認する
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 7. 統合テストと動作検証
- [ ] 7.1 GitHub Device Flow の統合テスト
  - login コマンド → DeviceFlow → EdgeFunctionAPI の全フローをモック付きでテストする
  - デバイスコード表示 → ポーリング → セッション保存の一連の流れを検証する
  - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 7.2 Magic Link の統合テスト
  - login コマンド → MagicLink → Supabase の全フローをモック付きでテストする
  - メール入力 → OTP 送信 → OTP 入力 → セッション保存の一連の流れを検証する
  - OTP リトライと再送提案フローをテストする
  - _Requirements: 1.2, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.4_
