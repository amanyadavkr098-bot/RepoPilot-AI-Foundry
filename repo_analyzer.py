from collections import Counter
from datetime import datetime


def detect_tech_stack(repo_contents):
    """Detect technologies from repository files"""
    technologies = []
    file_names = [item["name"].lower() for item in repo_contents]

    if "package.json" in file_names:
        technologies.extend(["JavaScript", "Node.js"])
    if "tsconfig.json" in file_names:
        technologies.append("TypeScript")
    if "requirements.txt" in file_names:
        technologies.append("Python")
    if "pom.xml" in file_names:
        technologies.append("Java")
    if "cargo.toml" in file_names:
        technologies.append("Rust")
    if "go.mod" in file_names:
        technologies.append("Go")
    if "dockerfile" in file_names:
        technologies.append("Docker")
    if ".github" in file_names:
        technologies.append("GitHub Actions")

    return list(set(technologies))


def language_contribution_score(tech_stack):
    """Beginner friendliness score"""
    beginner_scores = {
        "HTML": 95,
        "CSS": 90,
        "Markdown": 95,
        "Python": 85,
        "JavaScript": 75,
        "Node.js": 70,
        "TypeScript": 60,
        "Java": 55,
        "C#": 50,
        "Go": 45,
        "Rust": 20,
        "C++": 25,
        "Assembly": 10,
        "Docker": 40,
        "GitHub Actions": 60
    }

    language_scores = {}
    for tech in tech_stack:
        language_scores[tech] = beginner_scores.get(tech, 50)

    return language_scores


def beginner_contribution_areas(tech_stack):
    """Suggest beginner contribution areas"""
    contribution_map = {
        "JavaScript": {
            "files": ["components/", "ui/", "docs/", "examples/"],
            "focus": "UI fixes, frontend bugs, documentation"
        },
        "Python": {
            "files": ["scripts/", "utils/", "tests/"],
            "focus": "automation, bug fixes"
        },
        "TypeScript": {
            "files": ["types/", "components/"],
            "focus": "typing fixes, small bugs"
        },
        "Node.js": {
            "files": ["api/", "server/", "routes/"],
            "focus": "backend fixes"
        },
        "GitHub Actions": {
            "files": [".github/workflows/"],
            "focus": "CI/CD fixes"
        }
    }

    recommendations = []
    for tech in tech_stack:
        if tech in contribution_map:
            recommendations.append({
                "language": tech,
                **contribution_map[tech]
            })

    return recommendations


def maintainer_activity_heatmap(comments):
    """Analyze maintainer activity timing"""
    hours = []

    for comment in comments:
        created = comment.get("created_at")
        if created:
            dt = datetime.strptime(created, "%Y-%m-%dT%H:%M:%SZ")
            hours.append(dt.hour)

    hour_counts = Counter(hours)

    heatmap = [
        {"hour": f"{hour}:00", "activity": hour_counts.get(hour, 0)}
        for hour in range(24)
    ]

    top_hours = sorted(
        hour_counts.items(),
        key=lambda x: x[1],
        reverse=True
    )[:3]

    return heatmap, top_hours
