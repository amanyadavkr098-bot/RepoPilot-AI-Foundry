# RepoPilot AI — Web UI

A polished FastAPI + vanilla JS frontend for RepoPilot AI, replacing the
original Streamlit interface. Reuses the existing analysis modules
(`github_fetcher.py`, `repo_analyzer.py`, `metrics_analyzer.py`,
`ai_explainer.py`) unchanged.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env
# add your GITHUB_TOKEN and OPENROUTER_API_KEY to .env
```

## Run

```bash
uvicorn main:app --reload
```

Then open **http://localhost:8000** in your browser.

## Project structure

```
RepoPilot-AI-Web/
├── main.py                # FastAPI app — /api/analyze endpoint + static frontend
├── github_fetcher.py       # GitHub REST API client
├── repo_analyzer.py         # Tech stack & contribution area detection
├── metrics_analyzer.py      # Repository health scoring
├── ai_explainer.py           # OpenRouter-powered AI summaries
├── templates/
│   └── index.html             # Main page
├── static/
│   ├── css/style.css            # Design system
│   └── js/app.js                  # Frontend logic (fetch + render)
├── requirements.txt
└── .env.example
```

## API

`GET /api/analyze?repo_url=<github-url-or-owner/repo>`

Returns a JSON payload with dashboard stats, AI summary, health metrics,
tech stack breakdown, beginner contribution guide, folder explanations,
contribution roadmap, and maintainer activity heatmap.
