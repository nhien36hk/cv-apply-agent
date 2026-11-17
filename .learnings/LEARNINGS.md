# CV Apply Agent — Verified Setup & Patterns

- **Reuse system Chrome + persistent profile:** Set `executablePath` (`/usr/bin/google-chrome`), `profile` (`/home/nhien36hk/.agent-browser/job-profile`), and a desktop `userAgent` (no `HeadlessChrome`) in `/home/nhien36hk/.agent-browser/config.json`.
- **One-time Google OAuth login on Linux:** Always launch normal Chrome with `--password-store=basic --user-data-dir=/home/nhien36hk/.agent-browser/job-profile <url>` and close it completely afterward so `agent-browser` can decrypt the saved cookies.
- **Avoid profile lock:** Never launch `agent-browser` while a normal Chrome window is still open on `job-profile` (`ps aux | grep -F "job-profile"` should be empty).
- **Live monitoring without GPU overhead:** Use `agent-browser dashboard start` (`http://localhost:4848`) to watch headless runs; use `--headed` only when human intervention (CAPTCHA, 2FA) is needed.
- **ITviec Apply form limits:** `#job_application_advantages` (Cover Letter) enforces `<= 500` characters via JS validation despite `maxLength: -1`, and submission is gated by Cloudflare Turnstile (`cf-turnstile-response`).
- **agent-browser tab & ref rules:** `agent-browser tab <id>` requires stable tab IDs (e.g., `t1`, `t2` from `agent-browser tab list`), not positional integers. Always run a fresh `agent-browser snapshot -i` after switching tabs before reusing `@eN` refs.
