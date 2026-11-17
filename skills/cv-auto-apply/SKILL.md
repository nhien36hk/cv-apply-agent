---
name: cv-auto-apply
description: "End-to-end blueprint skill for setting up an automated CV tailoring and multi-tab job application agent from scratch on a brand-new machine. Enforces deterministic gates (cv-quality-gate.mjs, fetch-github-summary.mjs, career-ops checks) so even fast/smaller models produce zero-fabrication, Story-Memory CVs and safely pre-fill 5-10 browser tabs for human submission."
---

# CV Auto-Apply & Tailoring Pipeline (`agent-browser` + `career-ops`)

This skill lives at `<SKILL_DIR>` (the directory containing this `SKILL.md`). Always resolve `<SKILL_DIR>/scripts/` and `<SKILL_DIR>/references/` relative to this file's directory.

Execute phases **strictly in order**. **NEVER skip a Phase Exit Gate.**

---

## Phase 0: Fresh Machine Bootstrap

1. **Install `agent-browser` & configure Chrome:**
   ```bash
   npm install -g agent-browser
   ```
   - Check `which google-chrome chromium brave-browser`. If missing, run `agent-browser install --with-deps` (Linux) or `agent-browser install`.
   - Write `~/.agent-browser/config.json` pointing `"executablePath"` to the installed browser, setting `"profile"` (`~/.agent-browser/job-profile`), and setting a clean desktop `"userAgent"` matching the installed Chrome major version **without `HeadlessChrome`** (prevents `403 Forbidden` on portals like ITviec).
   - Verify: `agent-browser doctor --offline --quick`

2. **Install `career-ops` & read its core rules:**
   ```bash
   git clone https://github.com/career-ops-hq/career-ops.git
   cd career-ops && npm install
   # Only run if ~/.cache/ms-playwright is missing chromium:
   ls ~/.cache/ms-playwright/chromium* >/dev/null 2>&1 || npx playwright install chromium
   ```
   - Read `AGENTS.md` and `.agents/skills/career-ops/SKILL.md` (plus `cv.md`, `config/profile.yml`, `modes/_custom.md`, `cv/*.html` if already present).
   - Run `node doctor.mjs --json --init-templates`.

3. **Phase 0 Exit Gate:** Both `agent-browser doctor --offline --quick` and `node doctor.mjs --json` run cleanly. Stop and ask Phase 1 questions.

---

## Phase 1: Candidate Onboarding & Deep GitHub Mining

1. **Ask the user:**
   - Target roles, levels (`Intern`/`Fresher`/`Junior`), and locations.
   - Original CV content/file and whether they have a custom HTML/LaTeX template.
   - GitHub username (and whether private repos should be mined).
   - Target job portals (e.g., ITviec, TopCV, LinkedIn).

2. **Run Deep GitHub Mining (NEVER just `requirements.txt`):**
   ```bash
   node <SKILL_DIR>/scripts/fetch-github-summary.mjs <github_username> --max-repos 12
   ```
   - This automatically uses `gh auth token` or `git credential fill` (including private repos without exposing tokens) or falls back to public API, and inspects `README.md`, `.agents/codebase_map.md`, `artifacts/results/`, `docs/`, and dependency manifests.
   - Filter out forks and coursework toys; extract ONLY verified metrics and mechanisms.

3. **Populate `career-ops` User Layer (`cv.md`, `config/profile.yml`, `modes/_profile.md`, `modes/_brief.md`, `portals.yml`):**
   - **NEVER fabricate `Education`:** Copy ONLY the exact degree, school, and year stated by the user. Do NOT invent `Coursework:` lists or unstated start years (`2022 - 2026`).
   - **NEVER copy example files or JD keywords into `cv.md`:** Every tool (`SQL`, `FastAPI`, etc.) and every number (`users`, `stars`, `dataset size`) in `cv.md` MUST be directly observed in user input or `fetch-github-summary.mjs` / cloned repo files. NEVER copy examples from `references/payload-example.md`.
   - **NEVER weaken `config/cv-facts.json`:** Keep default AI-slop `forbidden_phrases` (`"proven track record"`, `"passionate about"`, `"spearheaded"`, `"cutting-edge"`, `"results-oriented"`, `"delve"`). NEVER add `allow_swaps`.
   - **Keep `Challenge & Solution:` and `Key Results:`** on every research paper in `cv.md`.

4. **Phase 1 Exit Gate:** `node doctor.mjs --json` (`onboardingNeeded: false`, `unpersonalized: []`) and `node cv-sync-check.mjs` exit 0.

---

## Phase 2: One-Time Persistent Portal Login (Skip if search-only)

