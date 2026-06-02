'use strict';
/* ══════════════════════════════════════════════
   NEXUS · app.js · Complete Frontend
══════════════════════════════════════════════ */

const PAGE_UPLOAD  = document.getElementById('page-upload');
const PAGE_LOAD    = document.getElementById('page-load');
const PAGE_RESULTS = document.getElementById('page-results');
const dropZone     = document.getElementById('drop-zone');
const fileInput    = document.getElementById('file-input');
const dropIdle     = document.getElementById('drop-idle');
const dropReady    = document.getElementById('drop-ready');
const rName        = document.getElementById('r-name');
const rSize        = document.getElementById('r-size');
const rmBtn        = document.getElementById('rm-btn');
const analyzeBtn   = document.getElementById('analyze-btn');
const errBox       = document.getElementById('err-box');

let currentFile = null;

/* ── CANVAS BACKGROUND ── */
(function () {
  const canvas = document.getElementById('bg-canvas');
  const ctx    = canvas.getContext('2d');
  let W, H, stars = [], orbs = [];

  function init() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    stars = Array.from({ length: 130 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.5 + .3,
      a: Math.random(), da: (Math.random() - .5) * .006
    }));
    const pal = ['rgba(0,212,255,.06)','rgba(139,92,246,.07)','rgba(244,114,182,.05)','rgba(0,212,255,.04)','rgba(139,92,246,.05)'];
    orbs = pal.map(c => ({
      x: Math.random() * W, y: Math.random() * H,
      r: 200 + Math.random() * 150, c,
      vx: (Math.random() - .5) * .35,
      vy: (Math.random() - .5) * .35
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    stars.forEach(s => {
      s.a += s.da;
      if (s.a <= .04 || s.a >= .85) s.da *= -1;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.a.toFixed(2)})`;
      ctx.fill();
    });
    orbs.forEach(o => {
      o.x += o.vx; o.y += o.vy;
      if (o.x < -o.r || o.x > W + o.r) o.vx *= -1;
      if (o.y < -o.r || o.y > H + o.r) o.vy *= -1;
      const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
      g.addColorStop(0, o.c); g.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize', init);
  init(); draw();
})();

/* ── FILE HANDLING ── */
function humanSize(b) { return b < 1024 ? b + ' B' : (b / 1024).toFixed(0) + ' KB'; }

function setFile(f) {
  if (!f) return;
  if (!f.name.toLowerCase().endsWith('.pdf')) { showErr('Only PDF files supported.'); return; }
  if (f.size > 10 * 1024 * 1024) { showErr('File too large. Max 10 MB.'); return; }
  clearErr();
  currentFile = f;
  rName.textContent = f.name;
  rSize.textContent = humanSize(f.size) + ' · Ready';
  dropIdle.classList.add('hidden');
  dropReady.classList.remove('hidden');
  dropZone.classList.add('has-file');
  analyzeBtn.disabled = false;
}

function clearFile() {
  currentFile = null; fileInput.value = '';
  dropReady.classList.add('hidden');
  dropIdle.classList.remove('hidden');
  dropZone.classList.remove('has-file');
  analyzeBtn.disabled = true;
}

function showErr(msg) { errBox.textContent = '⚠  ' + msg; errBox.classList.remove('hidden'); }
function clearErr()   { errBox.classList.add('hidden'); }

dropZone.addEventListener('click',    () => fileInput.click());
fileInput.addEventListener('change',  e  => setFile(e.target.files[0]));
rmBtn.addEventListener('click',       e  => { e.stopPropagation(); clearFile(); });
dropZone.addEventListener('dragover', e  => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave',()  => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop',     e  => { e.preventDefault(); dropZone.classList.remove('dragover'); setFile(e.dataTransfer.files[0]); });

/* ── LOADING STEPS ── */
const STEP_DELAYS = [0, 3000, 8000, 15000];
let stepTimers = [];

function startSteps() {
  ['ls0','ls1','ls2','ls3'].forEach(id => {
    const el = document.getElementById(id);
    el.classList.remove('active','done');
    el.querySelector('.ls-dot').textContent = '';
  });
  stepTimers.forEach(clearTimeout); stepTimers = [];
  STEP_DELAYS.forEach((delay, i) => {
    stepTimers.push(setTimeout(() => {
      if (i > 0) {
        const prev = document.getElementById('ls' + (i - 1));
        prev.classList.remove('active'); prev.classList.add('done');
        prev.querySelector('.ls-dot').textContent = '✓';
      }
      const cur = document.getElementById('ls' + i);
      cur.classList.add('active');
    }, delay));
  });
}
function stopSteps() { stepTimers.forEach(clearTimeout); stepTimers = []; }

/* ── ANALYZE ── */
analyzeBtn.addEventListener('click', runAnalysis);

async function runAnalysis() {
  if (!currentFile) return;
  PAGE_UPLOAD.classList.add('hidden');
  PAGE_LOAD.classList.remove('hidden');
  PAGE_RESULTS.classList.add('hidden');
  startSteps();
  try {
    const fd = new FormData();
    fd.append('resume', currentFile);
    const res  = await fetch('/api/analyze', { method: 'POST', body: fd });
    const json = await res.json();
    stopSteps();
    if (!res.ok || !json.success) throw new Error(json.error || 'Analysis failed.');
    buildReport(json.data);
    PAGE_LOAD.classList.add('hidden');
    PAGE_RESULTS.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    launchConfetti();
  } catch (err) {
    stopSteps();
    PAGE_LOAD.classList.add('hidden');
    PAGE_UPLOAD.classList.remove('hidden');
    showErr(err.message || 'Something went wrong. Please try again.');
  }
}

document.getElementById('btn-new').addEventListener('click', resetApp);
function resetApp() {
  PAGE_RESULTS.classList.add('hidden');
  PAGE_UPLOAD.classList.remove('hidden');
  document.getElementById('results-body').innerHTML = '';
  clearFile(); clearErr();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ══════════════════════════════════════════════
   REPORT BUILDER
══════════════════════════════════════════════ */
function buildReport(d) {
  const body = document.getElementById('results-body');
  body.innerHTML = '';
  body.appendChild(buildProfile(d));
  body.appendChild(buildAtsAndDomains(d));
  body.appendChild(buildJobs(d));
  body.appendChild(buildImprovementsAndSkills(d));
  body.appendChild(buildKeywords(d));
  body.appendChild(buildLinkedIn(d));
  body.appendChild(buildBottomActions());
  requestAnimationFrame(() => setTimeout(animateAll, 80));
}

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls)             e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function scoreColor(v) { return v >= 75 ? 'var(--green)' : v >= 50 ? 'var(--amber)' : 'var(--red)'; }

function svgGauge(score, sz = 148, thick = 10) {
  const r    = (sz - thick) / 2;
  const circ = +(2 * Math.PI * r).toFixed(3);
  const col  = scoreColor(score);
  return `<svg width="${sz}" height="${sz}" style="transform:rotate(-90deg)">
    <circle cx="${sz/2}" cy="${sz/2}" r="${r}" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="${thick}"/>
    <circle class="gauge-arc" cx="${sz/2}" cy="${sz/2}" r="${r}" fill="none"
      stroke="${col}" stroke-width="${thick}" stroke-linecap="round"
      stroke-dasharray="${circ}" stroke-dashoffset="${circ}"
      data-off="${+(circ-(score/100)*circ).toFixed(3)}"
      style="transition:stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)"/>
  </svg>
  <div class="gauge-label">
    <div class="gauge-num" style="color:${col}">${score}</div>
    <div class="gauge-den">/100</div>
  </div>`;
}

function pbar(v, color) {
  const c = color || scoreColor(v);
  return `<div class="pbar-track"><div class="pbar-fill" data-t="${v}" style="background:${c}"></div></div>`;
}

function animateAll() {
  document.querySelectorAll('.pbar-fill[data-t]').forEach(e => { e.style.width = e.dataset.t + '%'; });
  document.querySelectorAll('.gauge-arc[data-off]').forEach(a => { a.style.strokeDashoffset = a.dataset.off; });
}

/* PROFILE */
function buildProfile(d) {
  const LC = { Fresher:'#8b5cf6','Entry-Level':'#06b6d4','Mid-Level':'#10b981',Senior:'#f59e0b' };
  const lc = LC[d.candidateLevel] || '#8b5cf6';
  const initials = d.candidateInitials || (d.candidateName||'??').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const w = el('div','profile-card card-in');
  w.innerHTML = `
    <div class="p-avatar">${initials}</div>
    <div class="p-right">
      <div class="p-name-row">
        <span class="p-name">${d.candidateName||'Candidate'}</span>
        <span class="p-level" style="background:${lc}22;color:${lc};border:1px solid ${lc}44">${d.candidateLevel}</span>
      </div>
      <div class="p-reason">${d.levelReason||''}</div>
      <p class="p-feedback">${d.overallFeedback||''}</p>
    </div>`;
  return w;
}

/* ATS + DOMAINS */
function buildAtsAndDomains(d) {
  const two = el('div','two-col');

  const atsCard = el('div','card card-in d1');
  const bd = d.atsBreakdown || {};
  atsCard.innerHTML = `<div class="sec-label">🎯 ATS Score</div>
    <div class="ats-inner">
      <div class="gauge-wrap">${svgGauge(d.atsScore||0)}</div>
      <div class="ats-bars-col">
        ${Object.entries(bd).map(([k,v])=>`
          <div class="ats-bar-row">
            <div class="ats-bar-head">
              <span class="ats-key">${k}</span>
              <span class="ats-val" style="color:${scoreColor(v)}">${v}</span>
            </div>${pbar(v)}
          </div>`).join('')}
      </div>
    </div>`;

  const domCard = el('div','card card-in d2');
  domCard.innerHTML = `<div class="sec-label">🧭 Career Domains</div>
    ${(d.careerDomains||[]).map(dom=>`
      <div class="domain-item">
        <div class="domain-head">
          <div class="domain-left">
            <span style="font-size:18px">${dom.emoji||'📌'}</span>
            <span>${dom.name}</span>
          </div>
          <span class="domain-score">${dom.score}%</span>
        </div>
        ${pbar(dom.score,'var(--cyan)')}
        <div class="domain-industries">
          ${(dom.industries||[]).map(i=>`<span class="ind-tag">${i}</span>`).join('')}
        </div>
        <div class="domain-desc">${dom.description}</div>
      </div>`).join('')}`;

  two.appendChild(atsCard);
  two.appendChild(domCard);
  return two;
}

/* JOBS */
function buildJobs(d) {
  const card = el('div','card card-in d2');
  card.innerHTML = `<div class="sec-label">💼 Top 5 Job Matches</div>`;
  const grid = el('div','jobs-grid');

  (d.jobMatches||[]).slice(0,5).forEach(job => {
    const jc = el('div','job-card');
    jc.innerHTML = `
      <div class="job-top">
        <div>
          <div class="job-title">${job.title}</div>
          <div class="job-company">${job.company}</div>
          <div class="job-ctype">${job.companyType}</div>
        </div>
        <span class="job-pri">${job.priority}/10</span>
      </div>
      <p class="job-why">${job.whyMatch}</p>
      <div class="job-meta">
        <span class="job-sal">💰 ${job.salary}</span>
        <span class="job-exp">⏱ ${job.experience}</span>
      </div>
      ${(job.missingSkills||[]).length?`
        <div class="miss-lbl">Learn first</div>
        <div class="miss-chips">${job.missingSkills.map(s=>`<span class="miss-chip">${s}</span>`).join('')}</div>`:''}
      <a class="apply-btn" href="${job.applyLink}" target="_blank" rel="noopener noreferrer">
        Apply on ${job.applySource} ↗
      </a>`;
    grid.appendChild(jc);
  });
  card.appendChild(grid);
  return card;
}

/* IMPROVEMENTS + SKILLS */
function buildImprovementsAndSkills(d) {
  const two = el('div','two-col');

  const impCard = el('div','card card-in d3');
  impCard.innerHTML = `<div class="sec-label">📝 Resume Improvements</div>`;
  const impList = el('div','imp-list');
  (d.resumeImprovements||[]).forEach(imp => {
    const item = el('div','imp-item');
    item.innerHTML = `
      <div class="imp-badge">${imp.number}</div>
      <div class="imp-title">${imp.title}</div>
      <p class="imp-detail">${imp.detail}</p>
      <div class="before-after">
        <div class="ba before"><div class="ba-lbl">Before</div><div class="ba-text">${imp.before}</div></div>
        <div class="ba after"><div class="ba-lbl">After ✦</div><div class="ba-text">${imp.after}</div></div>
      </div>`;
    impList.appendChild(item);
  });
  impCard.appendChild(impList);

  const sklCard = el('div','card card-in d4');
  sklCard.innerHTML = `<div class="sec-label">📚 High-Value Skills to Learn</div>`;
  const sklGrid = el('div','skills-grid');
  (d.skillsToLearn||[]).forEach(sk => {
    const dc = sk.demandLevel==='Very High'?'dem-vh':sk.demandLevel==='High'?'dem-h':'dem-m';
    const sc = el('div','skill-card');
    sc.innerHTML = `
      <div class="skill-top">
        <span class="skill-name">${sk.skill}</span>
        <span class="skill-dem ${dc}">${sk.demandLevel}</span>
      </div>
      <p class="skill-reason">${sk.reason}</p>
      <a class="learn-link" href="${sk.learnUrl||'#'}" target="_blank" rel="noopener noreferrer">
        📖 ${sk.learnFrom} ↗
      </a>`;
    sklGrid.appendChild(sc);
  });
  sklCard.appendChild(sklGrid);

  two.appendChild(impCard);
  two.appendChild(sklCard);
  return two;
}

/* KEYWORDS */
function buildKeywords(d) {
  const card = el('div','card card-in d4');
  card.innerHTML = `
    <div class="sec-label">🔑 ATS Keyword Analysis</div>
    <div class="kw-cols">
      <div>
        <div class="kw-title kw-p-title">✓ Present in your resume</div>
        <div class="kw-chips">${(d.presentKeywords||[]).map(k=>`<span class="kw-chip present">${k}</span>`).join('')}</div>
      </div>
      <div>
        <div class="kw-title kw-m-title">✗ Missing — add these</div>
        <div class="kw-chips">${(d.missingKeywords||[]).map(k=>`<span class="kw-chip missing">${k}</span>`).join('')}</div>
      </div>
    </div>`;
  return card;
}

/* LINKEDIN */
function buildLinkedIn(d) {
  const card = el('div','card card-in d5');
  const head = el('div','li-head');
  head.innerHTML = `<div class="sec-label" style="margin-bottom:0">🌟 LinkedIn / About Section</div>`;
  const copyBtn = el('button','copy-btn no-print','Copy');
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(d.linkedinSummary||'').then(() => {
      copyBtn.textContent = '✓ Copied!'; copyBtn.classList.add('copied');
      setTimeout(()=>{ copyBtn.textContent='Copy'; copyBtn.classList.remove('copied'); }, 2500);
    });
  });
  head.appendChild(copyBtn);
  const q = el('div','li-quote');
  q.innerHTML = `<p class="li-text">${d.linkedinSummary||''}</p>`;
  card.appendChild(head); card.appendChild(q);
  return card;
}

/* BOTTOM ACTIONS */
function buildBottomActions() {
  const wrap = el('div','bottom-btns no-print');
  const dl = el('button','cta-btn','⬇ Download Report');
  dl.addEventListener('click', () => window.print());
  const nw = el('button','btn-secondary','↩ Analyze Another Resume');
  nw.addEventListener('click', resetApp);
  wrap.appendChild(dl); wrap.appendChild(nw);
  return wrap;
}

/* CONFETTI */
function launchConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:999;width:100%;height:100%';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  const COLS = ['#00d4ff','#8b5cf6','#f472b6','#22c55e','#f59e0b','#ffffff'];
  const pieces = Array.from({length:100},()=>({
    x:Math.random()*canvas.width, y:-20-Math.random()*180,
    w:7+Math.random()*8, h:3+Math.random()*6,
    r:Math.random()*Math.PI*2, dr:(Math.random()-.5)*.14,
    vx:(Math.random()-.5)*4.5, vy:1.5+Math.random()*3.5,
    c:COLS[Math.floor(Math.random()*COLS.length)], a:1
  }));
  let raf;
  function tick() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    let alive=0;
    pieces.forEach(p=>{
      p.y+=p.vy; p.x+=p.vx; p.r+=p.dr; p.vy+=.09;
      if(p.y>canvas.height*.75) p.a=Math.max(0,p.a-.025);
      if(p.a>0){ alive++;
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r);
        ctx.globalAlpha=p.a; ctx.fillStyle=p.c;
        ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore();
      }
    });
    if(alive>0) raf=requestAnimationFrame(tick); else canvas.remove();
  }
  tick();
  setTimeout(()=>{ cancelAnimationFrame(raf); canvas.remove(); },5000);
}
