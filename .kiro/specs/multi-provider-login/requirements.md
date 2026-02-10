# Requirements Document

## Introduction
ログインページを GitHub OAuth のみの対応から、GitHub / Google / Email Magic Link の3プロバイダに対応するよう刷新する。あわせてページのキャッチコピーを「ログイン」から「個人開発を世界へ」に変更し、新規ユーザーへの訴求力を高める。対象は Web 側のログインページ（`web/app/routes/login.tsx`）であり、既存の認証コールバック（`web/app/routes/auth/callback.tsx`）は変更しない。

## Requirements

### Requirement 1: ページコピーの刷新
**Objective:** ユーザーとして、ログインページでサービスのビジョンが伝わるキャッチコピーを見たい。それにより、サービスの価値を直感的に理解できる。

#### Acceptance Criteria
1. The ログインページ shall ページ見出し（h1）に「個人開発を世界へ」を表示する
2. The ログインページ shall 見出し下の説明文に「アカウントを作成して、サービスを投稿しましょう」を表示する
3. The ログインページ shall 従来の「ログイン」という見出しを表示しない

### Requirement 2: GitHub OAuth ログイン
**Objective:** ユーザーとして、GitHub アカウントでログインしたい。それにより、既存の GitHub アカウントを使って素早くサービスに参加できる。

#### Acceptance Criteria
1. The ログインページ shall 「GitHub で続ける」ボタンを表示する
2. When ユーザーが「GitHub で続ける」ボタンをクリックした時, the ログインページ shall Supabase の `signInWithOAuth({ provider: 'github' })` を実行し、GitHub の認証画面にリダイレクトする
3. While GitHub OAuth のリダイレクト処理中, the ログインページ shall ボタンをローディング状態（無効化 + スピナー表示）にする
4. If GitHub OAuth の開始に失敗した場合, the ログインページ shall エラーメッセージを表示し、ボタンを元の状態に復帰させる

### Requirement 3: Google OAuth ログイン
**Objective:** ユーザーとして、Google アカウントでログインしたい。それにより、GitHub を持たないユーザーでもサービスに参加できる。

#### Acceptance Criteria
1. The ログインページ shall 「Google で続ける」ボタンを表示する
2. When ユーザーが「Google で続ける」ボタンをクリックした時, the ログインページ shall Supabase の `signInWithOAuth({ provider: 'google' })` を実行し、Google の認証画面にリダイレクトする
3. While Google OAuth のリダイレクト処理中, the ログインページ shall ボタンをローディング状態（無効化 + スピナー表示）にする
4. If Google OAuth の開始に失敗した場合, the ログインページ shall エラーメッセージを表示し、ボタンを元の状態に復帰させる

### Requirement 4: Email Magic Link ログイン
**Objective:** ユーザーとして、メールアドレスだけでログインしたい。それにより、ソーシャルアカウントを使わずにサービスに参加できる。

#### Acceptance Criteria
1. The ログインページ shall 「メールアドレスで続ける」ボタンを表示する
2. When ユーザーが「メールアドレスで続ける」ボタンをクリックした時, the ログインページ shall メールアドレス入力欄と「ログインリンクを送信」ボタンを表示する
3. When ユーザーがメールアドレスを入力して送信ボタンをクリックした時, the ログインページ shall Supabase の `signInWithOtp({ email })` を実行する
4. When Magic Link の送信が成功した時, the ログインページ shall 「○○ にログインリンクを送信しました。メールを確認してください。」と成功メッセージを表示する
5. If メールアドレスが空の状態で送信ボタンがクリックされた場合, the ログインページ shall 「メールアドレスを入力してください」とバリデーションエラーを表示する
6. If Magic Link の送信に失敗した場合, the ログインページ shall エラーメッセージを表示し、送信ボタンを再度有効にする

### Requirement 5: UIレイアウトと視覚的区別
**Objective:** ユーザーとして、各ログイン方法が視覚的に区別されていて、直感的に選択したい。

#### Acceptance Criteria
1. The ログインページ shall GitHub ボタンを黒背景（`#0a0a0a`）+ 白文字で表示する
2. The ログインページ shall Google ボタンを白背景 + ボーダー（`#e4e4e7`）+ Google カラーロゴ SVG 付きで表示する
3. The ログインページ shall メールボタンを白背景 + ボーダー + メールアイコン SVG 付きで表示する
4. The ログインページ shall OAuth ボタン群とメールボタンの間に「または」の区切り線を表示する
5. The ログインページ shall GitHub ボタン → Google ボタン → 区切り線 → メールボタンの順序で表示する

### Requirement 6: エラーハンドリングの汎用化
**Objective:** ユーザーとして、どのプロバイダでも一貫したエラーメッセージを見たい。それにより、混乱なく再試行できる。

#### Acceptance Criteria
1. The ログインページ shall `access_denied` エラーに対して「認証がキャンセルされました」（プロバイダ非依存）を表示する
2. The ログインページ shall 認証コールバックからのエラーを適切にデコードして表示する
3. The ログインページ shall エラーメッセージの下に「問題が続く場合は、時間をおいて再度お試しください」の補足を表示する

### Requirement 7: 認証コールバックの互換性
**Objective:** 全プロバイダの認証フローが既存のコールバックページで正常に処理される。

#### Acceptance Criteria
1. The 認証コールバック shall GitHub OAuth の PKCE code exchange を処理する（既存動作維持）
2. The 認証コールバック shall Google OAuth の PKCE code exchange を処理する（同一ロジック）
3. The 認証コールバック shall Email Magic Link の code パラメータを処理する（同一ロジック）
4. The 認証コールバック shall 認証成功後にダッシュボード（`/dashboard`）にリダイレクトする
