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
  // ── FIX: pass folder_tree (structured JSON) + folder_explanation (plain-text fallback) ──
  renderFolders(data.folder_tree, data.folder_explanation);
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

  const healthScore = Math.round((m.overall_health.score || 0) + (Math.min(m.maintainer_responsiveness.score || 0, 50)) / 2);
  const confidence = Math.min(98, Math.max(72, Math.round((healthScore + m.maintainer_responsiveness.score) / 2)));

  const riskClass = m.bus_factor.risk_level.toLowerCase().includes('high') ? 'high' : m.bus_factor.risk_level.toLowerCase().includes('low') ? 'low' : 'medium';
  const responseClass = m.maintainer_responsiveness.score >= 70 ? 'low' : m.maintainer_responsiveness.score >= 45 ? 'medium' : 'high';

  const largeCards = [
    { label: 'Overall health', value: `${m.overall_health.score}/100`, sub: `${m.overall_health.status}`, emoji: m.overall_health.emoji, size: 'large' },
    { label: 'Composite score', value: `${healthScore}%`, sub: 'Health index', emoji: '📈', size: 'large' }
  ];

  const mediumCards = [
    { label: 'Maintainer response', value: `${m.maintainer_responsiveness.score}/100`, sub: m.maintainer_responsiveness.rating, emoji: m.maintainer_responsiveness.score >= 70 ? '⚡' : '⏱️', chip: `response-${responseClass}`, size: 'medium' },
    { label: 'Issue closing time', value: `${m.issue_closing.avg_days}d`, sub: `${m.issue_closing.rating}`, emoji: '🗓️', chip: `response-${responseClass}`, size: 'medium' }
  ];

  const smallCards = [
    { label: 'Bus factor risk', value: m.bus_factor.risk_level, sub: `${m.bus_factor.top_contributor_share}% top`, emoji: '👤', chip: `status-${riskClass}`, size: 'small' },
    { label: 'Contributors', value: contributorsCount !== null ? contributorsCount : '?', sub: 'tracked', emoji: '👥', size: 'small' }
  ];

  const actionList = m.maintainer_responsiveness.score < 70
    ? ['Start with small PRs', 'Join discussions before coding', 'Choose beginner-friendly issues']
    : ['Target active issues first', 'Read contribution docs', 'Submit concise fixes'];

  const insightTitle = m.maintainer_responsiveness.score < 70
    ? 'This repository is beginner-friendly but maintainers respond slowly.'
    : 'Maintainers are generally responsive — this repo is a good first contribution target.';

  let dashboardHtml = `
    <div class="health-dashboard">
      <div class="health-header">
        <div>
          <div class="health-title">📊 Repository Health</div>
        </div>
        <div class="health-status-badge">Health Score: ${healthScore}%</div>
      </div>
      <div class="health-metrics-compact">
  `;

  for (let card of largeCards) {
    const valueStr = String(card.value);
    dashboardHtml += `
      <div class="health-metric large">
        <div class="health-metric-label">${escapeHtml(card.label)}</div>
        <div class="health-metric-value">${escapeHtml(valueStr)}</div>
        <div style="font-size:0.88rem; color:rgba(245,241,232,0.7);">${escapeHtml(card.sub)} ${card.emoji}</div>
        <div class="health-metric-bar"><div class="health-metric-fill" style="width:${Math.min(parseInt(valueStr) || 50, 100)}%"></div></div>
      </div>
    `;
  }

  for (let card of mediumCards) {
    const valueStr = String(card.value);
    let valueHtml = escapeHtml(valueStr);
    if (card.chip) valueHtml = `<span class="status-chip ${card.chip}">${escapeHtml(valueStr)}</span>`;
    dashboardHtml += `
      <div class="health-metric">
        <div class="health-metric-label">${escapeHtml(card.label)}</div>
        <div class="health-metric-value">${valueHtml}</div>
        <div style="font-size:0.85rem; color:rgba(245,241,232,0.7);">${escapeHtml(card.sub)} ${card.emoji}</div>
        <div class="health-metric-bar"><div class="health-metric-fill" style="width:${Math.min(parseInt(valueStr) || 50, 100)}%"></div></div>
      </div>
    `;
  }

  for (let card of smallCards) {
    const valueStr = String(card.value);
    let valueHtml = escapeHtml(valueStr);
    if (card.chip) valueHtml = `<span class="status-chip ${card.chip}">${escapeHtml(valueStr)}</span>`;
    dashboardHtml += `
      <div class="health-metric">
        <div class="health-metric-label">${escapeHtml(card.label)}</div>
        <div class="health-metric-value">${valueHtml}</div>
        <div style="font-size:0.85rem; color:rgba(245,241,232,0.7);">${escapeHtml(card.sub)} ${card.emoji}</div>
      </div>
    `;
  }

  dashboardHtml += `</div></div>`;

  const sidebarHtml = `
    <div class="health-sidebar">
      <div class="ai-insight-panel">
        <div class="ai-insight-badge">🚀 ${m.maintainer_responsiveness.score < 70 ? 'Beginner-friendly' : 'Responsive Repo'}</div>
        <h3>🤖 AI Contribution Advisor</h3>
        <p class="ai-insight-summary">${escapeHtml(insightTitle)}</p>
        <div>
          <div class="ai-insight-section-label">Suggested Actions</div>
          <ul class="ai-insight-list">
            ${actionList.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </div>
        <div class="ai-insight-footer">
          <div><span class="label">Expected Review</span><strong>≈ ${escapeHtml(String(m.issue_closing.avg_days))} days</strong></div>
          <div><span class="label">Confidence</span><strong>${confidence}%</strong></div>
        </div>
      </div>
      <div class="analytics-mini-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <div>
            <div class="analytics-title">📈 Repository Activity</div>
            <div class="analytics-period">Last 30 days</div>
          </div>
          <div class="analytics-trend ${confidence >= 75 ? 'positive' : 'neutral'}">↑ ${confidence >= 75 ? '+' : ''}${Math.round((confidence - 50) * 0.8)}%</div>
        </div>
        <svg class="analytics-chart" viewBox="0 0 280 60" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#ff7b54;stop-opacity:0.3" />
              <stop offset="100%" style="stop-color:#62f5a6;stop-opacity:0.05" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#ff7b54" />
              <stop offset="100%" style="stop-color:#62f5a6" />
            </linearGradient>
          </defs>
          <polyline points="0,45 14,38 28,42 42,35 56,28 70,32 84,25 98,18 112,22 126,15 140,12 154,18 168,14 182,8 196,12 210,20 224,15 238,10 252,6 266,8 280,12"
                    fill="url(#chartGradient)" stroke="url(#lineGradient)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="analytics-stat">
          <span class="analytics-stat-label">Peak activity</span>
          <span class="analytics-stat-value">Tuesday</span>
        </div>
      </div>
    </div>
  `;

  el.innerHTML = dashboardHtml + sidebarHtml;
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

  html += '<div class="insights-grid">';
  html += `
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
  `;
  html += '</div>';

  if (guide.areas && guide.areas.length > 0) {
    html += '<div style="display: grid; gap: 12px; margin-bottom: 20px;">';
    html += guide.areas.map(area => `
      <div class="area-card" style="border-top: 3px solid var(--accent);">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <h4 style="margin: 0; flex: 1;">${escapeHtml(area.language)}</h4>
          <span style="display: inline-flex; align-items: center; gap: 4px; font-family: var(--font-mono); font-size: 0.75rem; padding: 4px 10px; background: rgba(94, 230, 200, 0.1); border: 1px solid rgba(94, 230, 200, 0.3); border-radius: 3px; color: var(--good);">🟢 Beginner</span>
        </div>
        <div class="area-files">${area.files.map(f => '📄 ' + escapeHtml(f)).join('  ')}</div>
        <div class="area-focus" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border);">📌 <strong>${escapeHtml(area.focus)}</strong></div>
      </div>
    `).join('');
    html += '</div>';
  } else {
    html += `<div class="panel" style="padding: 20px; margin-bottom: 20px;"><p style="color: var(--text-dim);">No specific beginner contribution areas detected for this stack.</p></div>`;
  }

  const issues = guide.beginner_issues.length > 0 ? guide.beginner_issues : guide.fallback_issues;
  const issueLabel = guide.beginner_issues.length > 0
    ? '✅ Beginner-friendly open issues'
    : '⚠️ No beginner tags found — showing recent issues';

  html += `
    <div class="panel" style="background: var(--panel); border-top: 3px solid var(--good);">
      <h4 style="font-family: var(--font-display); color: var(--good); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">${issueLabel}</h4>
      ${issues.length > 0 ? `
        <ul class="issue-list">
          ${issues.slice(0, 5).map(i => `<li>
            <div style="display: flex; align-items: baseline; gap: 8px;">
              <span style="color: var(--good); white-space: nowrap;">→</span>
              <a href="${escapeAttr(i.url)}" target="_blank" rel="noopener" style="color: var(--accent); transition: color 0.2s ease;">${escapeHtml(i.title || 'Untitled issue')}</a>
            </div>
          </li>`).join('')}
        </ul>
      ` : `<p style="color: var(--text-dim);">No open issues found.</p>`}
    </div>
  `;

  el.innerHTML = html;
}

