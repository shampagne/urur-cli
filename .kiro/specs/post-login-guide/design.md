# Design Document: post-login-guide

## Overview

**Purpose**: ログイン成功後に次のステップを案内するガイドメッセージを表示し、初回ユーザーが迷わず `urur submit` や `urur whoami` を実行できるようにする。

**Users**: CLI でログインした全ユーザー（初回・再ログイン問わず）。

**Impact**: `login.ts` の GitHub / Email 両フローのログイン成功メッセージ直後にガイド出力を追加する。

### Goals
- ログイン成功後に `urur submit` と `urur whoami` の案内を表示する
- 両ログイン方法（GitHub / Email）で同一のガイドメッセージを出す
- 再ログイン時も同じ案内を表示する

### Non-Goals
- 初回/再ログインで案内内容を切り替える
- ガイドメッセージの表示/非表示を設定で制御する
- ログイン以外のコマンドでガイドを表示する

## Architecture

### Existing Architecture Analysis

現在の `login.ts` は以下の構造:

- `login()`: エントリーポイント。既存ログイン確認 → 方法選択 → フロー実行
- `loginWithGitHub()`: Device Flow でログイン → `saveCredentials` → `console.log(pc.green(\`ログイン成功: ${userName}\`))`
- `loginWithEmail()`: OTP でログイン → `saveCredentials` → `console.log(pc.green(\`ログイン成功: ${email}\`))`

ログイン成功メッセージは各フロー内で個別に出力されている。

### Architecture Pattern & Boundary Map

**Architecture Integration**:
- Selected pattern: 既存コマンドファイル内にヘルパー関数を追加（新モジュール不要）
- Domain/feature boundaries: `login.ts` 内で完結
- Existing patterns preserved: `console.log` + `picocolors` による出力パターン
- New components rationale: `printPostLoginGuide()` ヘルパー関数1つのみ追加
- Steering compliance: 1コマンド1ファイルの原則を維持

### Technology Stack

| Layer | Choice / Version | Role in Feature | Notes |
|-------|------------------|-----------------|-------|
| CLI | picocolors 1.1.1 | カラー出力（コマンド名のハイライト） | 既存依存 |

新規依存なし。

## Requirements Traceability

| Requirement | Summary | Components | Interfaces | Flows |
|-------------|---------|------------|------------|-------|
| 1.1 | GitHub ログイン後にガイド表示 | printPostLoginGuide | — | GitHub フロー |
| 1.2 | Email ログイン後にガイド表示 | printPostLoginGuide | — | Email フロー |
| 1.3 | submit と whoami の2コマンドを含む | printPostLoginGuide | — | — |
| 1.4 | 各コマンドに簡潔な説明を併記 | printPostLoginGuide | — | — |
| 1.5 | 「ログイン成功」の後に表示 | loginWithGitHub, loginWithEmail | — | 両フロー |
| 2.1 | 再ログイン時も同じガイド表示 | printPostLoginGuide | — | 再ログインフロー |

## Components and Interfaces

| Component | Domain/Layer | Intent | Req Coverage | Key Dependencies | Contracts |
|-----------|--------------|--------|--------------|------------------|-----------|
| printPostLoginGuide | CLI / Output | ログイン後ガイドメッセージの表示 | 1.1-1.5, 2.1 | picocolors (P2) | — |

### CLI / Output

#### printPostLoginGuide

| Field | Detail |
|-------|--------|
| Intent | ログイン成功後に次のコマンド案内を表示する |
| Requirements | 1.1, 1.2, 1.3, 1.4, 1.5, 2.1 |

**Responsibilities & Constraints**
- `urur submit` と `urur whoami` の2コマンドを案内メッセージとして出力する
- 各コマンドに1行の日本語説明を併記する
- 「ログイン成功」メッセージの直後に呼び出される

**Dependencies**
- External: picocolors — コマンド名のハイライト表示 (P2)

**出力フォーマット**:
```
次のステップ:
  urur submit   - プロダクトを投稿する
  urur whoami   - ログイン中のユーザー情報を表示する
```

- 空行で「ログイン成功」メッセージと区切る
- 「次のステップ:」をヘッダーとして表示
- コマンド名は `pc.cyan()` でハイライト
- 説明は通常色

**Implementation Notes**
- `login.ts` 内のモジュールプライベート関数として定義
- `loginWithGitHub()` と `loginWithEmail()` の成功メッセージ直後に呼び出し
- テストは `consoleSpy` の出力内容で間接的に検証

## Error Handling

エラー処理の追加は不要。`printPostLoginGuide()` は `console.log` のみで構成され、例外を発生させない。

## Testing Strategy

### Unit Tests
- GitHub ログイン成功時にガイドメッセージが出力されることを検証
- Email ログイン成功時にガイドメッセージが出力されることを検証
- 再ログイン成功時にガイドメッセージが出力されることを検証
- ガイドメッセージに `urur submit` と `urur whoami` が含まれることを検証
- ガイドメッセージに各コマンドの説明が含まれることを検証
