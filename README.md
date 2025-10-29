# Project Samarth 🌾🤖

**An intelligent Q&A system for India's agricultural economy and climate patterns — powered by data.gov.in and Gemini AI.**

[![Vercel](https://img.shields.io/badge/Vercel-Live%20Demo-000000?style=for-the-badge&logo=vercel)](https://project-samarth.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-View%20Code-181717?style=for-the-badge&logo=github)](https://github.com/Kunal-artist/project_samarth)

---

## Live Prototype (Bonus Link)
**Try it now:** [https://project-samarth.vercel.app/](https://project-samarth.vercel.app/)

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