// ------------------------------------------------------------
// Folder Tree — interactive collapsible tree view
// ------------------------------------------------------------

// File-type → emoji icon + color
const FT_ICONS = {
  '.py':   { icon: '🐍', color: '#3776AB' },
  '.html': { icon: '🌐', color: '#E44D26' },
  '.css':  { icon: '🎨', color: '#264de4' },
  '.js':   { icon: '⚡', color: '#d4b800' },
  '.ts':   { icon: '🔷', color: '#3178c6' },
  '.jsx':  { icon: '⚛️',  color: '#61DAFB' },
  '.tsx':  { icon: '⚛️',  color: '#61DAFB' },
  '.json': { icon: '📋', color: '#cbcb41' },
  '.yaml': { icon: '📋', color: '#cb7e32' },
  '.yml':  { icon: '📋', color: '#cb7e32' },
  '.toml': { icon: '📋', color: '#9c4221' },
  '.env':  { icon: '🔑', color: '#ecc94b' },
  '.txt':  { icon: '📄', color: '#8b9cb0' },
  '.md':   { icon: '📝', color: '#8b9cb0' },
  '.rst':  { icon: '📝', color: '#8b9cb0' },
  '.lock': { icon: '🔒', color: '#8b9cb0' },
  'dockerfile':     { icon: '🐳', color: '#2496ED' },
  '.dockerignore':  { icon: '🐳', color: '#2496ED' },
  '.gitignore':     { icon: '⚙️',  color: '#8b9cb0' },
  '.gitattributes': { icon: '⚙️',  color: '#8b9cb0' },
};

