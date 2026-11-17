#!/usr/bin/env node

/**
 * cv-quality-gate.mjs — Deterministic anti-slop, anti-cheat, and Story Memory gate.
 *
 * Catches common LLM failure modes on tailored CVs:
 *   1. Weakening config/cv-facts.json (deleted default forbidden phrases or allow_swaps bypass)
 *   2. Fabricated education coursework or unstated start years absent from user source
 *   3. Missing/merged research papers or missing Challenge & Solution / Key Results labels
 *   4. Missing quantitative craft in projects or AI-slop cliché phrasing
 *
 * Usage:
 *   node cv-quality-gate.mjs <cv.html> [--payload <payload.json>] [--career-ops <dir>]
 */

import { existsSync, readFileSync } from 'fs';
import { join, isAbsolute, resolve, basename } from 'path';

const CORE_FORBIDDEN = [
  'proven track record',
  'passionate about',
  'results-oriented',
  'results-driven',
  'cutting-edge',
  'cutting edge',
  'spearheaded',
  'spearheading',
  'synergies',
  'delve',
  'pivotal',
];

const SHALLOW_FILLER = [
  'participated in',
  'assisted with',
  'assisted in',
  'responsible for developing',
  'worked on developing',
  'helped improve',
  'supported the team in',
];

function stripHtml(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&rarr;/g, '->')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveFile(arg, baseDir) {
  return isAbsolute(arg) ? arg : resolve(baseDir, arg);
}

function checkCvFactsConfig(factsPath, errors) {
  if (!existsSync(factsPath)) return;
  let data;
  try {
    data = JSON.parse(readFileSync(factsPath, 'utf8'));
  } catch (e) {
    errors.push(`config/cv-facts.json is invalid JSON: ${e.message}`);
    return;
  }
  if (Array.isArray(data.allow_swaps) && data.allow_swaps.length > 0) {
    errors.push(
      `Anti-cheat violation in config/cv-facts.json: remove "allow_swaps" (${JSON.stringify(data.allow_swaps)}) and fix CV wording instead of silencing verify-cv-facts.mjs.`
    );
  }
  const lowered = new Set((data.forbidden_phrases || []).map((s) => String(s).toLowerCase()));
  const missingDefaults = ['proven track record', 'passionate about', 'spearheaded'].filter(
    (p) => !lowered.has(p)
  );
  if (missingDefaults.length > 0) {
    errors.push(
      `config/cv-facts.json stripped default AI-slop forbidden_phrases (${missingDefaults.join(', ')}). Restore standard forbidden_phrases.`
    );
  }
}

