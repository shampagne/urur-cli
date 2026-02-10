# Product Overview

urur CLIは、urur.dev（個人開発プロダクトディレクトリ）のコマンドラインツールです。開発者がターミナルから直接プロダクトを投稿・管理できます。

## Core Capabilities

- **`urur login`** - GitHub OAuthでブラウザ認証し、ローカルにトークン保存
- **`urur submit`** - ターミナルからサービス情報を投稿（Supabase直接接続）
- **`urur whoami`** - 現在のログインユーザー情報を表示
- **`urur logout`** - 認証情報をクリア

## Target Use Cases

- **個人開発者**: ターミナルから素早くサービスを投稿したい
- **CLIユーザー**: GUIよりコマンドラインでの作業を好むエンジニア

## Value Proposition

- **ターミナルネイティブ**: エンジニアが慣れ親しんだ環境で完結
- **高速投稿**: ブラウザを開かずにサービス登録
- **npxで即実行**: インストール不要、`npx urur submit`で即投稿

## Authentication & Data Flow

- CLI → Supabase GitHub OAuth（ブラウザ経由）→ トークンローカル保存
- 保存済みトークンでSupabase直接接続（RLSポリシー適用）
- Web側と同じSupabaseインスタンスを使用（追加コストなし）

---
_Focus on patterns and purpose, not exhaustive feature lists_
