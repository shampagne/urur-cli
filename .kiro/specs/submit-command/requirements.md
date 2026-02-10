# Requirements Document

## Introduction
urur CLIの`submit`コマンドを実装する。ユーザーがターミナルからサービス情報を投稿（Supabase DB INSERT）できるようにする。認証チェック、対話モード/CLIオプションによる入力、バリデーション、投稿処理を含む。

## Requirements

### Requirement 1: 認証チェック
**Objective:** As a CLIユーザー, I want submitコマンド実行時に認証状態を自動チェックしてほしい, so that 未認証のまま投稿を試みることがない

#### Acceptance Criteria
1. When ユーザーが`urur submit`を実行した時, the CLI shall ローカルの認証情報（credentials）を読み込み、Supabaseセッションを設定する
2. If 認証情報が存在しない場合, the CLI shall エラーメッセージ「ログインが必要です。`urur login` を実行してください。」を表示し、exitCode 1で終了する
3. If 認証情報が無効またはセッション設定に失敗した場合, the CLI shall エラーメッセージを表示し、exitCode 1で終了する

### Requirement 2: 対話モード入力
**Objective:** As a CLIユーザー, I want 対話形式でサービス情報を入力したい, so that オプションを覚えなくても投稿できる

#### Acceptance Criteria
1. When ユーザーが`-i`または`--interactive`オプションを指定した場合, the CLI shall 対話プロンプトでサービス名、URL、タグライン、説明、ロゴURLを順に入力させる
2. When 必須オプション（name, url）が未指定かつ`-i`も未指定の場合, the CLI shall 自動的に対話モードにフォールバックする
3. The CLI shall 対話プロンプトでサービス名とURLを必須入力として扱い、タグライン・説明・ロゴURLは省略可能とする

### Requirement 3: CLIオプション入力
**Objective:** As a CLIユーザー, I want コマンドラインオプションでサービス情報を指定したい, so that スクリプトやワンライナーで投稿できる

#### Acceptance Criteria
1. When ユーザーが`--name`と`--url`を指定した場合, the CLI shall 対話プロンプトを表示せずにそれらの値を使用する
2. Where `--tagline`、`--description`、`--logo-url`が指定された場合, the CLI shall それらのオプショナルフィールドも投稿データに含める

### Requirement 4: バリデーション
**Objective:** As a CLIユーザー, I want 入力データが投稿前に検証されてほしい, so that 不正なデータが送信されない

#### Acceptance Criteria
1. When 入力データが収集された後, the CLI shall 既存の`validateAll()`関数を使って全フィールドをバリデーションする
2. If バリデーションエラーがある場合, the CLI shall 各フィールドのエラーメッセージを一覧表示し、exitCode 1で終了する
3. The CLI shall バリデーション通過後にのみSupabaseへの投稿処理を実行する

### Requirement 5: サービス投稿（DB INSERT）
**Objective:** As a CLIユーザー, I want バリデーション済みデータをSupabaseに投稿したい, so that urur.devにサービスが登録される

#### Acceptance Criteria
1. When バリデーションが成功した場合, the CLI shall Supabaseの`services`テーブルに`ServiceInsert`型のデータをINSERTする（`source: 'cli'` を含む）
2. When 投稿が成功した場合, the CLI shall 成功メッセージとサービス名を表示する
3. If Supabaseへの投稿が失敗した場合, the CLI shall エラーメッセージを表示し、exitCode 1で終了する
4. While 投稿処理中, the CLI shall ローディングスピナーを表示してユーザーに処理中であることを示す

### Requirement 6: 投稿前確認
**Objective:** As a CLIユーザー, I want 投稿前に入力内容を確認したい, so that 誤った情報を投稿しない

#### Acceptance Criteria
1. When バリデーションが成功した後, the CLI shall 入力内容のサマリーを表示し、投稿してよいか確認プロンプトを表示する
2. If ユーザーが確認プロンプトで「いいえ」を選択した場合, the CLI shall 投稿をキャンセルし、キャンセルメッセージを表示して正常終了する
