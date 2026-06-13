from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()

MODEL = "google/gemma-3-4b-it:free"

_api_key = os.getenv("OPENROUTER_API_KEY")
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=_api_key or "missing-key"
)


def safe_ai_call(prompt):
    """Safe AI wrapper so app never crashes"""
    if not _api_key:
        return "AI analysis unavailable (no OPENROUTER_API_KEY configured)."
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        if response and response.choices:
            message = response.choices[0].message
            if message and message.content:
                return message.content

        return "AI response unavailable."

    except Exception:
        return "AI analysis temporarily unavailable."


def summarize_readme(readme_text):
    """Generate beginner-friendly repository summary"""
    if not readme_text:
        return "README unavailable."

    prompt = f"""
You are RepoPilot AI.
Explain this GitHub repository for beginners.

Return in EXACT format.

## What This Repo Does
(short explanation)

## Main Technologies
(bullets)

## Beginner Level
(Beginner / Intermediate / Advanced)

## Who Should Contribute
(short explanation)

## Contribution Advice
(beginner-friendly)

## Simple Explanation
(explain like a beginner)

Keep concise.

README:
{readme_text[:4000]}
"""
    return safe_ai_call(prompt)


def explain_folders(folder_list):
    """Explain repository folders"""
    prompt = f"""
Explain these repository folders for beginner contributors.
ONLY explain important folders.
Keep concise.

Format:
folder → purpose

Repository structure:
{folder_list}
"""
    return safe_ai_call(prompt)


def contribution_path(summary, tech_stack, folders):
    """Beginner contribution roadmap"""
    prompt = f"""
You are an open-source mentor.
Based on this repository, give practical beginner contribution guidance.

Return:
1. Difficulty level
2. Best place to start
3. Files/folders beginners should explore
4. What to avoid
5. Small first contribution ideas

Rules:
- Keep under 150 words
- Use bullet points
- Be concise
- Practical advice only

Repository summary:
{summary}

Tech stack:
{tech_stack}

Folders:
{folders}
"""
    return safe_ai_call(prompt)
