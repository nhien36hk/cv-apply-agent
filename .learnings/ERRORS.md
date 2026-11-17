# CV Apply Agent — Error & Fix Memory

## [ERR-20261116-001] google_oauth_blocked_and_cookie_key_mismatch_on_linux

**Logged**: 2026-11-16T23:57:00+07:00
**Priority**: high
**Status**: resolved
**Area**: auth/profile

### Summary
1. Google OAuth blocks `"Sign in with Google"` inside `agent-browser` (`"This browser or app may not be secure"`) because `agent-browser` launches Chrome with `--remote-debugging-port=0`.
2. Logging in via normal Chrome on Linux with the same `--user-data-dir` fails to persist to `agent-browser` because normal Chrome encrypts cookies with the system keyring (`v11`), whereas `agent-browser` runs Chrome with `--password-store=basic` (`v10`).

### Error
```
This browser or app may not be secure. Learn more
Try using a different browser. If you're already using a supported browser, you can try again to sign in.
```

### Verified Optimal Fix
1. Close any running `agent-browser` session (`agent-browser close --all`) to release the profile lock.
2. Launch normal Chrome with `--password-store=basic` pointing to the shared persistent profile directory:
   ```bash
   google-chrome --password-store=basic --user-data-dir=/home/nhien36hk/.agent-browser/job-profile https://itviec.com
   ```
3. Complete login manually, then **completely close** that Chrome window (verify no `job-profile` Chrome process remains) before running `agent-browser`.

---

## [ERR-20261116-002] headless_403_forbidden_from_headlesschrome_user_agent

**Logged**: 2026-11-16T23:57:00+07:00
**Priority**: high
**Status**: resolved
**Area**: headless/anti-bot

### Summary
Headless `agent-browser` fails with `403 Forbidden` on bot-protected recruitment sites (e.g., ITviec) because default headless Chrome sends `HeadlessChrome/...` in `navigator.userAgent`.

### Error
```
✓ 403 Forbidden
  https://itviec.com/
- heading "403 Forbidden" [level=1, ref=e1]
```

### Verified Optimal Fix
Set a clean desktop Chrome `userAgent` (without `HeadlessChrome`), `executablePath`, and persistent `profile` in `/home/nhien36hk/.agent-browser/config.json`:
```json
{
  "executablePath": "/usr/bin/google-chrome",
  "profile": "/home/nhien36hk/.agent-browser/job-profile",
  "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"
}
```

---

## [ERR-20261117-003] itviec_cover_letter_500_char_js_limit

**Logged**: 2026-11-17T00:03:00+07:00
**Priority**: medium
**Status**: resolved
**Area**: form/validation

### Summary
ITviec's Cover Letter textarea (`#job_application_advantages`) reports `maxLength: -1` in the DOM, but client-side JS validation silently blocks submission when the text exceeds 500 characters.

### Error
```
Please enter no more than 500 characters.
```

### Verified Optimal Fix
Always enforce `length <= 500` characters (ideally ~400–460 characters) when filling `#job_application_advantages` on ITviec.

---

## [ERR-20261117-004] itviec_apply_gated_by_cloudflare_turnstile

**Logged**: 2026-11-17T00:03:00+07:00
**Priority**: high
**Status**: resolved
**Area**: anti-bot/turnstile

### Summary
ITviec's job application form (`/job_applications/new`) includes a Cloudflare Turnstile anti-bot check (`input[name="cf-turnstile-response"]`). In headless `agent-browser` mode, `cf-turnstile-response` stays empty (`valLen: 0`), preventing `Send my CV` from submitting.

### Error
```
cf-turnstile-response value length = 0 (form stays on /job_applications/new)
```

### Verified Optimal Fix
Use a human-in-the-loop workflow on Turnstile-gated forms:
1. Have the agent prepare the application (search job, upload CV, fill fields and <=500-char Cover Letter, check agreement box).
2. Hand off to a visible browser window (`--headed` or normal Chrome) so the user completes the Cloudflare Turnstile verification and clicks `Send my CV`.

---

## [ERR-20261117-005] tailoring_condensed_paper2_into_single_bullet

