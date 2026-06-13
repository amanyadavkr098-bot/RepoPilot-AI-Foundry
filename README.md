
# RepoPilot AI 🚀  
### AI-Powered Open Source Intelligence for Contributors

RepoPilot AI helps developers understand unfamiliar GitHub repositories and discover the best way to contribute.

Built for the **Microsoft AI Skills Fest Hackathon**, RepoPilot AI uses **Azure AI Foundry IQ** to analyze repositories, explain project structure, evaluate contribution difficulty, and guide beginners toward meaningful first contributions.

Instead of overwhelming contributors with thousands of files, issues, and unfamiliar code, RepoPilot AI transforms repositories into **actionable contributor intelligence**.

---

## 🌍 Problem Statement

Open source is difficult to enter.

New contributors often struggle with:

- Understanding large repositories
- Figuring out what the project actually does
- Knowing where to start contributing
- Finding beginner-friendly tasks
- Understanding folder structures
- Evaluating repository health
- Predicting maintainer responsiveness

This causes many developers to abandon open-source contributions before making their first pull request.

### Our Solution

RepoPilot AI acts like an **AI-powered open-source mentor**.

Simply enter a GitHub repository URL and RepoPilot AI will:

✅ Explain the repository in beginner-friendly language  
✅ Detect technologies automatically  
✅ Recommend where to start contributing  
✅ Analyze repository health  
✅ Suggest first contribution areas  
✅ Explain folder structure  
✅ Provide contribution roadmaps  

---

## ✨ Features

### 🔍 Repository Intelligence
- AI-generated repository summaries
- Beginner-friendly explanations
- Technology stack detection
- Repository purpose breakdown
- Folder structure explanations

### 🧠 Contribution Guidance
- Contribution roadmap generation
- Beginner difficulty scoring
- Best files/folders to start exploring
- Suggested first PR recommendations
- Contributor onboarding guidance

### 📊 Repository Health Analytics
- Repository health score
- Maintainer activity analysis
- Issue health scoring
- Bus factor risk estimation
- Community activity indicators

### ☁️ Azure AI Foundry Intelligence
RepoPilot AI uses **Microsoft Azure AI Foundry IQ** for grounded repository understanding.

Instead of hallucinating, the AI:

1. Builds a repository knowledge base  
2. Uploads repository context into a vector store  
3. Uses **Foundry File Search**  
4. Generates grounded explanations using retrieved repository context  

This produces **more reliable and explainable AI outputs**.

---

## 🏗 System Architecture

```text
GitHub Repository
        ↓
GitHub REST API
        ↓
Repository Intelligence Engine
(Tech Stack + Metrics + Repo Analysis)
        ↓
Azure AI Foundry IQ
(Vector Store + File Search)
        ↓
Grounded AI Insights
        ↓
FastAPI Backend
        ↓
Interactive Web Dashboard
```

---

## 🧠 How RepoPilot AI Works

### Step 1 — Repository Fetching
RepoPilot AI fetches:

- README content
- Repository structure
- Folder hierarchy
- Issues and contribution signals
- Maintainer activity data
- Repository metadata

### Step 2 — Repository Analysis
The system detects:

- Programming languages
- Frameworks
- Tech stack
- Contribution areas
- Project complexity

### Step 3 — Azure AI Foundry IQ
Repository context is uploaded into a **Foundry Vector Store**.

Using **Foundry File Search**, the model retrieves grounded repository information before generating explanations.

This prevents hallucinated repository summaries.

### Step 4 — Contributor Guidance
RepoPilot AI generates:

- Beginner-friendly summaries
- Contribution roadmaps
- Folder explanations
- Difficulty assessments
- Suggested onboarding path

---

## 🛠 Tech Stack

### Backend

- Python
- FastAPI
- Uvicorn

### AI & Cloud

- Microsoft Azure AI Foundry
- Azure AI Foundry IQ
- Azure Vector Store
- Foundry File Search
- GPT-4.1-mini

### Data Sources

- GitHub REST API
- GitHub Repository Metadata

### Frontend

- HTML
- CSS
- Vanilla JavaScript

### Authentication

- Azure CLI (`az login`)
- DefaultAzureCredential()

---

## 📸 Screenshots

### Home Dashboard
<img width="1918" height="975" alt="image" src="https://github.com/user-attachments/assets/14c460f9-fda2-44f9-9548-9bd1a52c56e3" />



### Repository Analysis Output
<img width="1918" height="972" alt="image" src="https://github.com/user-attachments/assets/c22958c2-1f9f-4da7-b77c-b79de6966863" />

