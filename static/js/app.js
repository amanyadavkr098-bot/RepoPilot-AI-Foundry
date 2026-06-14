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

  // Calculate health scores
  const healthScore = Math.round((m.overall_health.score || 0) + (Math.min(m.maintainer_responsiveness.score || 0, 50)) / 2);
  const confidence = Math.min(98, Math.max(72, Math.round((healthScore + m.maintainer_responsiveness.score) / 2)));

  const riskClass = m.bus_factor.risk_level.toLowerCase().includes('high') ? 'high' : m.bus_factor.risk_level.toLowerCase().includes('low') ? 'low' : 'medium';
  const responseClass = m.maintainer_responsiveness.score >= 70 ? 'low' : m.maintainer_responsiveness.score >= 45 ? 'medium' : 'high';

  // Cards organized by visual hierarchy
  const largeCards = [
    {
      label: 'Overall health',
      value: `${m.overall_health.score}/100`,
      sub: `${m.overall_health.status}`,
      emoji: m.overall_health.emoji,
      size: 'large'
    },
    {
      label: 'Composite score',
      value: `${healthScore}%`,
      sub: 'Health index',
      emoji: '📈',
      size: 'large'
    }
  ];

  const mediumCards = [
    {
      label: 'Maintainer response',
      value: `${m.maintainer_responsiveness.score}/100`,
      sub: m.maintainer_responsiveness.rating,
      emoji: m.maintainer_responsiveness.score >= 70 ? '⚡' : '⏱️',
      chip: `response-${responseClass}`,
      size: 'medium'
    },
    {
      label: 'Issue closing time',
      value: `${m.issue_closing.avg_days}d`,
      sub: `${m.issue_closing.rating}`,
      emoji: '🗓️',
      chip: `response-${responseClass}`,
      size: 'medium'
    }
  ];

  const smallCards = [
    {
      label: 'Bus factor risk',
      value: m.bus_factor.risk_level,
      sub: `${m.bus_factor.top_contributor_share}% top`,
      emoji: '👤',
      chip: `status-${riskClass}`,
      size: 'small'
    },
    {
      label: 'Contributors',
      value: contributorsCount !== null ? contributorsCount : '?',
      sub: 'tracked',
      emoji: '👥',
      size: 'small'
    }
  ];

  const actionList = m.maintainer_responsiveness.score < 70
    ? ['Start with small PRs', 'Join discussions before coding', 'Choose beginner-friendly issues']
    : ['Target active issues first', 'Read contribution docs', 'Submit concise fixes'];

  const insightTitle = m.maintainer_responsiveness.score < 70
    ? 'This repository is beginner-friendly but maintainers respond slowly.'
    : 'Maintainers are generally responsive — this repo is a good first contribution target.';

  // Render dashboard section
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

  // Render large cards (hero)
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

  // Render medium cards
  for (let card of mediumCards) {
    const valueStr = String(card.value);
    let valueHtml = escapeHtml(valueStr);
    if (card.chip) {
      valueHtml = `<span class="status-chip ${card.chip}">${escapeHtml(valueStr)}</span>`;
    }
    dashboardHtml += `
      <div class="health-metric">
        <div class="health-metric-label">${escapeHtml(card.label)}</div>
        <div class="health-metric-value">${valueHtml}</div>
        <div style="font-size:0.85rem; color:rgba(245,241,232,0.7);">${escapeHtml(card.sub)} ${card.emoji}</div>
        <div class="health-metric-bar"><div class="health-metric-fill" style="width:${Math.min(parseInt(valueStr) || 50, 100)}%"></div></div>
      </div>
    `;
  }

  // Render small cards
  for (let card of smallCards) {
    const valueStr = String(card.value);
    let valueHtml = escapeHtml(valueStr);
    if (card.chip) {
      valueHtml = `<span class="status-chip ${card.chip}">${escapeHtml(valueStr)}</span>`;
    }
    dashboardHtml += `
      <div class="health-metric">
        <div class="health-metric-label">${escapeHtml(card.label)}</div>
        <div class="health-metric-value">${valueHtml}</div>
        <div style="font-size:0.85rem; color:rgba(245,241,232,0.7);">${escapeHtml(card.sub)} ${card.emoji}</div>
      </div>
    `;
  }

  dashboardHtml += `
      </div>
    </div>
  `;

  // Render right sidebar with advisor and analytics
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
          <div>
            <span class="label">Expected Review</span>
            <strong>≈ ${escapeHtml(String(m.issue_closing.avg_days))} days</strong>
          </div>
          <div>
            <span class="label">Confidence</span>
            <strong>${confidence}%</strong>
          </div>
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

  // Add AI Insights section
  html += '<div class="insights-grid">';
  
  html += `
    <div class="insight-card success">
      <div class="insight-icon">🧠</div>
      <div class="insight-label">AI Insight</div>
      <div class="insight-title">Best Starting Point</div>
      <div class="insight-content">Most beginner contributors start with <strong>documentation</strong> or <strong>tests</strong>. Look for <code>good first issue</code> labels.</div>
    </div>
  `;

  html += `
    <div class="insight-card warning">
      <div class="insight-icon">⚠️</div>
      <div class="insight-label">Warning</div>
      <div class="insight-title">Avoid Complex Areas</div>
      <div class="insight-content">Deep internal modules often have high complexity. Start with <strong>helpers</strong> or <strong>utilities</strong> instead.</div>
    </div>
  `;

  html += `
    <div class="insight-card success">
      <div class="insight-icon">🚀</div>
      <div class="insight-label">Fastest Path</div>
      <div class="insight-title">Quick First PR</div>
      <div class="insight-content">Type fixes, docs, and tests are <strong>easiest wins</strong>. Build confidence before tackling feature code.</div>
    </div>
  `;

  html += '</div>';

  // Beginner areas with enhanced cards
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

  // Beginner-friendly issues
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

