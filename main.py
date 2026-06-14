"""
RepoPilot AI — FastAPI backend
Serves the analysis API and the static web frontend.
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from urllib.parse import urlparse

from github_fetcher import (
    get_readme,
    get_repo_contents,
    get_folder_structure,
    get_repo_issues,
    get_repo_activity,
    get_repo_languages,
    get_contributors,
    get_closed_issues,
)
from ai_explainer import (
    summarize_readme,
    explain_folders,
    contribution_path,
)
from repo_analyzer import (
    detect_tech_stack,
    language_contribution_score,
    beginner_contribution_areas,
    maintainer_activity_heatmap,
)
from metrics_analyzer import generate_metrics_summary
from foundry_agent import analyze_repo_with_foundry


app = FastAPI(title="RepoPilot AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def parse_repo_url(repo_url: str):
    """Extract owner/repo from a GitHub URL or 'owner/repo' string."""
    repo_url = repo_url.strip().strip("/")

    if repo_url.startswith("http"):
        parsed = urlparse(repo_url)
        parts = [p for p in parsed.path.split("/") if p]
    else:
        parts = [p for p in repo_url.split("/") if p]

    if len(parts) < 2:
        raise HTTPException(status_code=400, detail="Invalid GitHub repository URL.")

    owner, repo = parts[0], parts[1]
    return owner, repo


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/analyze")
def analyze(repo_url: str = Query(..., description="GitHub repository URL or owner/repo")):
    owner, repo = parse_repo_url(repo_url)

    # -------------------
    # Fetch GitHub Data
    # -------------------
    readme = get_readme(owner, repo)
    repo_contents = get_repo_contents(owner, repo)
    folders = get_folder_structure(owner, repo)
    issues = get_repo_issues(owner, repo)
    comments = get_repo_activity(owner, repo)
    languages_data = get_repo_languages(owner, repo)
    contributors = get_contributors(owner, repo)
    closed_issues = get_closed_issues(owner, repo)

    if readme == "README unavailable." and not repo_contents and not languages_data:
        raise HTTPException(
            status_code=404,
            detail=f"Could not fetch data for '{owner}/{repo}'. Check the repository URL "
                   "or GitHub API rate limits.",
        )

    # -------------------
    # Analysis
    # -------------------
    tech_stack = list(languages_data.keys())
    total_bytes = sum(languages_data.values())

    language_percentages = {}
    if total_bytes > 0:
        language_percentages = {
            lang: round((size / total_bytes) * 100, 2)
            for lang, size in languages_data.items()
        }
    else:
        tech_stack = detect_tech_stack(repo_contents)
        language_percentages = {tech: 1 for tech in tech_stack}

    language_scores = language_contribution_score(tech_stack)
    beginner_areas = beginner_contribution_areas(tech_stack)
    heatmap_data, top_hours = maintainer_activity_heatmap(comments)

    metrics = generate_metrics_summary(
        contributors, closed_issues, issues, comments, heatmap_data
    )

    # -------------------
    # Foundry IQ Analysis
    # -------------------
    foundry_result = analyze_repo_with_foundry(
        owner=owner,
        repo=repo,
        readme=readme,
        folders=folders,
        tech_stack=tech_stack,
    )

    summary = foundry_result["summary"]
    contribution_guide = foundry_result["contribution_guide"]
    reasoning_trace = foundry_result["reasoning_trace"]
    citations = foundry_result["citations"]
    foundry_powered = foundry_result["foundry_powered"]

    # ── FIX: pull BOTH keys from foundry_result ──────────────────────────────
    # folder_tree  → structured JSON array for the interactive tree view
    # folder_explanation → plain-text fallback (shown if tree is unavailable)
    folder_tree = foundry_result.get("folder_tree", [])
    folder_explanation = foundry_result.get(
        "folder_explanation",
        "\n".join(f"• {folder}" for folder in folders)
    )

    # -------------------
    # Dashboard Metrics
    # -------------------
    if "Advanced" in summary:
        difficulty, score = "Advanced", 35
    elif "Beginner" in summary:
        difficulty, score = "Beginner", 90
    else:
        difficulty, score = "Intermediate", 65

    # -------------------
    # Beginner-friendly issues
    # -------------------
    beginner_keywords = [
        "good first issue", "good-first-issue", "bug",
        "documentation", "docs", "help wanted", "starter", "easy",
    ]

    beginner_issues = []
    for issue in issues:
        labels = [label["name"].lower() for label in issue.get("labels", [])]
        if any(keyword in label for keyword in beginner_keywords for label in labels):
            beginner_issues.append({
                "title": issue.get("title", ""),
                "url": issue.get("html_url", ""),
            })
        if len(beginner_issues) >= 3:
            break

    fallback_issues = []
    if not beginner_issues:
        for issue in issues[:3]:
            fallback_issues.append({
                "title": issue.get("title", ""),
                "url": issue.get("html_url", ""),
            })

    return {
        "owner": owner,
        "repo": repo,
        "dashboard": {
            "difficulty": difficulty,
            "score": score,
            "technologies": len(tech_stack),
            "folders": len(folders),
        },
        "summary": summary,
        "health_metrics": metrics,
        "tech_stack": {
            "languages": language_percentages,
            "beginner_scores": {
                lang: language_scores.get(lang, 50)
                for lang in language_percentages
            },
        },
        "beginner_guide": {
            "areas": beginner_areas,
            "beginner_issues": beginner_issues,
            "fallback_issues": fallback_issues,
        },
        # ── FIX: both keys now included in the API response ──────────────────
        "folder_tree": folder_tree,           # ← NEW: structured tree for the frontend
        "folder_explanation": folder_explanation,  # ← KEPT: plain-text fallback
        "contribution_guide": contribution_guide,
        "activity_heatmap": {
            "data": heatmap_data,
            "top_hours": [{"hour": f"{h}:00", "count": c} for h, c in top_hours],
        },
        "contributors_count": len(contributors) if contributors else None,
        "open_issues_count": len(issues),
        "reasoning_trace": reasoning_trace,
        "citations": citations,
        "foundry_powered": foundry_powered,
    }


# -------------------
# Static frontend
# -------------------
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def index():
    return FileResponse("templates/index.html")