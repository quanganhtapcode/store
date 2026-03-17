# Deploy to Production

Commit all staged/unstaged changes and push to main, triggering:
- **Vercel** auto-deploy for the frontend
- **GitHub Actions** CI build check + rsync backend to VPS + PM2 restart

## Steps

1. Run `git status` and `git diff --stat` to see what has changed.

2. If there are no changes to commit (clean working tree), just run `git push origin main` and skip to step 4.

3. Stage all modified tracked files (do NOT stage `implementation_plan.md`, `*.db`, `*.env`, or any file in `database/`), then create a commit. Write a concise commit message describing what changed. Use the Conventional Commits format (`fix:`, `feat:`, `chore:`, etc.).

4. Push to `origin main`.

5. Show the user:
   - The commit hash and message
   - A reminder that Vercel deploys the frontend automatically
   - A reminder that GitHub Actions deploys the backend to VPS
   - The GitHub Actions URL to watch progress: https://github.com/quanganhtapcode/store/actions
