// ============================================================
// RepoPilot AI — Frontend logic
// ============================================================

const input      = document.getElementById('repo-input');
const btn        = document.getElementById('analyze-btn');
const statusLine = document.getElementById('status-line');
const results    = document.getElementById('results');
const scanline   = document.getElementById('scanline');

document.querySelectorAll('.example').forEach((el) => {
  el.addEventListener('click', () => { input.value = el.dataset.repo; runAnalysis(); });
});
input.addEventListener('keydown', (e) => { if (e.key === 'Enter') runAnalysis(); });
btn.addEventListener('click', runAnalysis);

async function runAnalysis() {
  const repoUrl = input.value.trim().replace(/^analyze\s+/i, '');
  if (!repoUrl) { setStatus('Enter a GitHub repository URL to begin.', 'error'); return; }

  setStatus('Connecting to GitHub API…');
  btn.disabled = true;
  scanline.classList.add('active');
  results.classList.remove('visible');

  try {
    const res  = await fetch(`/api/analyze?repo_url=${encodeURIComponent(repoUrl)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Analysis failed.');
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
  statusLine.className   = 'status-line' + (type ? ' ' + type : '');
}

// ------------------------------------------------------------
// Render orchestrator
// ------------------------------------------------------------
function renderResults(data) {
  renderBanner(data);
  renderTrace(data);
  renderDashboard(data.dashboard);
  renderSummary(data.summary);
  renderHealth(data.health_metrics, data.contributors_count, data.open_issues_count);
  renderTechStack(data.tech_stack);
  renderBeginnerGuide(data.beginner_guide);
  renderFolders(data.folder_tree, data.folder_summary, data.folder_explanation);
  renderContributionPath(data.contribution_guide);
  renderHeatmap(data.activity_heatmap);
}

function renderBanner(data) {
  document.getElementById('repo-banner').innerHTML = `
    <h2><span class="owner">${escapeHtml(data.owner)} /</span> ${escapeHtml(data.repo)}</h2>
    <a class="repo-link" href="https://github.com/${encodeURIComponent(data.owner)}/${encodeURIComponent(data.repo)}"
       target="_blank" rel="noopener">
      github.com/${escapeHtml(data.owner)}/${escapeHtml(data.repo)} ↗
    </a>`;
}

function renderDashboard(d) {
  document.getElementById('dashboard-stats').innerHTML = `
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
    </div>`;
}

function renderSummary(md) {
  document.getElementById('repo-summary').innerHTML = markdownToHtml(md);
}

function renderHealth(m, contributorsCount, openIssuesCount) {
  const el = document.getElementById('health-grid');
  const healthScore  = Math.round((m.overall_health.score || 0) + (Math.min(m.maintainer_responsiveness.score || 0, 50)) / 2);
  const confidence   = Math.min(98, Math.max(72, Math.round((healthScore + m.maintainer_responsiveness.score) / 2)));
  const riskClass    = m.bus_factor.risk_level.toLowerCase().includes('high') ? 'high' : m.bus_factor.risk_level.toLowerCase().includes('low') ? 'low' : 'medium';
  const responseClass= m.maintainer_responsiveness.score >= 70 ? 'low' : m.maintainer_responsiveness.score >= 45 ? 'medium' : 'high';

  const largeCards = [
    { label:'Overall health',   value:`${m.overall_health.score}/100`, sub:m.overall_health.status,  emoji:m.overall_health.emoji },
    { label:'Composite score',  value:`${healthScore}%`,               sub:'Health index',            emoji:'📈' },
  ];
  const mediumCards = [
    { label:'Maintainer response', value:`${m.maintainer_responsiveness.score}/100`, sub:m.maintainer_responsiveness.rating, emoji:m.maintainer_responsiveness.score>=70?'⚡':'⏱️', chip:`response-${responseClass}` },
    { label:'Issue closing time',  value:`${m.issue_closing.avg_days}d`,             sub:m.issue_closing.rating,             emoji:'🗓️', chip:`response-${responseClass}` },
  ];
  const smallCards = [
    { label:'Bus factor risk', value:m.bus_factor.risk_level, sub:`${m.bus_factor.top_contributor_share}% top`, emoji:'👤', chip:`status-${riskClass}` },
    { label:'Contributors',    value:contributorsCount !== null ? contributorsCount : '?', sub:'tracked', emoji:'👥' },
  ];

  const actionList   = m.maintainer_responsiveness.score < 70
    ? ['Start with small PRs','Join discussions before coding','Choose beginner-friendly issues']
    : ['Target active issues first','Read contribution docs','Submit concise fixes'];
  const insightTitle = m.maintainer_responsiveness.score < 70
    ? 'This repository is beginner-friendly but maintainers respond slowly.'
    : 'Maintainers are generally responsive — this repo is a good first contribution target.';

  let dashboardHtml = `
    <div class="health-dashboard">
      <div class="health-header">
        <div><div class="health-title">📊 Repository Health</div></div>
        <div class="health-status-badge">Health Score: ${healthScore}%</div>
      </div>
      <div class="health-metrics-compact">`;

  for (const card of largeCards) {
    const v = String(card.value);
    dashboardHtml += `
      <div class="health-metric large">
        <div class="health-metric-label">${escapeHtml(card.label)}</div>
        <div class="health-metric-value">${escapeHtml(v)}</div>
        <div style="font-size:.88rem;color:rgba(245,241,232,.7)">${escapeHtml(card.sub)} ${card.emoji}</div>
        <div class="health-metric-bar"><div class="health-metric-fill" style="width:${Math.min(parseInt(v)||50,100)}%"></div></div>
      </div>`;
  }
  for (const card of mediumCards) {
    const v = String(card.value);
    const vHtml = card.chip ? `<span class="status-chip ${card.chip}">${escapeHtml(v)}</span>` : escapeHtml(v);
    dashboardHtml += `
      <div class="health-metric">
        <div class="health-metric-label">${escapeHtml(card.label)}</div>
        <div class="health-metric-value">${vHtml}</div>
        <div style="font-size:.85rem;color:rgba(245,241,232,.7)">${escapeHtml(card.sub)} ${card.emoji}</div>
        <div class="health-metric-bar"><div class="health-metric-fill" style="width:${Math.min(parseInt(v)||50,100)}%"></div></div>
      </div>`;
  }
  for (const card of smallCards) {
    const v = String(card.value);
    const vHtml = card.chip ? `<span class="status-chip ${card.chip}">${escapeHtml(v)}</span>` : escapeHtml(v);
    dashboardHtml += `
      <div class="health-metric">
        <div class="health-metric-label">${escapeHtml(card.label)}</div>
        <div class="health-metric-value">${vHtml}</div>
        <div style="font-size:.85rem;color:rgba(245,241,232,.7)">${escapeHtml(card.sub)} ${card.emoji}</div>
      </div>`;
  }
  dashboardHtml += `</div></div>`;

  const sidebarHtml = `
    <div class="health-sidebar">
      <div class="ai-insight-panel">
        <div class="ai-insight-badge">🚀 ${m.maintainer_responsiveness.score<70?'Beginner-friendly':'Responsive Repo'}</div>
        <h3>🤖 AI Contribution Advisor</h3>
        <p class="ai-insight-summary">${escapeHtml(insightTitle)}</p>
        <div>
          <div class="ai-insight-section-label">Suggested Actions</div>
          <ul class="ai-insight-list">${actionList.map(i=>`<li>${escapeHtml(i)}</li>`).join('')}</ul>
        </div>
        <div class="ai-insight-footer">
          <div><span class="label">Expected Review</span><strong>≈ ${escapeHtml(String(m.issue_closing.avg_days))} days</strong></div>
          <div><span class="label">Confidence</span><strong>${confidence}%</strong></div>
        </div>
      </div>
      <div class="analytics-mini-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <div>
            <div class="analytics-title">📈 Repository Activity</div>
            <div class="analytics-period">Last 30 days</div>
          </div>
          <div class="analytics-trend ${confidence>=75?'positive':'neutral'}">↑ ${confidence>=75?'+':''}${Math.round((confidence-50)*.8)}%</div>
        </div>
        <svg class="analytics-chart" viewBox="0 0 280 60" preserveAspectRatio="none">
          <defs>
            <linearGradient id="cg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   style="stop-color:#ff7b54;stop-opacity:.3"/>
              <stop offset="100%" style="stop-color:#62f5a6;stop-opacity:.05"/>
            </linearGradient>
            <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   style="stop-color:#ff7b54"/>
              <stop offset="100%" style="stop-color:#62f5a6"/>
            </linearGradient>
          </defs>
          <polyline points="0,45 14,38 28,42 42,35 56,28 70,32 84,25 98,18 112,22 126,15 140,12 154,18 168,14 182,8 196,12 210,20 224,15 238,10 252,6 266,8 280,12"
                    fill="url(#cg)" stroke="url(#lg)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="analytics-stat">
          <span class="analytics-stat-label">Peak activity</span>
          <span class="analytics-stat-value">Tuesday</span>
        </div>
      </div>
    </div>`;

  el.innerHTML = dashboardHtml + sidebarHtml;
}

function renderTechStack(tech) {
  const el      = document.getElementById('tech-stack');
  const entries = Object.entries(tech.languages || {}).sort((a,b)=>b[1]-a[1]);
  if (!entries.length) {
    el.innerHTML = `<p style="color:var(--text-dim)">No language data available.</p>`;
    return;
  }
  el.innerHTML = `<div class="tech-bars">${entries.map(([lang,pct])=>`
    <div class="tech-bar-row">
      <div class="tech-name">${escapeHtml(lang)}</div>
      <div class="tech-track"><div class="tech-fill" style="width:${Math.min(pct,100)}%"></div></div>
      <div class="tech-pct">${pct}%</div>
    </div>`).join('')}</div>`;
}

function renderBeginnerGuide(guide) {
  const el  = document.getElementById('beginner-guide');
  let html  = `<div class="insights-grid">
    <div class="insight-card success">
      <div class="insight-icon">🧠</div>
      <div class="insight-label">AI Insight</div>
      <div class="insight-title">Best Starting Point</div>
      <div class="insight-content">Most beginner contributors start with <strong>documentation</strong> or <strong>tests</strong>. Look for <code>good first issue</code> labels.</div>
    </div>
    <div class="insight-card warning">
      <div class="insight-icon">⚠️</div>
      <div class="insight-label">Warning</div>
      <div class="insight-title">Avoid Complex Areas</div>
      <div class="insight-content">Deep internal modules often have high complexity. Start with <strong>helpers</strong> or <strong>utilities</strong> instead.</div>
    </div>
    <div class="insight-card success">
      <div class="insight-icon">🚀</div>
      <div class="insight-label">Fastest Path</div>
      <div class="insight-title">Quick First PR</div>
      <div class="insight-content">Type fixes, docs, and tests are <strong>easiest wins</strong>. Build confidence before tackling feature code.</div>
    </div>
  </div>`;

  if (guide.areas && guide.areas.length > 0) {
    html += '<div style="display:grid;gap:12px;margin-bottom:20px">';
    html += guide.areas.map(area => `
      <div class="area-card" style="border-top:3px solid var(--accent)">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <h4 style="margin:0;flex:1">${escapeHtml(area.language)}</h4>
          <span style="display:inline-flex;align-items:center;gap:4px;font-family:var(--font-mono);font-size:.75rem;padding:4px 10px;background:rgba(94,230,200,.1);border:1px solid rgba(94,230,200,.3);border-radius:3px;color:var(--good)">🟢 Beginner</span>
        </div>
        <div class="area-files">${area.files.map(f=>'📄 '+escapeHtml(f)).join('  ')}</div>
        <div class="area-focus" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">📌 <strong>${escapeHtml(area.focus)}</strong></div>
      </div>`).join('');
    html += '</div>';
  } else {
    html += `<div class="panel" style="padding:20px;margin-bottom:20px"><p style="color:var(--text-dim)">No specific beginner contribution areas detected for this stack.</p></div>`;
  }

  const issues      = guide.beginner_issues.length > 0 ? guide.beginner_issues : guide.fallback_issues;
  const issueLabel  = guide.beginner_issues.length > 0
    ? '✅ Beginner-friendly open issues'
    : '⚠️ No beginner tags found — showing recent issues';

  html += `
    <div class="panel" style="background:var(--panel);border-top:3px solid var(--good)">
      <h4 style="font-family:var(--font-display);color:var(--good);margin-bottom:12px;display:flex;align-items:center;gap:8px">${issueLabel}</h4>
      ${issues.length > 0 ? `<ul class="issue-list">${issues.slice(0,5).map(i=>`<li>
        <div style="display:flex;align-items:baseline;gap:8px">
          <span style="color:var(--good);white-space:nowrap">→</span>
          <a href="${escapeAttr(i.url)}" target="_blank" rel="noopener" style="color:var(--accent)">${escapeHtml(i.title||'Untitled issue')}</a>
        </div></li>`).join('')}</ul>`
      : `<p style="color:var(--text-dim)">No open issues found.</p>`}
    </div>`;
  el.innerHTML = html;
}

// ============================================================
// renderFolders — smart tier-based tree view
// ============================================================

const TIER_META = {
  beginner: { label: '🟢 Beginner Friendly', borderColor: '#3B6D11', glowColor: 'rgba(63,113,17,.18)', badgeBg: 'rgba(59,109,17,.15)', badgeColor: '#3B6D11' },
  explore:  { label: '🟡 Explore Later',     borderColor: '#854F0B', glowColor: 'rgba(133,79,11,.18)', badgeBg: 'rgba(133,79,11,.15)', badgeColor: '#854F0B' },
  avoid:    { label: '🔴 Avoid Initially',   borderColor: '#A32D2D', glowColor: 'rgba(163,45,45,.18)', badgeBg: 'rgba(163,45,45,.15)', badgeColor: '#A32D2D' },
};

const FOLDER_ICONS = {
  '.py':'🐍','.html':'🌐','.css':'🎨','.js':'⚡','.ts':'🔷','.jsx':'⚛️','.tsx':'⚛️',
  '.json':'📋','.yaml':'📋','.yml':'📋','.toml':'📋','.env':'🔑','.txt':'📄',
  '.md':'📝','.rst':'📝','.lock':'🔒','dockerfile':'🐳','.gitignore':'⚙️',
  'packages':'📦','scripts':'⚙️','compiler':'⚡','fixtures':'🧪','src':'📁',
  'tests':'🧪','docs':'📝','dist':'📦','build':'🔨','public':'🌐','config':'⚙️',
};

function getFolderIcon(name) {
  const lower = name.toLowerCase();
  if (FOLDER_ICONS[lower]) return FOLDER_ICONS[lower];
  const ext = lower.slice(lower.lastIndexOf('.'));
  return FOLDER_ICONS[ext] || '📁';
}

function buildFolderRow(node) {
  const meta   = TIER_META[node.tier] || TIER_META.explore;
  const icon   = getFolderIcon(node.name);
  const row    = document.createElement('div');
  row.className= 'rp-folder-row';
  row.style.cssText = `
    background: var(--panel);
    border: 1px solid var(--border);
    border-left: 3px solid ${meta.borderColor};
    border-radius: var(--radius);
    padding: 14px 16px;
    margin-bottom: 8px;
    cursor: default;
    transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
    display: flex;
    align-items: flex-start;
    gap: 12px;
  `;

  row.addEventListener('mouseenter', () => {
    row.style.transform   = 'translateY(-2px) translateX(3px)';
    row.style.boxShadow   = `-3px 0 0 0 ${meta.borderColor}, 0 6px 18px ${meta.glowColor}`;
    row.style.borderColor = 'var(--border)';
    row.style.borderLeftColor = meta.borderColor;
  });
  row.addEventListener('mouseleave', () => {
    row.style.transform   = '';
    row.style.boxShadow   = '';
  });

  row.innerHTML = `
    <span style="font-size:1.3rem;margin-top:2px;flex-shrink:0" aria-hidden="true">${icon}</span>
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:5px">
        <span style="font-family:var(--font-mono);font-size:.9rem;font-weight:600;color:var(--paper)">${escapeHtml(node.name)}</span>
        <span style="font-size:.72rem;font-weight:600;padding:3px 9px;border-radius:20px;background:${meta.badgeBg};color:${meta.badgeColor};white-space:nowrap">
          ${escapeHtml(meta.label)}
        </span>
      </div>
      <div style="font-size:.85rem;color:var(--text-dim);line-height:1.55;margin-bottom:${node.tip?'7px':'0'}">
        ${escapeHtml(node.description || '')}
      </div>
      ${node.tip ? `
        <div style="font-size:.78rem;color:var(--text-faint);font-style:italic;display:flex;align-items:flex-start;gap:5px">
          <span style="flex-shrink:0">💡</span>
          <span>${escapeHtml(node.tip)}</span>
        </div>` : ''}
    </div>`;
  return row;
}

function buildSummaryBar(folderSummary, difficulty) {
  const bar = document.createElement('div');
  bar.style.cssText = `
    background: var(--panel-raised);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 18px;
    margin-bottom: 20px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px,1fr));
    gap: 12px;
  `;
  const cells = [
    { label: 'Key items found',    value: `${folderSummary.total || '—'}` },
    { label: 'Best starting point',value: folderSummary.best_start || '—' },
    { label: 'Avoid initially',    value: folderSummary.avoid      || '—' },
    { label: 'Difficulty',         value: difficulty               || '—' },
  ];
  bar.innerHTML = cells.map(c => `
    <div>
      <div style="font-family:var(--font-mono);font-size:.68rem;color:var(--text-faint);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">
        ${escapeHtml(c.label)}
      </div>
      <div style="font-family:var(--font-display);font-size:.95rem;font-weight:700;color:var(--paper)">
        ${escapeHtml(c.value)}
      </div>
    </div>`).join('');
  return bar;
}

function buildSectionLabel(text) {
  const el = document.createElement('div');
  el.style.cssText = `
    font-family: var(--font-mono);
    font-size: .72rem;
    font-weight: 600;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--text-dim);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 0 8px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 12px;
    margin-top: 4px;
  `;
  el.textContent = text;
  return el;
}

function renderFolders(folderTree, folderSummary, folderExplanation) {
  const el = document.getElementById('folder-explanation');

  // Fallback — no structured data
  if (!folderTree || (Array.isArray(folderTree) && folderTree.length === 0)) {
    el.innerHTML = folderExplanation
      ? `<div class="folder-tree">
           <p style="color:var(--text-dim);font-size:.85rem;margin-bottom:12px">
             ⚠️ Folder data came back as plain text. Update your backend prompt to return JSON for the tree view.
           </p>
           <pre style="font-family:var(--font-mono);font-size:12px;color:var(--text-dim);white-space:pre-wrap">${escapeHtml(folderExplanation)}</pre>
         </div>`
      : '<p style="color:var(--text-dim)">No folder information available.</p>';
    return;
  }

  el.innerHTML = '';

  // Summary bar
  const difficulty = folderSummary
    ? (folderSummary.avoid && folderSummary.avoid !== '—' ? 'Intermediate' : 'Beginner')
    : 'Intermediate';
  el.appendChild(buildSummaryBar(folderSummary || {}, difficulty));

  // Split into tiers
  const beginnerNodes = folderTree.filter(n => n.tier === 'beginner');
  const otherNodes    = folderTree.filter(n => n.tier !== 'beginner');

  if (beginnerNodes.length) {
    el.appendChild(buildSectionLabel('⭐  Recommended Starting Points'));
    beginnerNodes.forEach(n => el.appendChild(buildFolderRow(n)));
  }

  if (otherNodes.length) {
    el.appendChild(buildSectionLabel('⚙  Advanced / Core Internals'));
    otherNodes.forEach(n => el.appendChild(buildFolderRow(n)));
  }
}

// ------------------------------------------------------------
// Contribution path
// ------------------------------------------------------------
function renderContributionPath(markdown) {
  const el    = document.getElementById('contribution-path');
  const lines = (markdown || '').split('\n').filter(l => l.trim());
  const steps = [];
  for (const line of lines) {
    const m = line.trim().match(/^(?:\d+\.\s*|[-*]\s*)?(.+?)(?:\s*→|\s*↓)?$/);
    if (m && m[1].trim()) steps.push(m[1].trim());
  }

  let html = `<div class="difficulty-section" style="margin-bottom:24px">
    <div class="difficulty-header">
      <div class="difficulty-label">🎯 Contribution Difficulty</div>
      <div class="difficulty-score-display">Medium</div>
    </div>
    <div class="difficulty-bar"><div class="difficulty-fill" style="width:50%"></div></div>
    <div class="difficulty-categories">
      <div class="difficulty-cat possible"><div class="difficulty-cat-badge">✓</div><span>Beginner Possible</span></div>
      <div class="difficulty-cat recommended"><div class="difficulty-cat-badge">✓</div><span>Intermediate Recommended</span></div>
      <div class="difficulty-cat advanced"><div class="difficulty-cat-badge">✗</div><span>Advanced Only</span></div>
    </div>
  </div><div class="roadmap-timeline">`;

  if (steps.length) {
    steps.forEach((step, idx) => {
      let title = step.replace(/^#+\s*|^[-*]\s*/,'');
      let desc  = '';
      const parts = title.split(':');
      if (parts.length > 1) { title = parts[0].trim(); desc = parts.slice(1).join(':').trim(); }
      html += `
        <div class="roadmap-step ${idx<2?'done':''}">
          <div class="roadmap-step-indicator">${idx+1}</div>
          <div class="roadmap-content">
            <div class="roadmap-title">${escapeHtml(title)}</div>
            ${desc?`<div class="roadmap-description">${escapeHtml(desc)}</div>`:''}
          </div>
        </div>`;
    });
  } else {
    html += '<div class="panel" style="padding:20px"><p style="color:var(--text-dim)">No contribution path available.</p></div>';
  }
  html += '</div>';
  el.innerHTML = html;
}

// ------------------------------------------------------------
// Heatmap
// ------------------------------------------------------------
function renderHeatmap(heat) {
  const el   = document.getElementById('heatmap-panel');
  const data = heat.data || [];
  if (!data.length || data.every(d=>d.activity===0)) {
    el.innerHTML = `<div class="activity-empty">No maintainer comment activity recorded yet — open a PR any time.</div>`;
    return;
  }
  const maxA       = Math.max(1,...data.map(d=>d.activity));
  const topHourSet = new Set(heat.top_hours.map(h=>h.hour.replace(':00','')));
  const bars       = data.map(d=>{
    const h=d.hour.replace(':00',''), pct=Math.max(4,(d.activity/maxA)*100), isPeak=topHourSet.has(h);
    let cls='activity-bar';
    if(d.activity>0) cls+=' has-activity';
    if(isPeak) cls+=' peak';
    return `<div class="activity-bar-col"><span class="activity-bar-count">${d.activity}</span><div class="${cls}" style="height:${pct}%"></div></div>`;
  }).join('');
  const labels = data.map(d=>{
    const h=d.hour.replace(':00','');
    return `<div class="activity-label${topHourSet.has(h)?' peak':''}">${h}</div>`;
  }).join('');
  const topHoursHtml = heat.top_hours.length
    ? heat.top_hours.map(h=>`<span>${h.hour} UTC</span> (${h.count} interactions)`).join(' &nbsp;·&nbsp; ')
    : 'No recent maintainer activity recorded.';
  el.innerHTML = `
    <div class="activity-chart">${bars}</div>
    <div class="activity-labels">${labels}</div>
    <div class="top-hours">Best time to open a PR (UTC): ${topHoursHtml}</div>`;
}

// ------------------------------------------------------------
// Foundry IQ Reasoning Trace
// ------------------------------------------------------------
function renderTrace(data) {
  const section = document.getElementById('reasoning-section');
  const el      = document.getElementById('reasoning-trace');
  const trace   = data.reasoning_trace || [];
  if (!trace.length) { section.style.display='none'; return; }
  section.style.display='block';
  let html = data.foundry_powered
    ? `<div class="foundry-badge">⚡ Powered by Microsoft Foundry IQ — grounded retrieval with citations</div>`
    : '';
  html += '<div class="trace-grid">';
  html += trace.map(t=>`
    <div class="trace-step done">
      <div class="trace-num">step ${escapeHtml(String(t.step))}</div>
      <div class="trace-body">
        <div class="trace-title">${escapeHtml(t.title)}</div>
        <div class="trace-detail">${escapeHtml(t.detail)}</div>
      </div>
    </div>`).join('');
  html += '</div>';
  if (data.citations && data.citations.length) {
    html += `<div class="citation-list" style="margin-top:14px">
      <span style="color:var(--text-dim);margin-right:6px">Sources cited:</span>
      ${data.citations.map(c=>`<span>${escapeHtml(c)}</span>`).join('')}
    </div>`;
  }
  el.innerHTML = html;
}

// ------------------------------------------------------------
// Markdown helpers
// ------------------------------------------------------------
function markdownToHtml(md) {
  if (!md) return '';
  const lines = md.split('\n');
  let html = '', inList = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { if (inList) { html+='</ul>'; inList=false; } continue; }
    if (line.startsWith('## '))      { if(inList){html+='</ul>';inList=false;} html+=`<h2>${inlineMd(line.slice(3))}</h2>`; }
    else if (line.startsWith('### ')){ if(inList){html+='</ul>';inList=false;} html+=`<h3>${inlineMd(line.slice(4))}</h3>`; }
    else if (/^(-|\*|\d+\.)\s/.test(line)) {
      if(!inList){html+='<ul>';inList=true;}
      html+=`<li>${inlineMd(line.replace(/^(-|\*|\d+\.)\s/,''))}</li>`;
    } else { if(inList){html+='</ul>';inList=false;} html+=`<p>${inlineMd(line)}</p>`; }
  }
  if (inList) html+='</ul>';
  return html;
}

function inlineMd(text) {
  let s = escapeHtml(text);
  s = s.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  s = s.replace(/`(.+?)`/g,'<code>$1</code>');
  s = s.replace(/\[(.+?)\]\((.+?)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
  return s;
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g,'&quot;');
}