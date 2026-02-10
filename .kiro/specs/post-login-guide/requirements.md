# Requirements Document

## Introduction
ログイン成功後に、ユーザーが次に何をすべきかを案内するメッセージを表示する機能。初回ログインのユーザーが迷わず `urur submit` や `urur whoami` を実行できるようにする。

## Requirements

### Requirement 1: ログイン成功後のガイドメッセージ表示
**Objective:** As a CLI ユーザー, I want ログイン成功後に次のコマンドを案内してほしい, so that 初めてでも迷わずプロダクト投稿に進める

#### Acceptance Criteria
1. When GitHub Device Flow でログインに成功した場合, the CLI shall 「ログイン成功」メッセージの後に次のコマンド案内を表示する
2. When Magic Link（メール OTP）でログインに成功した場合, the CLI shall 同様に次のコマンド案内を表示する
3. The CLI shall 案内メッセージに `urur submit` と `urur whoami` の2つのコマンドを含める
4. The CLI shall 各コマンドの簡潔な説明（1行）を併記する
5. The CLI shall 案内メッセージを既存の「ログイン成功: ユーザー名」の後に表示する

### Requirement 2: 再ログイン時の表示制御
**Objective:** As a 既存ユーザー, I want 再ログイン時も同じ案内を見たい, so that コマンドを忘れていても思い出せる

#### Acceptance Criteria
1. When 既存セッションがある状態で再ログインした場合, the CLI shall ログイン成功後に同じガイドメッセージを表示する