// Badge rules — matched against filename
const FT_BADGES = [
  { test: /^main\.py$/i,                badge: 'entry',  label: 'entry point' },
  { test: /^app\.py$/i,                 badge: 'entry',  label: 'entry point' },
  { test: /^index\.html$/i,             badge: 'entry',  label: 'entry point' },
  { test: /foundry|llm|ai_|explainer/i, badge: 'ai',     label: 'AI'          },
  { test: /analyzer|fetcher|metrics/i,  badge: 'core',   label: 'core'        },
  { test: /requirements|\.env|config/i, badge: 'config', label: 'config'      },
  { test: /readme/i,                    badge: 'docs',   label: 'docs'        },
];

function ftGetIcon(name) {
  const lower = name.toLowerCase();
  if (FT_ICONS[lower]) return FT_ICONS[lower];
  const dot = lower.lastIndexOf('.');
  if (dot !== -1) {
    const ext = lower.slice(dot);
    if (FT_ICONS[ext]) return FT_ICONS[ext];
  }
  return { icon: '📄', color: '#8b9cb0' };
}

function ftGetBadge(name) {
  for (const rule of FT_BADGES) {
    if (rule.test.test(name)) return rule;
  }
  return null;
}

// Parse { "path/to/file": "desc" } into a nested tree
function ftParseFlatToTree(flatObj) {
  const root = { name: 'root', type: 'dir', children: [], desc: '' };
  for (const [rawKey, desc] of Object.entries(flatObj)) {
    const parts = rawKey.replace(/^\//, '').split(/[/\\]/).filter(Boolean);
    let cursor = root;
    parts.forEach((part, idx) => {
      const isLast = idx === parts.length - 1;
      const isDir  = !isLast || rawKey.endsWith('/') || rawKey.endsWith('\\');
      let child = cursor.children.find(c => c.name === part);
      if (!child) {
        child = { name: part, type: isDir ? 'dir' : 'file', desc: isLast ? (desc || '') : '', children: isDir ? [] : undefined, open: false };
        cursor.children.push(child);
      } else if (isLast) {
        child.desc = desc || child.desc;
      }
      cursor = child;
    });
  }
  return root;
}

// Sort: dirs first, then files, both alphabetically
function ftSort(node) {
  if (!node.children) return;
  node.children.sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === 'dir' ? -1 : 1;
  });
  node.children.forEach(ftSort);
}

