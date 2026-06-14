"""
foundry_agent.py — RepoPilot AI × Microsoft Foundry IQ
"""

import os
import re
import json
import time
import tempfile
from dotenv import load_dotenv

load_dotenv()

PROJECT_ENDPOINT = os.getenv(
    "FOUNDRY_PROJECT_ENDPOINT",
    "https://repopilot-agent-resource.services.ai.azure.com/api/projects/RepoPilot-agent"
)
MODEL_DEPLOYMENT = os.getenv("FOUNDRY_MODEL_DEPLOYMENT", "gpt-4.1-mini")

_project_client = None
_openai_client = None


def _get_clients():
    global _project_client, _openai_client
    if _openai_client is not None:
        return _project_client, _openai_client
    try:
        from azure.ai.projects import AIProjectClient
        from azure.identity import DefaultAzureCredential
        credential = DefaultAzureCredential()
        _project_client = AIProjectClient(
            endpoint=PROJECT_ENDPOINT,
            credential=credential,
            allow_preview=True,
        )
        _openai_client = _project_client.get_openai_client()
        return _project_client, _openai_client
    except Exception as e:
        print(f"[Foundry] Client init failed: {e}")
        return None, None


def _write_temp_file(name: str, content: str) -> str:
    tmp = tempfile.NamedTemporaryFile(
        mode="w", suffix=".txt",
        prefix=name.replace("/", "_") + "_",
        delete=False, encoding="utf-8"
    )
    tmp.write(content)
    tmp.close()
    return tmp.name


def _build_repo_document(owner, repo, readme, folders, tech_stack):
    folder_str = "\n".join(f"- {f}" for f in folders) if folders else "- (no folders detected)"
    tech_str = ", ".join(tech_stack) if tech_stack else "(none detected)"
    readme_trimmed = readme[:6000] if readme else "No README available."
    return f"""# Repository: {owner}/{repo}

## Tech Stack
{tech_str}

## Folder Structure
{folder_str}

## README
{readme_trimmed}
"""


def _poll_vector_store(openai_client, vs_id, max_wait=30):
    for _ in range(max_wait):
        vs = openai_client.vector_stores.retrieve(vs_id)
        if vs.status != "in_progress":
            return vs
        time.sleep(1)
    return None


def _call_with_file_search(openai_client, vector_store_id, system_prompt, user_prompt):
    response = openai_client.responses.create(
        model=MODEL_DEPLOYMENT,
        tools=[{"type": "file_search", "vector_store_ids": [vector_store_id]}],
        instructions=system_prompt,
        input=user_prompt,
        max_output_tokens=1000,
    )
    text = ""
    citations = []
    for output in response.output:
        if hasattr(output, "content"):
            for block in output.content:
                if hasattr(block, "text"):
                    text += block.text
                    if hasattr(block, "annotations"):
                        for ann in block.annotations:
                            if hasattr(ann, "filename"):
                                citations.append(ann.filename)
                            elif hasattr(ann, "file_citation"):
                                citations.append(str(ann.file_citation))
    return text.strip(), list(set(citations))


def _parse_folder_json(raw: str, folders: list) -> list[dict]:
    """
    Parse AI JSON response into folder list with tier classification.

    Expected shape per node:
    {
      "name": "src",
      "description": "Main source files",
      "type": "folder",
      "tier": "beginner",   <-- "beginner" | "explore" | "avoid"
      "tip": "Start here to understand the core logic."
    }
    """
    cleaned = re.sub(r"```(?:json)?|```", "", raw).strip()
    match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    if match:
        try:
            nodes = json.loads(match.group())
            tree = []
            valid_tiers = {"beginner", "explore", "avoid"}
            for node in nodes:
                if not isinstance(node, dict):
                    continue
                tier = node.get("tier", "explore")
                if tier not in valid_tiers:
                    tier = "explore"
                tree.append({
                    "name":        str(node.get("name", "unknown")),
                    "description": str(node.get("description", "")),
                    "type":        str(node.get("type", "folder")),
                    "tier":        tier,
                    "tip":         str(node.get("tip", "")),
                    "children":    node.get("children", []),
                })
            if tree:
                return tree
        except json.JSONDecodeError:
            pass

    print("[Foundry] folder JSON parse failed — building fallback tree")
    return [
        {"name": f, "description": "", "type": "folder",
         "tier": "explore", "tip": "", "children": []}
        for f in folders
    ]


