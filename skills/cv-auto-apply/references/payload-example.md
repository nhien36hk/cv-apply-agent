# Story Memory JSON Payload Schema (`build-cv-html.mjs`)

> ⚠️ **SCHEMA TEMPLATE ONLY — ANTI-LEAK RULE:**
> Placeholder tokens (`<...>`) and structure below show formatting ONLY. **NEVER copy any metric, dataset count, framework, tool, or skill from this example into `cv.md`, `cv-facts.json`, or any generated CV.** Every fact MUST come strictly from the user's input or `fetch-github-summary.mjs` output.

Use this exact JSON schema when generating CVs via `career-ops/build-cv-html.mjs` (when the user does not provide a custom HTML template):

```json
{
  "lang": "en",
  "page_format": "a4",
  "candidate": {
    "name": "<FULL_NAME_FROM_USER>",
    "phone": "<PHONE_FROM_USER>",
    "email": "<EMAIL_FROM_USER>",
    "github": {
      "url": "https://github.com/<GITHUB_USERNAME>",
      "display": "github.com/<GITHUB_USERNAME>"
    },
    "location": "<CITY_COUNTRY_FROM_USER>"
  },
  "summary": "<2-3 concise sentences using ONLY role target + verified stack/metrics from cv.md. NO AI-slop ('proven track record', 'passionate about', 'spearheaded', 'cutting-edge').>",
  "experience": [
    {
      "company": "<COMPANY_OR_LAB_FROM_CV_MD>",
      "role": "<ROLE_FROM_CV_MD>",
      "location": "<LOCATION_FROM_CV_MD>",
      "dates": "<EXACT_DATES_FROM_CV_MD>",
      "bullets": [
        "Paper 1 (<SHORT_PAPER_TITLE>) — Challenge & Solution: <Problem solved + architecture/dataset actually stated in cv.md>.",
        "Paper 1 — Key Results: <Verified quantitative gain/metric actually stated in cv.md>.",
        "Paper 2 (<SHORT_PAPER_TITLE>) — Challenge & Solution: <Problem solved + models/method actually stated in cv.md>.",
        "Paper 2 — Key Results: <Verified quantitative gain/metric actually stated in cv.md>."
      ]
    }
  ],
  "projects": [
    {
      "name": "<PROJECT_1_TITLE_FROM_GITHUB_OR_CV_MD> (<repo-slug>)",
      "badge": "Open Source",
      "tech": "<ONLY_LIBRARIES_VERIFIED_IN_REPO_MANIFEST>",
      "description": "Challenge & Engineering: <Real problem + engineering mechanism verified in repo code/README>. Key Results: <ONLY metrics verified in repo/README/user input; never invent counts>."
    },
    {
      "name": "<PROJECT_2_TITLE_FROM_GITHUB_OR_CV_MD> (<repo-slug>)",
      "badge": "Open Source",
      "tech": "<ONLY_LIBRARIES_VERIFIED_IN_REPO_MANIFEST>",
      "description": "Challenge & Engineering: <Real problem + engineering mechanism verified in repo code/README>. Key Results: <ONLY metrics verified in repo/README/user input; never invent counts>."
    }
  ],
  "education": [
    {
      "title": "<EXACT_DEGREE_FROM_CV_MD>",
      "org": "<EXACT_SCHOOL_FROM_CV_MD>",
      "year": "<EXACT_YEAR_FROM_CV_MD>"
    }
  ],
  "skills": [
    {
      "category": "<CATEGORY_1>",
      "items": "<ONLY_VERIFIED_SKILLS_PRESENT_IN_CV_MD_OR_MINED_REPOS>"
    },
    {
      "category": "<CATEGORY_2>",
      "items": "<ONLY_VERIFIED_SKILLS_PRESENT_IN_CV_MD_OR_MINED_REPOS>"
    }
  ]
}
```

Rules:
- Keep EVERY paper from `cv.md` separate with both `Challenge & Solution:` and `Key Results:` labels.
- Omit `education[].description` and start years unless explicitly stated in `cv.md`.
- Never copy placeholder text (`<...>`) or unverified JD keywords (`gap` skills) into the JSON.
- Select at least 2 relevant projects from `cv.md` / mined GitHub repos with verified mechanisms and real metrics (never invent user counts, dataset sizes, or tech stacks).
