# urur

CLI for [urur.dev](https://urur.dev) - 個人開発プロダクトディレクトリ

## Install

```bash
npm install -g urur
```

Or run directly:

```bash
npx urur
```

## Commands

### `urur login`

GitHub または メールアドレスでログインします。

```bash
urur login
```

- **GitHub**: Device Flow でブラウザ認証（認証コードを入力）
- **メールアドレス**: Magic Link（OTP コード）で認証

### `urur submit`

プロダクトを投稿します。

```bash
# 対話モード
urur submit -i

# オプション指定
urur submit --name "My App" --url "https://example.com"
urur submit --name "My App" --url "https://example.com" --tagline "便利なツール"
```

### `urur whoami`

ログイン中のユーザー情報を表示します。

```bash
urur whoami
```

### `urur logout`

ログアウトして認証情報を削除します。

```bash
urur logout
```

## Requirements

- Node.js >= 18

## License

[MIT](LICENSE)
