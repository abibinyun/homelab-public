# Contributing to homelab-public

Contributions are welcome! Bug fixes, improvements, and new features are all appreciated.

## Development Setup

```bash
git clone https://github.com/abibinyun/homelab-public.git
cd homelab-public/projects/deployer
npm install
cp .env.example .env   # isi ADMIN_USER, ADMIN_PASSWORD, JWT_SECRET minimal
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`

## Project Structure

```
projects/deployer/
├── src/          # React frontend (Vite + TypeScript)
├── api/          # Express backend (TypeScript)
│   ├── controllers/
│   ├── services/
│   ├── middleware/
│   └── routes/
```

## Guidelines

- **TypeScript** — no `any` unless unavoidable
- **Error handling** — gunakan custom error classes di `api/types/index.ts`
- **Logging** — gunakan `logger` dari `api/utils/logger.ts`, bukan `console.log`
- **Env vars** — tambah ke `.env.example` dengan komentar yang jelas
- **No hardcoded values** — passwords, tokens, ports harus dari env variable

## Pull Request Process

1. Fork repo dan buat branch dari `main`
2. Pastikan `npm run build` berhasil tanpa error
3. Update `CHANGELOG.md` di bagian `[Unreleased]`
4. Buat PR dengan deskripsi yang jelas

## Reporting Bugs

Gunakan [GitHub Issues](https://github.com/abibinyun/homelab-public/issues) dengan template yang tersedia.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