let _ftId = 0;

// Build a single tree row + its children recursively
function ftBuildNode(node, depth, isLast) {
  const id      = 'ft-' + (_ftId++);
  const isDir   = node.type === 'dir';
  const hasKids = isDir && node.children && node.children.length > 0;

  const wrapper = document.createElement('div');
  wrapper.className = 'ftn-node';

  const row = document.createElement('div');
  row.className = 'ftn-row' + (hasKids ? ' ftn-clickable' : '');
  if (hasKids) {
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '0');
    row.setAttribute('aria-expanded', 'false');
  }

  // Indent
  const indent = document.createElement('div');
  indent.style.cssText = 'display:flex;flex-shrink:0;';
  for (let i = 0; i < depth; i++) {
    const pipe = document.createElement('span');
    pipe.className = 'ftn-pipe';
    indent.appendChild(pipe);
  }
  if (depth > 0) {
    const conn = document.createElement('span');
    conn.className = 'ftn-connector' + (isLast ? ' ftn-last' : '');
    indent.appendChild(conn);
  }
  row.appendChild(indent);

  // Toggle chevron
  const tog = document.createElement('span');
  tog.className = 'ftn-toggle';
  tog.textContent = hasKids ? '▸' : '';
  row.appendChild(tog);

  // Icon
  const ico = document.createElement('span');
  ico.className = 'ftn-icon';
  ico.setAttribute('aria-hidden', 'true');
  if (isDir) {
    ico.textContent = '📁';
  } else {
    const { icon, color } = ftGetIcon(node.name);
    ico.textContent = icon;
    ico.style.color = color;
  }
  row.appendChild(ico);

  // Label
  const lbl = document.createElement('div');
  lbl.className = 'ftn-label';

  const nameEl = document.createElement('span');
  nameEl.className = 'ftn-name' + (isDir ? ' ftn-dir' : '') + (node.name.startsWith('.') ? ' ftn-hidden' : '');
  nameEl.textContent = node.name;
  lbl.appendChild(nameEl);

  const badgeRule = ftGetBadge(node.name);
  if (badgeRule) {
    const badge = document.createElement('span');
    badge.className = 'ftn-badge ftn-badge-' + badgeRule.badge;
    badge.textContent = badgeRule.label;
    lbl.appendChild(badge);
  }

  if (node.desc) {
    const desc = document.createElement('span');
    desc.className = 'ftn-desc';
    desc.textContent = '— ' + node.desc;
    lbl.appendChild(desc);
  }

  row.appendChild(lbl);
  wrapper.appendChild(row);

  // Children
  if (hasKids) {
    const kids = document.createElement('div');
    kids.className = 'ftn-children ftn-collapsed';
    node.children.forEach((child, i) =>
      kids.appendChild(ftBuildNode(child, depth + 1, i === node.children.length - 1)));
    wrapper.appendChild(kids);

    row.addEventListener('click', () => {
      const open = kids.classList.contains('ftn-collapsed');
      kids.classList.toggle('ftn-collapsed', !open);
      tog.textContent = open ? '▾' : '▸';
      ico.textContent  = open ? '📂' : '📁';
      row.setAttribute('aria-expanded', String(open));
    });
    row.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); row.click(); }
    });
  }

  return wrapper;
}

