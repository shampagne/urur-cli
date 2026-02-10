# Research & Design Decisions

## Summary
- **Feature**: `post-login-guide`
- **Discovery Scope**: Simple Addition
- **Key Findings**:
  - ログイン成功メッセージは `loginWithGitHub()` と `loginWithEmail()` の2箇所で個別に出力されている
  - picocolors (`pc`) でカラー出力、`console.log` で表示するパターンが確立済み
  - 既存テストは `consoleSpy.mock.calls.flat().join('\n')` で出力内容を検証している

## Research Log

### ログイン成功メッセージの出力箇所
- **Context**: ガイドメッセージの挿入位置を特定するための調査
- **Sources Consulted**: `src/commands/login.ts`
- **Findings**:
  - GitHub フロー: L89 `console.log(pc.green(\`ログイン成功: ${session.userName}\`))`
  - Email フロー: L126 `console.log(pc.green(\`ログイン成功: ${session.email}\`))`
  - 両フローとも `saveCredentials()` の後に成功メッセージを出力
- **Implications**: ガイドメッセージ表示をヘルパー関数に抽出し、両フローから呼び出すのが最もシンプル

### 既存テストパターン
- **Context**: テスト方法の確認
- **Sources Consulted**: `tests/commands/login.test.ts`
- **Findings**:
  - `vi.spyOn(console, 'log')` で出力をキャプチャ
  - `consoleSpy.mock.calls.flat().join('\n')` で全出力を結合して `toContain` で検証
  - `vi.resetAllMocks()` を `beforeEach` で使用
- **Implications**: 同じパターンでガイドメッセージの出力を検証可能

## Design Decisions

### Decision: ガイドメッセージ表示のヘルパー関数化
- **Context**: GitHub / Email の両フローで同じガイドメッセージを表示する必要がある
- **Alternatives Considered**:
  1. 各フロー内にインラインで記述 — コード重複が発生
  2. ヘルパー関数 `printPostLoginGuide()` を抽出 — DRY、テスト容易
- **Selected Approach**: ヘルパー関数として `login.ts` 内に `printPostLoginGuide()` を定義
- **Rationale**: 同一ファイル内のプライベート関数で十分。別モジュールにする必要なし
- **Trade-offs**: 関数がモジュール外からテストしにくいが、出力結果で間接的に検証可能

## Risks & Mitigations
- リスクは特になし。既存パターンの延長で実装可能

## References
- picocolors: ターミナルカラー出力ライブラリ（既に使用中）
