# cv-auto-apply

AI job-hunting & CV-tailoring plugin for **Claude Code** and **Antigravity CLI (`agy`)**.

![cv-auto-apply demo](assets/demo.gif)

> [Watch full 1080p silent demo (MP4)](assets/demo.mp4)

## Install

**Claude Code**
```text
/plugin marketplace add nhien36hk/cv-apply-agent
/plugin install cv-auto-apply@cv-apply-agent
```

**Antigravity CLI (`agy`)**
```bash
git clone https://github.com/nhien36hk/cv-apply-agent.git /tmp/cv-apply-agent && agy plugin install /tmp/cv-apply-agent
```

**Universal Skills CLI**
```bash
npx skills add nhien36hk/cv-apply-agent
```

## Usage

After installing, prompt your agent naturally:

```text
Read the cv-auto-apply skill and help me find matching jobs, tailor 1-page ATS CVs, and pre-fill the application forms.
```

## What It Does

1. **Mines real projects** from your GitHub (`fetch-github-summary.mjs`) — works public or private, even behind GitHub API rate limits.
2. **Discovers un-applied jobs** headlessly while skipping already-applied listings.
3. **Builds verified 1-page A4 CVs** enforced by 4 deterministic gates (`verify-cv-facts`, `cv-quality-gate`, `verify-ats >= 70`, `keyword-match`) with zero fabricated metrics or AI-slop.
4. **Pre-fills `--headed` browser tabs** (uploads tailored PDF + grounded cover letter) and **stops before `Send my CV`** so you review and click submit.
