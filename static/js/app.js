// ============================================================
// RepoPilot AI — Frontend logic
// ============================================================

const input = document.getElementById('repo-input');
const btn = document.getElementById('analyze-btn');
const statusLine = document.getElementById('status-line');
const results = document.getElementById('results');
const scanline = document.getElementById('scanline');

document.querySelectorAll('.example').forEach((el) => {
  el.addEventListener('click', () => {
    input.value = el.dataset.repo;
    runAnalysis();
  });
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') runAnalysis();
});
btn.addEventListener('click', runAnalysis);

async function runAnalysis() {
  const repoUrl = input.value.trim().replace(/^analyze\s+/i, '');
  if (!repoUrl) {
    setStatus('Enter a GitHub repository URL to begin.', 'error');
    return;
  }

  setStatus('Connecting to GitHub API…');
  btn.disabled = true;
  scanline.classList.add('active');
  results.classList.remove('visible');

  try {
    const res = await fetch(`/api/analyze?repo_url=${encodeURIComponent(repoUrl)}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || 'Analysis failed.');
    }

    renderResults(data);
    setStatus(`Scan complete for ${data.owner}/${data.repo}`, 'success');
    results.classList.add('visible');
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    setStatus(err.message || 'Something went wrong.', 'error');
  } finally {
    btn.disabled = false;
    scanline.classList.remove('active');
  }
}

function setStatus(msg, type = '') {
  statusLine.textContent = msg;
  statusLine.className = 'status-line' + (type ? ' ' + type : '');
}

// ------------------------------------------------------------
// Render
// ------------------------------------------------------------
function renderResults(data) {
  renderBanner(data);
  renderTrace(data);
  renderDashboard(data.dashboard);
  renderSummary(data.summary);
  renderHealth(data.health_metrics, data.contributors_count, data.open_issues_count);
  renderTechStack(data.tech_stack);
  renderBeginnerGuide(data.beginner_guide);
  renderFolders(data.folder_explanation);
  renderContributionPath(data.contribution_guide);
  renderHeatmap(data.activity_heatmap);
}

function renderBanner(data) {
  const el = document.getElementById('repo-banner');
  el.innerHTML = `
    <h2><span class="owner">${escapeHtml(data.owner)} /</span> ${escapeHtml(data.repo)}</h2>
    <a class="repo-link" href="https://github.com/${encodeURIComponent(data.owner)}/${encodeURIComponent(data.repo)}" target="_blank" rel="noopener">
      github.com/${escapeHtml(data.owner)}/${escapeHtml(data.repo)} ↗
    </a>
  `;
}

function renderDashboard(d) {
  const el = document.getElementById('dashboard-stats');
  el.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Difficulty</div>
      <div class="stat-value">${escapeHtml(d.difficulty)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Technologies</div>
      <div class="stat-value">${d.technologies}</div>
      <div class="stat-sub">detected stack</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Folders</div>
      <div class="stat-value">${d.folders}</div>
      <div class="stat-sub">key directories</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Contribution score</div>
      <div class="stat-value">${d.score}<span style="font-size:1rem;color:var(--text-dim)">/100</span></div>
      <div class="score-bar-track"><div class="score-bar-fill" style="width:${d.score}%"></div></div>
    </div>
  `;
}

function renderSummary(summaryMarkdown) {
  document.getElementById('repo-summary').innerHTML = markdownToHtml(summaryMarkdown);
}

function renderHealth(m, contributorsCount, openIssuesCount) {
  const el = document.getElementById('health-grid');

  const cards = [
    {
      label: 'Bus factor risk',
      value: m.bus_factor.risk_level,
      sub: `${m.bus_factor.top_contributor_share}% from top contributor`,
    },
    {
      label: 'Issue closing time',
      value: `${m.issue_closing.avg_days} days`,
      sub: `${m.issue_closing.rating} ${m.issue_closing.emoji}`,
    },
    {
      label: 'Maintainer response',
      value: `${m.maintainer_responsiveness.score}/100`,
      sub: m.maintainer_responsiveness.rating,
    },
    {
      label: 'Stale issues',
      value: `${m.stale_issues.count} stale`,
      sub: `${openIssuesCount} open · ${m.stale_issues.percentage}% ${m.stale_issues.status}`,
    },
    {
      label: 'Overall health',
      value: `${m.overall_health.score}/100`,
      sub: `${m.overall_health.status} ${m.overall_health.emoji}`,
    },
    {
      label: 'Contributors',
      value: contributorsCount !== null ? contributorsCount : 'Unknown',
      sub: 'tracked',
    },
  ];

  el.innerHTML = cards.map(c => `
    <div class="stat-card">
      <div class="stat-label">${escapeHtml(c.label)}</div>
      <div class="stat-value" style="font-size:1.3rem">${escapeHtml(String(c.value))}</div>
      <div class="stat-sub">${escapeHtml(String(c.sub))}</div>
    </div>
  `).join('');
}

function renderTechStack(tech) {
  const el = document.getElementById('tech-stack');
  const langs = tech.languages || {};
  const entries = Object.entries(langs).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    el.innerHTML = `<p style="color:var(--text-dim)">No language data available for this repository.</p>`;
    return;
  }

  el.innerHTML = `<div class="tech-bars">` + entries.map(([lang, pct]) => `
    <div class="tech-bar-row">
      <div class="tech-name">${escapeHtml(lang)}</div>
      <div class="tech-track"><div class="tech-fill" style="width:${Math.min(pct, 100)}%"></div></div>
      <div class="tech-pct">${pct}%</div>
    </div>
  `).join('') + `</div>`;
}

function renderBeginnerGuide(guide) {
  const el = document.getElementById('beginner-guide');
  let html = '';

  if (guide.areas && guide.areas.length > 0) {
    html += guide.areas.map(area => `
      <div class="area-card">
        <h4>${escapeHtml(area.language)}</h4>
        <div class="area-files">${area.files.map(f => '• ' + escapeHtml(f)).join('  ')}</div>
        <div class="area-focus">Focus area: ${escapeHtml(area.focus)}</div>
      </div>
    `).join('');
  } else {
    html += `<div class="panel"><p style="color:var(--text-dim)">No specific beginner contribution areas detected for this stack.</p></div>`;
  }

  const issues = guide.beginner_issues.length > 0 ? guide.beginner_issues : guide.fallback_issues;
  const issueLabel = guide.beginner_issues.length > 0
    ? 'Beginner-friendly open issues'
    : 'No beginner-tagged issues found — showing recent open issues';

  html += `
    <div class="panel" style="margin-top:14px;">
      <h4 style="font-family:var(--font-display);color:var(--accent);margin-bottom:6px;">${issueLabel}</h4>
      ${issues.length > 0 ? `
        <ul class="issue-list">
          ${issues.map(i => `<li><a href="${escapeAttr(i.url)}" target="_blank" rel="noopener">${escapeHtml(i.title || 'Untitled issue')}</a></li>`).join('')}
        </ul>
      ` : `<p style="color:var(--text-dim)">No open issues found.</p>`}
    </div>
  `;

  el.innerHTML = html;
}

function renderFolders(text) {
  document.getElementById('folder-explanation').textContent = text || 'No folder information available.';
}

function renderContributionPath(markdown) {
  document.getElementById('contribution-path').innerHTML = markdownToHtml(markdown);
}

function renderHeatmap(heat) {
  const el = document.getElementById('heatmap-panel');
  const data = heat.data || [];

  if (data.length === 0 || data.every(d => d.activity === 0)) {
    el.innerHTML = `<div class="activity-empty">No maintainer comment activity recorded yet — open a PR any time.</div>`;
    return;
  }

  const maxActivity = Math.max(1, ...data.map(d => d.activity));
  const topHourSet = new Set(heat.top_hours.map(h => h.hour.replace(':00', '')));

  const bars = data.map(d => {
    const hourNum = d.hour.replace(':00', '');
    const heightPct = Math.max(4, (d.activity / maxActivity) * 100);
    const isPeak = topHourSet.has(hourNum);
    let cls = 'activity-bar';
    if (d.activity > 0) cls += ' has-activity';
    if (isPeak) cls += ' peak';
    return `
      <div class="activity-bar-col">
        <span class="activity-bar-count">${d.activity}</span>
        <div class="${cls}" style="height:${heightPct}%"></div>
      </div>`;
  }).join('');

  const labels = data.map(d => {
    const hourNum = d.hour.replace(':00', '');
    const isPeak = topHourSet.has(hourNum);
    return `<div class="activity-label${isPeak ? ' peak' : ''}">${hourNum}</div>`;
  }).join('');

  const topHoursHtml = heat.top_hours.length > 0
    ? heat.top_hours.map(h => `<span>${h.hour} UTC</span> (${h.count} interactions)`).join(' &nbsp;·&nbsp; ')
    : 'No recent maintainer activity recorded.';

  el.innerHTML = `
    <div class="activity-chart">${bars}</div>
    <div class="activity-labels">${labels}</div>
    <div class="top-hours">Best time to open a PR (UTC): ${topHoursHtml}</div>
  `;
}


// ------------------------------------------------------------
// Foundry IQ Reasoning Trace
// ------------------------------------------------------------
function renderTrace(data) {
  const section = document.getElementById('reasoning-section');
  const el = document.getElementById('reasoning-trace');
  const trace = data.reasoning_trace || [];

  if (!trace.length) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  let html = '';

  if (data.foundry_powered) {
    html += `<div class="foundry-badge">⚡ Powered by Microsoft Foundry IQ — grounded retrieval with citations</div>`;
  }

  html += '<div class="trace-grid">';
  html += trace.map(t => `
    <div class="trace-step done">
      <div class="trace-num">step ${escapeHtml(String(t.step))}</div>
      <div class="trace-body">
        <div class="trace-title">${escapeHtml(t.title)}</div>
        <div class="trace-detail">${escapeHtml(t.detail)}</div>
      </div>
    </div>
  `).join('');
  html += '</div>';

  if (data.citations && data.citations.length > 0) {
    html += `<div class="citation-list" style="margin-top:14px;">
      <span style="color:var(--text-dim);margin-right:6px;">Sources cited:</span>
      ${data.citations.map(c => `<span>${escapeHtml(c)}</span>`).join('')}
    </div>`;
  }

  el.innerHTML = html;
}

// ------------------------------------------------------------
// Tiny markdown renderer (headings, bold, lists, paragraphs)
// ------------------------------------------------------------
function markdownToHtml(md) {
  if (!md) return '';

  const lines = md.split('\n');
  let html = '';
  let inList = false;

  for (let raw of lines) {
    const line = raw.trim();

    if (line === '') {
      if (inList) { html += '</ul>'; inList = false; }
      continue;
    }

    if (line.startsWith('## ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h2>${inlineMd(line.slice(3))}</h2>`;
    } else if (line.startsWith('### ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h3>${inlineMd(line.slice(4))}</h3>`;
    } else if (line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s/.test(line)) {
      if (!inList) { html += '<ul>'; inList = true; }
      const content = line.replace(/^(-|\*|\d+\.)\s/, '');
      html += `<li>${inlineMd(content)}</li>`;
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<p>${inlineMd(line)}</p>`;
    }
  }
  if (inList) html += '</ul>';

  return html;
}

function inlineMd(text) {
  let safe = escapeHtml(text);
  safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/`(.+?)`/g, '<code>$1</code>');
  safe = safe.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return safe;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}
