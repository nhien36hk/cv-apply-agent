#!/usr/bin/env node

/**
 * fetch-github-summary.mjs — Deep repo discovery for CV onboarding (public + private via git store / gh).
 *
 * Avoids shallow mining (only reading requirements.txt) by also inspecting
 * README.md, .agents/codebase_map.md, docs/, and artifacts/results/ files.
 * Never prints auth tokens.
 *
 * Usage:
 *   node fetch-github-summary.mjs <github_username> [--max-repos 12]
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

let apiBlocked = false;

const CANDIDATE_FILES = [
  'README.md',
  'readme.md',
  '.agents/codebase_map.md',
  'requirements.txt',
  'package.json',
  'pyproject.toml',
];
const RESULT_DIRS = ['artifacts/results', 'artifacts/results/jd', 'docs'];
const CODE_DIRS = ['src', 'experiments', 'app'];

function resolveGitHubToken() {
  try {
    const out = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (out) return out;
  } catch {}
  try {
    const out = execFileSync('git', ['credential', 'fill'], {
      input: 'protocol=https\nhost=github.com\n\n',
      encoding: 'utf8',
      timeout: 3000,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const line = out.split('\n').find((l) => l.startsWith('password='));
    if (line) return line.slice('password='.length).trim();
  } catch {}
  return process.env.GITHUB_TOKEN || null;
}

async function ghJson(url, token) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'cv-auto-apply-skill' };
  if (token) headers.Authorization = `token ${token}`;
  const res = await fetch(url, { headers });
  if (res.status === 403 || res.status === 429) {
    apiBlocked = true;
    return null;
  }
  if (!res.ok) return null;
  return res.json();
}

async function ghRawContent(repoFullName, relPath, token) {
  const data = await ghJson(`https://api.github.com/repos/${repoFullName}/contents/${relPath}`, token);
  if (!data || Array.isArray(data) || !data.content) return null;
  return Buffer.from(data.content, 'base64').toString('utf8');
}

async function fetchReposViaHtml(username) {
  const url = `https://github.com/${encodeURIComponent(username)}?tab=repositories`;
  const res = await fetch(url, { headers: { 'User-Agent': 'cv-auto-apply-skill' } });
  if (!res.ok) return null;
  const html = await res.text();
  const escapedUser = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hrefRe = new RegExp(`href="\\/(${escapedUser}\\/[^"\\/?#]+)"`, 'i');
  const repos = [];
  const seen = new Set();

  for (const chunk of html.split('<li ')) {
    if (!chunk.includes('itemprop="name codeRepository"')) continue;
    const block = chunk.split('</li>')[0];
    if (block.includes('Forked from') || /\bclass="[^"]*\bfork\b/.test(block)) continue;
    const hrefMatch = block.match(hrefRe);
    if (!hrefMatch) continue;
    const fullName = hrefMatch[1];
    if (seen.has(fullName)) continue;
    seen.add(fullName);

    const langMatch = block.match(/<span[^>]+itemprop="programmingLanguage"[^>]*>([^<]+)<\/span>/);
    const descMatch = block.match(/<p[^>]+itemprop="description"[^>]*>([\s\S]*?)<\/p>/);
    repos.push({
      full_name: fullName,
      private: false,
      fork: false,
      size: 100,
      stargazers_count: 0,
      language: langMatch ? langMatch[1].trim() : null,
      description: descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : null,
    });
  }
  return repos;
}

function inspectRepoViaShallowClone(repoFullName) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gh-sum-'));
  const found = {};
  try {
    execFileSync(
      'git',
      ['clone', '--depth', '1', '--quiet', `https://github.com/${repoFullName}.git`, tmpDir],
      { env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }, stdio: 'ignore', timeout: 20000 }
    );
    for (const relPath of CANDIDATE_FILES) {
      const full = path.join(tmpDir, relPath);
      if (fs.existsSync(full) && fs.statSync(full).isFile()) {
        found[relPath] = fs.readFileSync(full, 'utf8').slice(0, 1500);
      }
    }
    for (const dir of RESULT_DIRS) {
      const fullDir = path.join(tmpDir, dir);
      if (!fs.existsSync(fullDir) || !fs.statSync(fullDir).isDirectory()) continue;
      const pick = fs
        .readdirSync(fullDir)
        .find((name) => /\.(md|json)$/i.test(name) && fs.statSync(path.join(fullDir, name)).size < 50000);
      if (pick) found[`${dir}/${pick}`] = fs.readFileSync(path.join(fullDir, pick), 'utf8').slice(0, 1200);
    }
    if (!found['README.md'] && !found['readme.md']) {
      for (const codeDir of CODE_DIRS) {
        const fullDir = path.join(tmpDir, codeDir);
        if (!fs.existsSync(fullDir) || !fs.statSync(fullDir).isDirectory()) continue;
        const codeFile = fs.readdirSync(fullDir).find((name) => {
          const full = path.join(fullDir, name);
          return /\.(py|js|ts)$/i.test(name) && name !== '__init__.py' && fs.statSync(full).isFile() && fs.statSync(full).size < 40000;
        });
        if (codeFile) found[`${codeDir}/${codeFile}`] = fs.readFileSync(path.join(fullDir, codeFile), 'utf8').slice(0, 1200);
      }
    }
  } catch {
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  return found;
}

async function inspectInterestingPaths(repoFullName, token) {
  if (apiBlocked) return inspectRepoViaShallowClone(repoFullName);

  const found = {};
  for (const p of CANDIDATE_FILES) {
    const txt = await ghRawContent(repoFullName, p, token);
    if (apiBlocked) return inspectRepoViaShallowClone(repoFullName);
    if (txt) found[p] = txt.slice(0, 1500);
  }
  for (const dir of RESULT_DIRS) {
    const items = await ghJson(`https://api.github.com/repos/${repoFullName}/contents/${dir}`, token);
    if (apiBlocked) return inspectRepoViaShallowClone(repoFullName);
    if (Array.isArray(items)) {
      const pick = items.find((f) => /\.(md|json)$/i.test(f.name) && f.size < 50000);
      if (pick) {
        const txt = await ghRawContent(repoFullName, pick.path, token);
        if (apiBlocked) return inspectRepoViaShallowClone(repoFullName);
        if (txt) found[pick.path] = txt.slice(0, 1200);
      }
    }
  }
  if (!found['README.md'] && !found['readme.md']) {
    for (const codeDir of CODE_DIRS) {
      const items = await ghJson(`https://api.github.com/repos/${repoFullName}/contents/${codeDir}`, token);
      if (apiBlocked) return inspectRepoViaShallowClone(repoFullName);
      if (Array.isArray(items)) {
        const codeFile = items.find((f) => f.type === 'file' && /\.(py|js|ts)$/i.test(f.name) && f.name !== '__init__.py' && f.size < 40000);
        if (codeFile) {
          const txt = await ghRawContent(repoFullName, codeFile.path, token);
          if (apiBlocked) return inspectRepoViaShallowClone(repoFullName);
          if (txt) found[codeFile.path] = txt.slice(0, 1200);
        }
      }
    }
  }
  return found;
}

async function main() {
  const args = process.argv.slice(2);
  const username = args.find((a) => !a.startsWith('--'));
  if (!username) {
    console.error('Usage: node fetch-github-summary.mjs <github_username> [--max-repos 12]');
    process.exit(1);
  }
  const maxIdx = args.indexOf('--max-repos');
  const maxRepos = maxIdx !== -1 && args[maxIdx + 1] ? Number(args[maxIdx + 1]) : 12;

  const token = resolveGitHubToken();
  const endpoint = token
    ? 'https://api.github.com/user/repos?per_page=100&affiliation=owner&sort=updated'
    : `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`;

  let source = 'api';
  let repos = await ghJson(endpoint, token);
  if (!Array.isArray(repos)) {
    source = 'html+clone';
    repos = await fetchReposViaHtml(username);
  }
  if (!Array.isArray(repos) || repos.length === 0) {
    console.error('Failed to query GitHub repositories via API or HTML.');
    process.exit(1);
  }

  console.log(`Auth: ${token ? 'authenticated (public + private)' : 'public only'} | Source: ${source} | Total repos: ${repos.length}`);
  const nonForks = repos.filter((r) => !r.fork && r.size > 5).slice(0, maxRepos);

  for (const r of nonForks) {
    console.log(`\n==================== ${r.full_name} (priv=${r.private}, stars=${r.stargazers_count}, lang=${r.language}) ====================`);
    if (r.description) console.log(`DESC: ${r.description}`);
    const snippets = await inspectInterestingPaths(r.full_name, token);
    for (const [relPath, txt] of Object.entries(snippets)) {
      console.log(`--- ${relPath} ---\n${txt}`);
    }
  }
}

main();