### Repository Health and Tech Stack
<img width="1918" height="927" alt="image" src="https://github.com/user-attachments/assets/0709c10d-b0dc-481d-b573-16b4f7c805f3" />



### Contribution Roadmap
<img width="1918" height="735" alt="image" src="https://github.com/user-attachments/assets/0acae91c-75d4-4379-ab8b-b6c16a508f48" />

<img width="1918" height="587" alt="image" src="https://github.com/user-attachments/assets/61ab37b2-e4d2-49ec-93c4-bbd61e7eb674" />


### Maintainer Activity Visualization
<img width="1918" height="578" alt="image" src="https://github.com/user-attachments/assets/28ca9cc6-1884-4226-b99e-847aa03e9378" />



---

## 📂 Project Structure

```
RepoPilot-AI-Web/
│
├── main.py
│   ├── FastAPI application
│   └── API endpoints
│
├── github_fetcher.py
│   └── GitHub REST API client
│
├── repo_analyzer.py
│   ├── Tech stack detection
│   └── Contribution area analysis
│
├── metrics_analyzer.py
│   └── Repository health scoring
│
├── foundry_agent.py
│   ├── Azure AI Foundry integration
│   ├── Vector store creation
│   ├── File Search retrieval
│   └── Grounded AI reasoning
│
├── templates/
│   └── index.html
│
├── static/
│   ├── css/
│   │   └── style.css
│   │
│   └── js/
│       └── app.js
│
├── requirements.txt
├── .env.example
└── README.md
```

---

## ⚙️ Installation & Setup

### 1. Clone Repository

```
git clone https://github.com/your-username/RepoPilot-AI-Web.git
cd RepoPilot-AI-Web
```

### 2. Create Virtual Environment

```
python -m venv .venv
```
Activate environment:

**Command Prompt (CMD)**

```
.venv\Scripts\activate
```
**PowerShell**

```
.\.venv\Scripts\Activate.ps1
```

### 3. Install Dependencies

```
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Copy environment template:

**Windows**

```
copy .env.example .env
```
**Mac/Linux**

```
cp .env.example .env
```
Add the following:

```
GITHUB_TOKEN=your_github_token

FOUNDRY_PROJECT_ENDPOINT=https://your-project.services.ai.azure.com/api/projects/your-project

FOUNDRY_MODEL_DEPLOYMENT=gpt-4.1-mini
```

### 5. Install Azure CLI
Download Azure CLI:

[Azure CLI Download](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-windows?utm_source=chatgpt.com)

Verify installation:

```
az --version
```
Login:

```
az login
```

### 6. Run Application

```
uvicorn main:app --reload
```
Open browser:

```
http://localhost:8000
```

---

## 📡 API Documentation

### Analyze Repository

```
GET /api/analyze?repo_url=
```

### Example

```
GET /api/analyze?repo_url=microsoft/vscode
```

### Returns

```
{
  "summary": "AI-generated repository summary",
  "health_score": 87,
  "tech_stack": ["TypeScript", "Electron"],
  "folder_explanation": {},
  "contribution_guide": {},
  "maintainer_activity": {},
  "issue_health": {}
}
```

---

## 💡 Example Use Cases

### Beginner Contributors
Understand unfamiliar repositories faster.

### Open Source Programs
Useful for:

- GSoC
- Hacktoberfest
- First contributions
- Community onboarding

### Maintainers
Help onboard contributors more efficiently.

### Students
Learn repository structure and technologies.

---

## 🧪 Example Workflow

1. Paste GitHub repository URL
2. RepoPilot fetches repository data
3. Azure AI Foundry analyzes repository context
4. AI generates grounded explanations
5. User receives contribution roadmap

---

## 🎥 Demo Video
*Add demo video link here*

---

## 🔮 Future Improvements

- AI contributor match score
- Personalized issue recommendations
- PR success prediction
- Contributor skill-based onboarding
- Multi-repository comparison
- GitHub Copilot integration
- Repo learning paths

---

## 🏆 Microsoft AI Skills Fest Alignment
RepoPilot AI leverages **Microsoft Azure AI Foundry** to make open-source contribution more accessible and beginner-friendly.

By combining:

- GitHub Repository Intelligence
- Azure AI Foundry IQ
- Grounded Retrieval
- Contributor Guidance

RepoPilot AI transforms confusing repositories into actionable contributor intelligence.

---

## 👨‍💻 Team

### Aman 
Built for the **Microsoft AI Skills Fest Hackathon 2026**

---

## 📜 License
MIT License

```

``` 
