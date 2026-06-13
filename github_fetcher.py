import os
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "https://api.github.com/repos"

HEADERS = {
    "Accept": "application/vnd.github+json"
}

token = os.getenv("GITHUB_TOKEN")
if token:
    HEADERS["Authorization"] = f"Bearer {token}"


def github_get(url, params=None):
    """Safe GitHub API request"""
    try:
        response = requests.get(
            url,
            headers=HEADERS,
            params=params,
            timeout=10
        )

        if response.status_code == 403:
            print("GitHub API rate limit exceeded.")
            return None

        if response.status_code != 200:
            print(f"GitHub API Error: {response.status_code}")
            return None

        return response

    except requests.RequestException as e:
        print("Request failed:", e)
        return None


def get_readme(owner, repo):
    """Fetch README"""
    url = f"{BASE_URL}/{owner}/{repo}/readme"
    headers = {
        **HEADERS,
        "Accept": "application/vnd.github.v3.raw"
    }
    try:
        response = requests.get(
            url,
            headers=headers,
            timeout=10
        )
        return (
            response.text
            if response.status_code == 200
            else "README not found."
        )
    except requests.RequestException:
        return "README unavailable."


def get_repo_contents(owner, repo):
    """Get repository contents"""
    url = f"{BASE_URL}/{owner}/{repo}/contents"
    response = github_get(url)
    return response.json() if response else []


def get_folder_structure(owner, repo):
    """Get useful folders for analysis"""
    important_files = {
        "readme.md",
        "contributing.md",
        "requirements.txt",
        "package.json",
        "dockerfile",
        "license"
    }

    contents = get_repo_contents(owner, repo)

    return [
        item["name"]
        for item in contents
        if item["type"] == "dir"
        or item["name"].lower() in important_files
    ]


def get_repo_issues(owner, repo):
    """Get open issues only"""
    url = f"{BASE_URL}/{owner}/{repo}/issues"
    response = github_get(
        url,
        {
            "state": "open",
            "per_page": 100
        }
    )

    if not response:
        return []

    return [
        issue
        for issue in response.json()
        if "pull_request" not in issue
    ]


def get_closed_issues(owner, repo):
    """Get closed issues only"""
    url = f"{BASE_URL}/{owner}/{repo}/issues"
    response = github_get(
        url,
        {
            "state": "closed",
            "per_page": 100
        }
    )

    if not response:
        return []

    return [
        issue
        for issue in response.json()
        if "pull_request" not in issue
    ]


def get_repo_activity(owner, repo):
    """Fetch issue comment activity"""
    url = (
        f"{BASE_URL}/"
        f"{owner}/{repo}/issues/comments"
    )
    response = github_get(
        url,
        {"per_page": 100}
    )
    return response.json() if response else []


def get_repo_languages(owner, repo):
    """Fetch repository language percentages"""
    url = (
        f"{BASE_URL}/"
        f"{owner}/{repo}/languages"
    )
    response = github_get(url)
    return response.json() if response else {}


def get_contributors(owner, repo):
    """Fetch contributors"""
    url = (
        f"{BASE_URL}/"
        f"{owner}/{repo}/contributors"
    )
    response = github_get(
        url,
        {"per_page": 100}
    )
    return response.json() if response else []