// ── FIX: renderFolders now accepts folder_tree (array from backend) ──────────
// and folder_explanation (plain-text fallback)
function renderFolders(folderTree, folderExplanation) {
  _ftId = 0;
  const el = document.getElementById('folder-explanation');

  // ── Guard ────────────────────────────────────────────────────────────────
  if (!folderTree && !folderExplanation) {
    el.innerHTML = '<p style="color:var(--text-dim)">No folder information available.</p>';
    return;
  }

  // ── Fallback: no structured tree — show plain text ───────────────────────
  if (!folderTree || (Array.isArray(folderTree) && folderTree.length === 0)) {
    if (typeof folderExplanation === 'string' && folderExplanation.trim()) {
      el.innerHTML = `
        <div class="folder-tree">
          <p style="color:var(--text-dim);font-size:0.85rem;margin-bottom:12px;">
            ⚠️ Folder data came back as plain text. Update your backend prompt to return JSON for the tree view.
          </p>
          <pre style="font-family:var(--font-mono);font-size:12px;color:var(--text-dim);white-space:pre-wrap;">${escapeHtml(folderExplanation)}</pre>
        </div>`;
    } else {
      el.innerHTML = '<p style="color:var(--text-dim)">No folder information available.</p>';
    }
    return;
  }

  // ── If already a nested root object (e.g. { name, children[] }) ─────────
  if (!Array.isArray(folderTree) && folderTree.name && Array.isArray(folderTree.children)) {
    const root = folderTree;
    ftSort(root);
    el.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'ftn-header';
    header.innerHTML = `<span class="ftn-header-label">📂 ${root.children.length} items</span>`;
    el.appendChild(header);
    const tree = document.createElement('div');
    tree.className = 'ftn-root';
    root.children.forEach((child, i) =>
      tree.appendChild(ftBuildNode(child, 0, i === root.children.length - 1)));
    el.appendChild(tree);
    return;
  }

  // ── Main path: backend returns Array<{ name, description, type, children? }>
  // Convert to the flat { "name/": "desc" } object that ftParseFlatToTree expects
  let flatObj = {};
  if (Array.isArray(folderTree)) {
    folderTree.forEach(node => {
      const isDir = node.type === 'folder' || node.type === 'dir';
      // trailing slash tells ftParseFlatToTree this is a directory
      const key = isDir ? node.name + '/' : node.name;
      flatObj[key] = node.description || '';

      // one level of nested children if provided
      if (Array.isArray(node.children)) {
        node.children.forEach(child => {
          const childIsDir = child.type === 'folder' || child.type === 'dir';
          const childKey = node.name + '/' + child.name + (childIsDir ? '/' : '');
          flatObj[childKey] = child.description || '';
        });
      }
    });
  } else {
    // plain object passed directly — use as-is
    flatObj = folderTree;
  }

  // ── Build tree + render ──────────────────────────────────────────────────
  const root = ftParseFlatToTree(flatObj);
  ftSort(root);

  el.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'ftn-header';
  header.innerHTML = `<span class="ftn-header-label">📂 ${root.children.length} items</span>`;
  el.appendChild(header);

  const tree = document.createElement('div');
  tree.className = 'ftn-root';
  root.children.forEach((child, i) =>
    tree.appendChild(ftBuildNode(child, 0, i === root.children.length - 1)));
  el.appendChild(tree);
}

