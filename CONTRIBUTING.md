# Contributing to homelab-public

Contributions are welcome! Bug fixes, improvements, and new features are all appreciated.

## Development Setup

```bash
git clone https://github.com/abibinyun/homelab-public.git
cd homelab-public/projects/deployer
npm install
cp .env.example .env   # fill in at least ADMIN_USER, ADMIN_PASSWORD, JWT_SECRET
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
- **Error handling** — use custom error classes in `api/types/index.ts`
- **Logging** — use `logger` from `api/utils/logger.ts`, not `console.log`
- **Env vars** — add to `.env.example` with clear comments
- **No hardcoded values** — passwords, tokens, and ports must come from env variables

## Pull Request Process

1. Fork the repo and create a branch from `main`
2. Ensure `npm run build` succeeds without errors
3. Update `CHANGELOG.md` under the `[Unreleased]` section
4. Open a PR with a clear description

## Reporting Bugs

Use [GitHub Issues](https://github.com/abibinyun/homelab-public/issues) with the available template.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