To prevent Google OAuth blocks (`"This browser or app may not be secure"`) and Linux cookie encryption mismatch (`v11` keyring vs `agent-browser`'s `--password-store=basic` `v10`):
1. `agent-browser close --all`
2. Have the user sign in once via normal Chrome with matching `--password-store=basic`:
   ```bash
   google-chrome --password-store=basic --user-data-dir=/home/<USER>/.agent-browser/job-profile https://itviec.com
   ```
3. **Close that Chrome window completely** (`ps aux | grep job-profile` must be empty) before running `agent-browser`.
4. Verify headless login: `agent-browser open https://itviec.com && agent-browser snapshot -i | head -n 25 && agent-browser close`.

---

## Phase 3: Job Discovery & JD Archival (Headless)

1. Search portals via `agent-browser open` in headless mode; click UI level filters (`Internship`, `Fresher`, `Junior`) rather than guessing query strings.
2. Visit each job card URL: skip any with `Applied DD/MM/YYYY` or mismatched seniority; keep **5–10 un-applied matches** with an active `Apply now` link.
3. Save each verbatim JD to `career-ops/jds/{num}-{slug}.md`.
   - **Mandatory JD Normalization:** Insert a `## Requirements` markdown heading right above the requirements section (e.g., above `"Your skills and experience"` on ITviec) so `jd-skill-gap.mjs` parses skills on the first run.

---

## Phase 4: Tailored CV Generation & Hard Quality Gates

### 3 Traps You MUST NOT Fall Into
1. **❌ Story Memory != `interview-prep/story-bank.md`:** In CV creation, *Story Memory* means writing each CV paper with `Challenge & Solution:` + `Key Results:` and each CV project with technical craft + quantitative metrics. Do **NOT** create `interview-prep/story-bank.md` unless the user asks for interview prep.
2. **❌ NEVER drop, merge, or shorten papers:** Keep EVERY research paper from `cv.md` separate with its 2-layer labels (`Challenge & Solution:` + `Key Results:`). To fit 1 A4 page, select **2 best projects** instead of 3 and/or tune `--font-size` (`8.5pt–8.75pt`).
3. **❌ NEVER tamper with `config/cv-facts.json` or invent `Coursework:`** to silence validation warnings. Fix the CV prose instead.

### Build & Validate Every Tailored CV
1. Run `node jd-skill-gap.mjs jds/{num}-{slug}.md --summary`. Never add `gap` skills.
2. Generate HTML:
   - **If user provided a custom HTML template (`cv/*.html`):** inherit 100% of its layout, CSS, colors, section order, and Experience chronology.
   - **If using `career-ops` default template:** read `<SKILL_DIR>/references/payload-example.md`, write `cv/{num}-{slug}-payload.json`, run `node build-cv-html.mjs cv/{num}-{slug}-payload.json cv/{num}-{slug}.html`, then run:
     ```bash
     node verify-cv-structure.mjs cv/{num}-{slug}-payload.json
     ```
3. **Mandatory 4-Gate Check (ALL MUST EXIT 0 before PDF export):**
   ```bash
   node verify-cv-facts.mjs cv/{num}-{slug}.html
   node <SKILL_DIR>/scripts/cv-quality-gate.mjs cv/{num}-{slug}.html --career-ops .
   node verify-ats.mjs cv/{num}-{slug}.html --min-score 70
   node keyword-match.mjs --jd-text jds/{num}-{slug}.md --cv cv/{num}-{slug}.html
   ```
   If ANY gate fails, fix the CV HTML/payload (never `cv-facts.json`) and re-run all 4 checks.
4. **Batch Render 1-Page A4 PDFs via 1 Chromium Process:**
   Create `cv/batch_manifest.json` with paths relative to `cv/` (`"input": "{num}-{slug}.html"`, `"output": "{num}-{slug}.pdf"`, `"format": "a4"`), then run:
   ```bash
   node generate-pdf.mjs --batch=cv/batch_manifest.json --format=a4 --max-pages=1 --strict-pages
   ```
   **Phase 4 Exit Gate:** `Batch complete: N ok, 0 failed` and every PDF reports `📊 Pages: 1`.

---

## Phase 5: Multi-Tab `--headed` Pre-Fill & Human Submit

1. Switch cleanly from headless to visible Chrome:
   ```bash
   agent-browser close --all
   agent-browser --headed open "<apply_url_1>"
   agent-browser --headed tab new "<apply_url_k>"
   ```
2. On each active tab, use stable CSS selectors (avoid stale `@eN` refs across tabs):
   - Click `"Upload a new CV"` radio button if present.
   - Upload job-specific PDF: `agent-browser --headed upload "#job_application_cv_local" "/abs/path/to/{num}-{slug}.pdf"`.
   - Write a tailored Cover Letter obeying platform limits (on ITviec `#job_application_advantages`, keep **<= 500 chars**, ~400–460 chars), fill via `agent-browser --headed fill "#job_application_advantages" "..."`. **Strict Cover Letter Grounding Rule:** Every skill, tool, domain, project, and metric in the Cover Letter MUST exist in `cv.md` or the tailored CV HTML. **NEVER insert unverified JD keywords** (e.g. `time series / xử lý chuỗi thời gian`, `SQL`, `Kubernetes`) into the Cover Letter unless explicitly backed by `cv.md`.
   - Check required agreement checkboxes and scroll to `Send my CV`.
3. **MANDATORY STOP GATE:** NEVER bypass or click through CAPTCHA / Cloudflare Turnstile (`cf-turnstile-response`). Present the tab summary to the user so they review each tab and click `Send my CV`.
4. After user finishes submitting, run `agent-browser close --all` and log submitted rows via `batch/tracker-additions/*.tsv` + `node merge-tracker.mjs`.

---

## Phase 6: Continuous Error Memory

Whenever a failure or model mistake occurs and is fixed, append ONLY the verified optimal fix (`ERR-YYYYMMDD-NNN`) to `<project>/.learnings/ERRORS.md`.