**Logged**: 2026-11-17T00:36:00+07:00
**Priority**: high
**Status**: resolved
**Area**: cv-tailoring/story-memory

### Summary
When trying to keep tailored CVs to 1 A4 page, Paper 2 (CITA First-Author Paper) was compressed and merged into Paper 3's bullet instead of preserving all 3 research papers separately with their 2-layer `Challenge & Solution` and `Key Results` structure.

### Verified Optimal Fix
Never merge, compress into one bullet, or omit any of the 3 primary Inseclab papers when tailoring. To fit on 1 single A4 page (`📊 Pages: 1`), keep all 3 papers separate with their 2-layer structure and instead select **2 most relevant projects** (instead of 3) and/or tune `--font-size` (`8.5pt–8.75pt`) and `--page-margin` (`0.20in 0.30in`).

---

## [ERR-20261117-006] weak_model_fabricates_education_coursework_and_weakens_cv_facts

**Logged**: 2026-11-17T01:10:00+07:00
**Priority**: high
**Status**: resolved
**Area**: cv-tailoring/fact-integrity

### Summary
Observed during sealed Docker test (`3.8 flash high`): the agent invented `2022 - 2026 (Expected)` and `Coursework: Data Structures, Algorithms, Machine Learning, Artificial Intelligence` in `Education` when the user only stated `2026`, overwrote `config/cv-facts.json` deleting standard AI-slop `forbidden_phrases` (letting `"Proven research track record"` pass into the CV summary), and added `allow_swaps` to silence `verify-cv-facts.mjs` warnings instead of fixing CV prose.

### Verified Optimal Fix
1. Explicitly forbid adding unstated `Coursework`, start years, or `education.description` in `SKILL.md`.
2. Explicitly forbid deleting default `forbidden_phrases` from `config/cv-facts.json` or adding `allow_swaps` to bypass `verify-cv-facts.mjs` warnings; fix the CV phrasing instead.

---

## [ERR-20261117-007] weak_model_confuses_story_memory_with_story_bank_and_strips_labels

**Logged**: 2026-11-17T01:10:00+07:00
**Priority**: high
**Status**: resolved
**Area**: cv-tailoring/story-memory

### Summary
Observed during sealed Docker test (`3.8 flash high`): when asked for `"Story Memory"`, the agent generated `interview-prep/story-bank.md` (STAR+R interview prep) while stripping the `Challenge & Solution:` and `Key Results:` two-tier narrative labels from the CV bullets and flattening project bullets, also skipping `verify-cv-structure.mjs`.

### Verified Optimal Fix
1. Clarify in `SKILL.md` that CV Story Memory means preserving `Challenge & Solution:` + `Key Results:` labels on every paper and Challenge + Engineering Craft + Metric on every project (NOT `interview-prep/story-bank.md`).
2. Enforce `verify-story-cv.mjs` (or portable node assertion in `SKILL.md`) plus `verify-cv-structure.mjs <payload.json>` before rendering PDFs.

---

## [ERR-20261117-008] shallow_github_mining_and_jd_heading_mismatch

**Logged**: 2026-11-17T01:10:00+07:00
**Priority**: medium
**Status**: resolved
**Area**: onboarding/github-and-jd

### Summary
Observed during sealed Docker test (`3.8 flash high`):
1. When mining GitHub repos (`ai-resume-screener`, `StudentActivityTracker`), the agent only checked `README.md` / `requirements.txt` and `head -n 45 src/pipeline.py`, missing `.agents/codebase_map.md` and `artifacts/results/` metrics (`8,000 pairs`, `vLLM`, `3,246-combination grid search`).
2. `jd-skill-gap.mjs` reported `no-requirements-section` on ITviec JDs until the agent manually inserted a `## Requirements` heading.

### Verified Optimal Fix
1. Instruct the agent in `SKILL.md` Phase 1 to scan `docs/`, `.agents/codebase_map.md`, `artifacts/results/`, and `experiments/` inside high-value repos for verified quantitative metrics.
2. Normalize the requirements heading to `## Requirements` when saving scraped JDs to `jds/{num}-{slug}.md` so `jd-skill-gap.mjs` succeeds on the first run.