def _derive_summary_stats(folder_tree: list) -> dict:
    """Compute the top-bar summary stats from the classified folder list."""
    beginners = [n["name"] for n in folder_tree if n.get("tier") == "beginner"]
    avoids    = [n["name"] for n in folder_tree if n.get("tier") == "avoid"]
    return {
        "total":       len(folder_tree),
        "best_start":  ", ".join(beginners[:3]) if beginners else "—",
        "avoid":       ", ".join(avoids[:2])    if avoids    else "—",
    }


def analyze_repo_with_foundry(owner, repo, readme, folders, tech_stack):
    trace = []

    _, openai_client = _get_clients()
    if openai_client is None:
        return _fallback(owner, repo, readme, folders, tech_stack,
                         "Foundry client unavailable (check az login / credentials).")

    # Step 1
    trace.append({"step": 1, "title": "Indexing repository files",
                  "detail": f"Packaging README + {len(folders)} folders + tech stack into Foundry IQ knowledge source"})
    doc_content = _build_repo_document(owner, repo, readme, folders, tech_stack)
    tmp_path = _write_temp_file(f"{owner}_{repo}", doc_content)

    # Step 2
    trace.append({"step": 2, "title": "Uploading to Foundry IQ vector store",
                  "detail": "Creating per-repo vector store and uploading repository document"})
    vector_store_id = None
    try:
        vs = openai_client.vector_stores.create(
            name=f"repopilot_{owner}_{repo}_{int(time.time())}"
        )
        vector_store_id = vs.id
        with open(tmp_path, "rb") as f:
            openai_client.vector_stores.files.upload_and_poll(
                vector_store_id=vector_store_id, file=f)
        _poll_vector_store(openai_client, vector_store_id, max_wait=20)
    except Exception as e:
        return _fallback(owner, repo, readme, folders, tech_stack,
                         f"Vector store upload failed: {e}")
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass

    system_prompt = (
        "You are RepoPilot AI, an open-source repository intelligence assistant. "
        "Always ground your answers using the File Search tool. Be concise and beginner-friendly."
    )

    # Step 3 — Summary
    trace.append({"step": 3, "title": "Grounded repository summary",
                  "detail": "Foundry IQ retrieving README chunks to generate cited summary"})
    summary = ""
    summary_citations = []
    try:
        summary, summary_citations = _call_with_file_search(
            openai_client, vector_store_id, system_prompt,
            f"""Analyze the {owner}/{repo} repository and return:

## What This Repo Does
(2-3 sentences, beginner-friendly)

## Main Technologies
(bullet list)

## Beginner Level
(Beginner / Intermediate / Advanced — one line reason)

## Who Should Contribute
(one sentence)

## Contribution Advice
(3 bullet points, practical)

Keep it concise. Use the file search tool to ground your answer."""
        )
    except Exception as e:
        summary = f"## What This Repo Does\nAI summary unavailable: {e}"

    # Step 4 — Roadmap
    trace.append({"step": 4, "title": "Reasoning contribution roadmap",
                  "detail": f"Cross-referencing {len(folders)} dirs and tech stack"})
    roadmap = ""
    roadmap_citations = []
    try:
        roadmap, roadmap_citations = _call_with_file_search(
            openai_client, vector_store_id, system_prompt,
            f"""For {owner}/{repo}, give a practical first-contribution roadmap:
1. Difficulty level and why
2. Best files/folders to start exploring
3. What NOT to touch as a beginner
4. Suggested first PR idea
5. When maintainers are likely to respond
Use the file search tool. Max 150 words. Bullet points only."""
        )
    except Exception as e:
        roadmap = f"Roadmap unavailable: {e}"

    # Step 5 — Folder tree with tier classification
    trace.append({"step": 5, "title": "Classifying folder structure",
                  "detail": f"Tagging {len(folders)} directories with beginner/explore/avoid tiers"})
    folder_tree: list[dict] = []
    folder_citations: list[str] = []
    folder_explanation: str = ""

    try:
        raw_folder_response, folder_citations = _call_with_file_search(
            openai_client, vector_store_id, system_prompt,
            f"""For the {owner}/{repo} repository, return ONLY a valid JSON array.
No prose, no markdown fences — raw JSON only.

Each element must follow this EXACT shape:
{{
  "name": "<folder or file name>",
  "description": "<one sentence: what it contains and why a contributor cares>",
  "type": "folder",
  "tier": "<beginner | explore | avoid>",
  "tip": "<one short actionable tip for a first-time contributor>"
}}

Tier rules:
- "beginner"  → safe, well-documented, good entry points (docs, tests, utils, scripts)
- "explore"   → useful to know but not required immediately (config, tooling, type defs)
- "avoid"     → complex internals, compilers, generated code — skip initially

Folders to classify: {json.dumps(folders[:12])}

Use the file search tool to ground descriptions. Return the JSON array only."""
        )
        folder_tree = _parse_folder_json(raw_folder_response, folders)
        folder_explanation = "\n".join(
            f"• {n['name']} [{n['tier']}] → {n['description']}" for n in folder_tree
        )
    except Exception as e:
        print(f"[Foundry] Folder step failed: {e}")
        folder_tree = [
            {"name": f, "description": "", "type": "folder",
             "tier": "explore", "tip": "", "children": []}
            for f in folders
        ]
        folder_explanation = "\n".join(f"• {f}" for f in folders)

    # Step 6 — Cleanup
    summary_stats = _derive_summary_stats(folder_tree)
    trace.append({"step": 6, "title": "Synthesis complete",
                  "detail": (
                      f"Generated grounded summary + roadmap + {len(folder_tree)} classified folders "
                      f"({summary_stats['total']} total, best: {summary_stats['best_start']})"
                  )})
    try:
        openai_client.vector_stores.delete(vector_store_id)
    except Exception:
        pass

    all_citations = list(set(summary_citations + roadmap_citations + folder_citations))

    return {
        "success":            True,
        "summary":            summary or _fallback_summary(owner, repo, folders, tech_stack),
        "contribution_guide": roadmap or "See beginner guide section above.",
        "folder_tree":        folder_tree,
        "folder_summary":     summary_stats,
        "folder_explanation": folder_explanation or "\n".join(f"• {f}" for f in folders),
        "citations":          all_citations,
        "reasoning_trace":    trace,
        "foundry_powered":    True,
    }