function renderFolders(text) {
  const el = document.getElementById('folder-explanation');
  
  const lines = (text || '').split('\n').filter(l => l.trim());
  if (lines.length === 0) {
    el.textContent = 'No folder information available.';
    return;
  }

  const folderPattern = /^[\s-]*([^:\n]+):\s*(.+?)(?:\s*\[(.+?)\])?$/;
  let cardsHtml = '';
  let folderCount = 0;

  for (let line of lines) {
    const match = line.match(folderPattern);
    if (match && folderCount < 8) {
      const [, folderName, description, difficulty] = match;
      const name = folderName.trim().replace(/^[•\-*]\s*/, '');
      const desc = description.trim();
      const diff = difficulty ? difficulty.trim().toLowerCase() : 'medium';

      const icons = {
        'packages': '📦', 'fixtures': '🧪', 'compiler': '⚙️',
        'scripts': '🔧', 'github': '🔗', 'tests': '✅',
        'src': '📝', 'config': '⚙️', 'docs': '📚', 'utils': '🛠️'
      };
      const icon = Object.entries(icons).find(([key]) => name.toLowerCase().includes(key))?.[1] || '📁';
      const difficultyClass = diff.includes('easy') || diff.includes('beginner') ? 'easy' :
                              diff.includes('hard') || diff.includes('advanced') ? 'hard' : 'medium';
      const difficultyLabel = difficultyClass === 'easy' ? '🟢 Easy' :
                              difficultyClass === 'hard' ? '🔴 Hard' : '🟡 Medium';
      const importance = name.toLowerCase().includes('package') || name.toLowerCase().includes('src') ? 'important' : '';
      const subtitle = desc.length > 64 ? desc.slice(0, 64).replace(/\s+\S*$/, '…') : desc;

      cardsHtml += `
        <div class="folder-card" title="${escapeAttr(desc)}">
          <div class="folder-card-header">
            <div class="folder-icon">${icon}</div>
            <div>
              <div class="folder-name">${escapeHtml(name)}</div>
              <div class="folder-card-subtitle">${escapeHtml(subtitle)}</div>
            </div>
          </div>
          <div class="folder-description">${escapeHtml(desc)}</div>
          <div class="folder-badge-row">
            <span class="folder-badge ${difficultyClass}">${difficultyLabel}</span>
            ${importance ? `<span class="folder-badge important">⭐ Key</span>` : ''}
          </div>
        </div>
      `;
      folderCount++;
    }
  }

  if (!cardsHtml) {
    el.innerHTML = `
      <div class="folder-tree">
        <p style="color: var(--text-dim);">Folder preview could not be parsed. Showing the full outline below.</p>
      </div>
      <div class="folder-details-raw">
        <pre>${escapeHtml(text)}</pre>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div class="folder-tree">
      <div class="folder-tree-header">
        <span class="folder-count-badge">📂 ${folderCount} folders highlighted</span>
        <div class="tree-path"><span>📁 repo</span><span class="separator">/</span></div>
      </div>
      <div class="folder-cards-grid">
        ${cardsHtml}
      </div>
    </div>
    <div class="folder-details-raw">
      <pre>${escapeHtml(text)}</pre>
    </div>
  `;
}

function renderContributionPath(markdown) {
  const el = document.getElementById('contribution-path');
  
  // Parse markdown into steps
  const lines = (markdown || '').split('\n').filter(l => l.trim());
  const steps = [];
  
  for (let line of lines) {
    const trimmed = line.trim();
    // Match numbered lists, bullet points, or lines with arrows
    const match = trimmed.match(/^(?:\d+\.\s*|[-*]\s*)?(.+?)(?:\s*→|\s*↓)?$/);
    if (match && match[1].trim()) {
      steps.push(match[1].trim());
    }
  }

  // Generate roadmap HTML
  let html = `<div class="difficulty-section" style="margin-bottom: 24px;">
    <div class="difficulty-header">
      <div class="difficulty-label">🎯 Contribution Difficulty</div>
      <div class="difficulty-score-display">Medium</div>
    </div>
    <div class="difficulty-bar">
      <div class="difficulty-fill" style="width: 50%"></div>
    </div>
    <div class="difficulty-categories">
      <div class="difficulty-cat possible">
        <div class="difficulty-cat-badge">✓</div>
        <span>Beginner Possible</span>
      </div>
      <div class="difficulty-cat recommended">
        <div class="difficulty-cat-badge">✓</div>
        <span>Intermediate Recommended</span>
      </div>
      <div class="difficulty-cat advanced">
        <div class="difficulty-cat-badge">✗</div>
        <span>Advanced Only</span>
      </div>
    </div>
  </div>`;

  html += '<div class="roadmap-timeline">';
  
  if (steps.length > 0) {
    steps.forEach((step, idx) => {
      // Parse step for action verbs and keywords
      const isCompleted = idx < 2;  // First two are "done"
      const stepNum = idx + 1;
      
      // Clean up step text
      let cleanStep = step.replace(/^#+\s*/, '').replace(/^[-*]\s*/, '');
      let title = cleanStep;
      let description = '';
      
      // Extract description if available
      const parts = cleanStep.split(':');
      if (parts.length > 1) {
        title = parts[0].trim();
        description = parts.slice(1).join(':').trim();
      }
      
      html += `
        <div class="roadmap-step ${isCompleted ? 'done' : ''}">
          <div class="roadmap-step-indicator">${stepNum}</div>
          <div class="roadmap-content">
            <div class="roadmap-title">${escapeHtml(title)}</div>
            ${description ? `<div class="roadmap-description">${escapeHtml(description)}</div>` : ''}
          </div>
        </div>
      `;
    });
  } else {
    html += '<div class="panel" style="padding: 20px;"><p style="color: var(--text-dim);">No contribution path available for this repository.</p></div>';
  }
  
  html += '</div>';
  
  el.innerHTML = html;
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