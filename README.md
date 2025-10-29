# Project Samarth 🌾🤖

**An intelligent Q&A system for India's agricultural economy and climate patterns — powered by data.gov.in and Gemini AI.**

[![Vercel](https://img.shields.io/badge/Vercel-Live%20Demo-000000?style=for-the-badge&logo=vercel)](https://project-samarth.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-View%20Code-181717?style=for-the-badge&logo=github)](https://github.com/Kunal-artist/project_samarth)

---

## Live Prototype 
**Try it now:** 

Ask questions like:
> _"Compare rainfall in Maharashtra & Gujarat last 5 years + top 3 rice crops"_  
> _"District in Maharashtra with highest Rice production vs lowest in Gujarat?"_

---

## Vision
Government portals like **data.gov.in** host thousands of high-value datasets — but they are fragmented across ministries, formats, and structures. Policymakers and researchers struggle to derive **cross-domain insights**.

**Project Samarth** bridges this gap with a natural language chat interface that:
- Sources data **directly from data.gov.in**
- Answers **complex agri-climate queries**
- Cites **exact datasets** for every fact

---

## Data Sources (data.gov.in)
| Domain | Dataset | Resource ID |
|-------|--------|------------|
| **Agriculture** | District-wise Crop Production (1997–2023) | `35be999b-...` |
| **Climate** | Rainfall in India (IMD) | `...` |

> Fetched via **CKAN API**, normalized with Python (`data_fetcher.py`)

---

## System Architecture
<img width="443" height="387" alt="image" src="https://github.com/user-attachments/assets/172c5893-7440-4866-92b1-30cc3c431da8" />

---

## Key Features
- **Natural Language Q&A** over agri-climate data
- **Live Citations** from data.gov.in datasets
- **Policy Brief Generator** (`Draft Brief` button)
- **Follow-up Suggestions** via AI
- **Privacy-First**: No cloud storage, local runs
- **Scalable**: Modular data fetchers

---

### Tech Stack
- **Frontend**: React, Tailwind CSS, Lucide Icons
- **Backend**: Python, DuckDB, Pandas
- **AI**: Google Gemini 2.5 Flash lite + Search Grounding
- **Deployment**: Vercel (React), GitHub

---

### Folder Structure
my-bot-app/
├── src/
│   ├── App.js          ← Chat UI + Gemini logic
│   └── index.css       ← Tailwind + Prose styling
├── data_fetcher.py     ← CKAN API + CSV normalizer
├── crop_downloader.py  ← Auto-download crop data
├── .env                ← REACT_APP_API_KEY
└── tailwind.config.js


---

## Local Setup

### Clone repo
git clone https://github.com/Kunal-artist/project_samarth.git
cd project_samarth/my-bot-app

### Install
npm install

### Add your Gemini API key
echo "REACT_APP_API_KEY=your-key-here" > .env

### Run
npm start


## Submission (Build For Bharat 2026)

2-Min Loom Demo: [Watch Here] (Add after recording)
Live Prototype: https://project-samarth.vercel.app/
Code: This repo


## Future Scope

Add voice input
Export PDF policy briefs
Integrate more datasets (soil, irrigation, subsidies)
Deploy on-premise for government use



Built for India's farmers and policymakers.
Kunal | Build For Bharat 2026 Cohort Applicant

