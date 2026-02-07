# Requirements Document

## Introduction

urur CLIの各コマンドに対して、詳細なヘルプテキスト（引数・オプション・使用例）を定義する。Commander.jsの組み込みヘルプ機能を活用し、`urur --help` および `urur <command> --help` で仕様レベルの情報を表示する。このヘルプ定義が各コマンドの実装仕様としても機能する。

## Requirements

### Requirement 1: グローバルヘルプ
**Objective:** As a CLI利用者, I want `urur --help` で全コマンドの概要を確認したい, so that 利用可能なコマンドをすぐに把握できる

#### Acceptance Criteria
1. `urur --help` を実行すると、CLIの説明文「CLI for urur.dev - 個人開発サービスディレクトリ」が表示される
2. 全4コマンド（login, logout, submit, whoami）が一覧表示される
3. 各コマンドに日本語の短い説明が付与されている
4. バージョン情報が `urur --version` で表示される

### Requirement 2: login コマンドヘルプ
**Objective:** As a CLI利用者, I want `urur login --help` でログイン手順とオプションを確認したい, so that 認証方法を理解して実行できる

#### Acceptance Criteria
1. `urur login --help` を実行すると、コマンドの説明「GitHub OAuthでログイン」が表示される
2. オプション `--port <number>` が表示され、デフォルト値8976が明記されている
3. 使用例として `urur login` と `urur login --port 3000` が表示される
4. 認証フローの概要（ブラウザが開く → GitHubで認証 → トークン保存）が説明文に含まれる

### Requirement 3: submit コマンドヘルプ
**Objective:** As a CLI利用者, I want `urur submit --help` で投稿に必要な情報とオプションを確認したい, so that サービス投稿を正しく実行できる

#### Acceptance Criteria
1. `urur submit --help` を実行すると、コマンドの説明「サービスを投稿」が表示される
2. 以下のオプションが表示される:
   - `--name <name>` サービス名（必須）
   - `--url <url>` サービスURL（必須）
   - `--tagline <text>` タグライン（200文字以内）
   - `--description <text>` 説明（2000文字以内）
   - `--logo-url <url>` ロゴURL
   - `-i, --interactive` 対話モードで入力
3. 使用例として以下が表示される:
   - `urur submit -i`（対話モード）
   - `urur submit --name "My App" --url "https://example.com"`（ワンライナー）
4. オプション未指定かつ `-i` なしの場合は対話モードにフォールバックする旨が記載されている

### Requirement 4: whoami コマンドヘルプ
**Objective:** As a CLI利用者, I want `urur whoami --help` で何が表示されるかを確認したい, so that ログイン状態を確認する方法を理解できる

#### Acceptance Criteria
1. `urur whoami --help` を実行すると、コマンドの説明「ログイン中のユーザー情報を表示」が表示される
2. 引数・オプションなし（シンプルなコマンド）
3. 表示される情報の例（GitHubユーザー名、メールアドレス）が説明に含まれる
4. 未ログイン時のエラーメッセージについて記載されている

### Requirement 5: logout コマンドヘルプ
**Objective:** As a CLI利用者, I want `urur logout --help` でログアウトの動作を確認したい, so that 安全に認証情報を削除できる

#### Acceptance Criteria
1. `urur logout --help` を実行すると、コマンドの説明「ログアウト（認証情報を削除）」が表示される
2. 引数・オプションなし
3. `~/.urur/credentials.json` が削除される旨が説明に含まれる

### Requirement 6: ヘルプ表示のテスト
**Objective:** As a 開発者, I want ヘルプ出力が仕様通りであることをテストで保証したい, so that コマンド仕様の変更を検知できる

#### Acceptance Criteria
1. 各コマンドの `--help` 出力に、定義したオプション名が含まれることをテストで検証する
2. `urur --help` の出力に全4コマンドが含まれることをテストで検証する
3. テストはVitestで実行される