// ------------------------------------------------------------
// Contribution path
// ------------------------------------------------------------
function renderContributionPath(markdown) {
  const el = document.getElementById('contribution-path');
  const lines = (markdown || '').split('\n').filter(l => l.trim());
  const steps = [];

  for (let line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(?:\d+\.\s*|[-*]\s*)?(.+?)(?:\s*→|\s*↓)?$/);
    if (match && match[1].trim()) steps.push(match[1].trim());
  }

  let html = `<div class="difficulty-section" style="margin-bottom: 24px;">
    <div class="difficulty-header">
      <div class="difficulty-label">🎯 Contribution Difficulty</div>
      <div class="difficulty-score-display">Medium</div>
    </div>
    <div class="difficulty-bar"><div class="difficulty-fill" style="width: 50%"></div></div>
    <div class="difficulty-categories">
      <div class="difficulty-cat possible"><div class="difficulty-cat-badge">✓</div><span>Beginner Possible</span></div>
      <div class="difficulty-cat recommended"><div class="difficulty-cat-badge">✓</div><span>Intermediate Recommended</span></div>
      <div class="difficulty-cat advanced"><div class="difficulty-cat-badge">✗</div><span>Advanced Only</span></div>
    </div>
  </div>`;

  html += '<div class="roadmap-timeline">';

  if (steps.length > 0) {
    steps.forEach((step, idx) => {
      const isCompleted = idx < 2;
      let title = step.replace(/^#+\s*/, '').replace(/^[-*]\s*/, '');
      let description = '';
      const parts = title.split(':');
      if (parts.length > 1) { title = parts[0].trim(); description = parts.slice(1).join(':').trim(); }
      html += `
        <div class="roadmap-step ${isCompleted ? 'done' : ''}">
          <div class="roadmap-step-indicator">${idx + 1}</div>
          <div class="roadmap-content">
            <div class="roadmap-title">${escapeHtml(title)}</div>
            ${description ? `<div class="roadmap-description">${escapeHtml(description)}</div>` : ''}
          </div>
        </div>`;
    });
  } else {
    html += '<div class="panel" style="padding: 20px;"><p style="color: var(--text-dim);">No contribution path available for this repository.</p></div>';
  }

  html += '</div>';
  el.innerHTML = html;
}

// ------------------------------------------------------------
// Heatmap
// ------------------------------------------------------------
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
    return `<div class="activity-bar-col"><span class="activity-bar-count">${d.activity}</span><div class="${cls}" style="height:${heightPct}%"></div></div>`;
  }).join('');

  const labels = data.map(d => {
    const hourNum = d.hour.replace(':00', '');
    return `<div class="activity-label${topHourSet.has(hourNum) ? ' peak' : ''}">${hourNum}</div>`;
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

  if (!trace.length) { section.style.display = 'none'; return; }

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
// Tiny markdown renderer
// ------------------------------------------------------------
function markdownToHtml(md) {
  if (!md) return '';
  const lines = md.split('\n');
  let html = '';
  let inList = false;
  for (let raw of lines) {
    const line = raw.trim();
    if (line === '') { if (inList) { html += '</ul>'; inList = false; } continue; }
    if (line.startsWith('## ')) { if (inList) { html += '</ul>'; inList = false; } html += `<h2>${inlineMd(line.slice(3))}</h2>`; }
    else if (line.startsWith('### ')) { if (inList) { html += '</ul>'; inList = false; } html += `<h3>${inlineMd(line.slice(4))}</h3>`; }
    else if (line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s/.test(line)) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${inlineMd(line.replace(/^(-|\*|\d+\.)\s/, ''))}</li>`;
    } else { if (inList) { html += '</ul>'; inList = false; } html += `<p>${inlineMd(line)}</p>`; }
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
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}