def _fallback_summary(owner, repo, folders, tech_stack):
    tech = ", ".join(tech_stack) if tech_stack else "unknown"
    return (
        f"## What This Repo Does\n"
        f"**{owner}/{repo}** — {len(folders)} key folders detected, tech stack: {tech}.\n\n"
        f"## Contribution Advice\n"
        f"- Read the README and CONTRIBUTING.md first\n"
        f"- Look for issues labelled 'good first issue'\n"
        f"- Start with docs or small bug fixes\n"
    )


def _fallback(owner, repo, readme, folders, tech_stack, reason):
    print(f"[Foundry] Falling back: {reason}")
    fallback_tree = [
        {"name": f, "description": "", "type": "folder",
         "tier": "explore", "tip": "", "children": []}
        for f in folders
    ]
    return {
        "success":            False,
        "summary":            _fallback_summary(owner, repo, folders, tech_stack),
        "contribution_guide": "Foundry IQ unavailable — see beginner guide section.",
        "folder_tree":        fallback_tree,
        "folder_summary":     {"total": len(folders), "best_start": "—", "avoid": "—"},
        "folder_explanation": "\n".join(f"• {f}" for f in folders),
        "citations":          [],
        "reasoning_trace":    [{"step": 1, "title": "Foundry IQ unavailable", "detail": reason}],
        "foundry_powered":    False,
        "error":              reason,
    }