function checkEducationIntegrity(plainHtml, cvMd, errors) {
  const hasCourseworkInSource = /coursework\s*:/i.test(cvMd);
  if (!hasCourseworkInSource && /coursework\s*:/i.test(plainHtml)) {
    errors.push(
      'Fabricated Education detected: "Coursework:" appears in generated CV HTML but is NOT present in cv.md. Remove invented coursework.'
    );
  }
  const htmlEduRange = plainHtml.match(/\b(20\d{2})\s*[-–]\s*(20\d{2})\b/);
  if (htmlEduRange) {
    const [, startYear, endYear] = htmlEduRange;
    const eduSection = cvMd.split(/^##\s+Education\b/im)[1]?.split(/^##\s+/m)[0] || '';
    if (eduSection && !eduSection.includes(startYear)) {
      errors.push(
        `Fabricated Education start year detected: "${startYear} - ${endYear}" appears in HTML, but "${startYear}" is not in cv.md Education.`
      );
    }
  }
}

function checkStoryMemory(plainHtml, cvMd, errors) {
  const expMd = cvMd.split(/^##\s+Projects\b/im)[0] || cvMd;
  const uniquePapers = [...new Set([...expMd.matchAll(/\b(Paper\s+\d+)\b/gi)].map((m) => m[1].toLowerCase()))];
  for (const p of uniquePapers) {
    if (!new RegExp(`\\b${p}\\b`, 'i').test(plainHtml)) {
      errors.push(`Missing research entry "${p}" from cv.md — never drop or merge papers.`);
    }
  }
  const mdCsCount = (expMd.match(/Challenge\s*&\s*Solution:/gi) || []).length;
  const needPairs = Math.max(uniquePapers.length, mdCsCount);
  const csCount = (plainHtml.match(/Challenge\s*&\s*Solution:/gi) || []).length;
  const krCount = (plainHtml.match(/Key\s*Results:/gi) || []).length;
  if (needPairs > 0 && (csCount < needPairs || krCount < needPairs)) {
    errors.push(
      `Story Memory structure missing in CV HTML: expected at least ${needPairs} "Challenge & Solution:" and "Key Results:" pairs, found Challenge & Solution=${csCount}, Key Results=${krCount}.`
    );
  }
}

function checkSlopAndProjects(plainHtml, html, errors) {
  const lower = plainHtml.toLowerCase();
  if (/\bproven\b[\w\s-]{0,20}\btrack\s+record\b/i.test(plainHtml)) {
    errors.push('AI-slop phrase detected: "proven ... track record". Rewrite with concrete evidence.');
  }
  for (const phrase of [...CORE_FORBIDDEN, ...SHALLOW_FILLER]) {
    if (lower.includes(phrase)) {
      errors.push(`AI-slop or shallow filler phrase detected: "${phrase}". Rewrite with active engineering craft.`);
    }
  }
  const projSplit = html.split(/<div\s+class="section-title">\s*Projects\s*<\/div>/i)[1] || '';
  const projSection = projSplit.split(/<div\s+class="section-title">/i)[0] || '';
  const projCount = (projSection.match(/class="(?:project-title|entry-header)"/gi) || []).length;
  if (projCount > 0 && projCount < 2) {
    errors.push(`Projects section has only ${projCount} entry; include at least 2 relevant projects.`);
  }
  if (projSection && !/\d+/.test(stripHtml(projSection))) {
    errors.push('Projects section contains zero quantitative metrics; add verified metrics from cv.md/GitHub.');
  }
  const placeholderMatch = (html + ' ' + plainHtml).match(/<[A-Z][A-Z0-9_]{2,}>/);
  if (placeholderMatch) {
    errors.push(`Unreplaced schema placeholder detected: "${placeholderMatch[0]}". Fill strictly from cv.md/GitHub.`);
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node cv-quality-gate.mjs <cv.html> [--career-ops <dir>]');
    process.exit(0);
  }
  const rootIdx = args.indexOf('--career-ops');
  const rootDir = rootIdx !== -1 && args[rootIdx + 1] ? resolve(args[rootIdx + 1]) : process.cwd();
  const cvHtmlPath = resolveFile(args[0], rootDir);
  const cvMdPath = join(rootDir, 'cv.md');
  const factsPath = join(rootDir, 'config', 'cv-facts.json');

  if (!existsSync(cvHtmlPath)) {
    console.error(`HTML file not found: ${cvHtmlPath}`);
    process.exit(1);
  }
  if (!existsSync(cvMdPath)) {
    console.error(`cv.md not found in: ${rootDir}`);
    process.exit(1);
  }

  const html = readFileSync(cvHtmlPath, 'utf8');
  const plainHtml = stripHtml(html);
  const cvMd = readFileSync(cvMdPath, 'utf8');
  const errors = [];

  checkCvFactsConfig(factsPath, errors);
  checkEducationIntegrity(plainHtml, cvMd, errors);
  checkStoryMemory(plainHtml, cvMd, errors);
  checkSlopAndProjects(plainHtml, html, errors);

  if (errors.length > 0) {
    console.error(`❌ cv-quality-gate FAILED for ${basename(cvHtmlPath)} (${errors.length} issue(s)):`);
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }
  console.log(`✅ cv-quality-gate PASSED: ${basename(cvHtmlPath)}`);
}

main();