---

## [ERR-20261117-009] git_credential_fill_hangs_without_terminal_prompt_disabled

**Logged**: 2026-11-17T01:25:00+07:00
**Priority**: high
**Status**: resolved
**Area**: onboarding/github

### Summary
On a fresh machine without Git credentials configured, `execFileSync('git', ['credential', 'fill'])` inside `fetch-github-summary.mjs` blocked waiting for `/dev/tty` interactive username/password prompts until killed.

### Verified Optimal Fix
Pass `env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }` and `timeout: 3000` to `execFileSync('git', ['credential', 'fill'], ...)` so unauthenticated machines fail fast and fall back to public GitHub REST API immediately.


---

## [ERR-20261117-010] github_unauth_api_403_rate_limit_in_fetch_github_summary

**Logged**: 2026-11-17T01:41:30+07:00
**Priority**: high
**Status**: resolved
**Area**: onboarding/github

### Summary
In the blank-machine container test (`45f1a388-7b8f-4f5c-a262-7d101d3f058c`), running `scripts/fetch-github-summary.mjs nhien36hk` without `gh auth` or a `GITHUB_TOKEN` hit GitHub's 60 req/hr unauthenticated IP rate limit (`HTTP 403` from `https://api.github.com/users/nhien36hk/repos`), exiting with code 1 and forcing `agy` to fall back manually via `agent-browser` + `git clone --depth 1`.

### Verified Optimal Fix
Updated `skills/cv-auto-apply/scripts/fetch-github-summary.mjs` to mark `apiBlocked = true` on `HTTP 403`/`429` and fall back automatically to parsing `https://github.com/<username>?tab=repositories` HTML for repo discovery plus `git clone --depth 1 --quiet` into an auto-cleaned temp directory (`GIT_TERMINAL_PROMPT=0`) for inspecting `README.md`, `requirements.txt`, `package.json`, `pyproject.toml`, `artifacts/results/`, `docs/`, and `src/`/`experiments/`/`app/`. Verified exit code 0 in `cv_apply_skill_sandbox` (`Auth: public only | Source: html+clone | Total repos: 17`).


---

## [ERR-20261117-011] example_payload_leak_into_cv_md

**Logged**: 2026-11-17T10:53:00+07:00
**Priority**: high
**Status**: resolved
**Area**: skill/references

### Summary
In the V3 blank-machine test (`0a76e636-c48b-4e64-88ba-4e2d3a7badfd`, `gemini-3.8-flash-high`), `references/payload-example.md` contained concrete project examples (`2,000+ active users`, `6 years`, `351 JDs`, `643 CVs`, `3,246-combination`, `SQL`, `FastAPI`). Even though `fetch-github-summary.mjs` did not print those strings, the smaller model copied them from `payload-example.md` into `cv.md` and both tailored CVs.

### Verified Optimal Fix
1. Anonymized `skills/cv-auto-apply/references/payload-example.md` completely using `<PLACEHOLDER>` schema tokens plus an explicit anti-leak warning banner.
2. Added a Ground-Truth Anti-Leak rule in `SKILL.md` Phase 1 and an unreplaced `<PLACEHOLDER>` check in `scripts/cv-quality-gate.mjs`.

---

## [ERR-20261117-012] ungrounded_jd_keyword_copied_into_cover_letter

**Logged**: 2026-11-17T10:53:00+07:00
**Priority**: medium
**Status**: resolved
**Area**: apply/cover-letter

### Summary
During V3 Turn 3 blind apply test (`task-543`), `gemini-3.8-flash-high` automatically drafted a 471-char Vietnamese Cover Letter for FINPROS (`AI Quantitative Researcher Intern`) without prompting, but copied the JD-only skill `"xử lý chuỗi thời gian"` (time series) even though `cv.md` had zero time-series experience.

### Verified Optimal Fix
Added an explicit **Strict Cover Letter Grounding Rule** in `SKILL.md` Phase 5 requiring every skill, domain, tool, and metric in `#job_application_advantages` to appear in `cv.md` or the tailored CV HTML, forbidding JD-only keyword stuffing.