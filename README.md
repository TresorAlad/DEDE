# ƉEƉE

Plateforme intelligente d'audit et d'amélioration de la cybersécurité.

Hackathon Cyber Innovation Challenge - Mission 4 : IA au service de la Cyberdéfense.

Cahier des charges : `/home/tresor/Documents/DEDE_Cahier_des_charges.docx`

## Stack

- Frontend : React + Vite + Tailwind CSS
- Backend : FastAPI + JWT + RQ/Redis
- Base de données : PostgreSQL (Neon)
- Scanners : Amass, Nuclei, sslyze, module en-têtes HTTP
- IA : Mistral AI (`mistral-small-latest`)

## Structure

```
dede/
├── frontend/     # Personne 1
├── backend/      # Personne 2
├── scanners/     # Personne 3
├── ai/           # Personne 4
└── docs/         # Architecture
```

## Périmètre MVP

- Création de compte
- Ajout d'une plateforme à auditer
- Vérification de propriété
- Audit automatisé (Amass, Nuclei, sslyze, en-têtes HTTP)
- Analyse IA (Mistral AI)
- Rapport Web
- Score de sécurité
- Recommandations personnalisées
- Chatbot conversationnel (function calling sur le rapport)

## Répartition des rôles (4 personnes)

| Personne | Zone | Responsabilités |
|----------|------|-----------------|
| P1 | `frontend/` | Login, dashboard, rapport, chatbot UI |
| P2 | `backend/` | API, auth JWT, Neon, Redis/RQ |
| P3 | `scanners/` | Wrappers Amass/Nuclei/sslyze/headers + scoring |
| P4 | `ai/` | Prompts, analyse rapport, chatbot agentic |

## Planning prévisionnel (2 jours)

### Jour 1 - matin

- P2 : squelette API + modèles Neon + Redis
- P3 : installer/tester Amass, Nuclei, sslyze + JSON unifié
- P1 : écrans Login / Signup / Dashboard
- P4 : accès Mistral + premiers prompts

### Jour 1 - après-midi

- P2 : endpoints auth / platforms / enqueue audit
- P3 : brancher `run_all` dans le worker RQ
- P1 : ajout de plateforme + vérification
- P4 : prompt recommandations sur vrais résultats

Synchronisation fin de journée : compte -> plateforme -> audit lancé -> résultats bruts en base.

### Jour 2 - matin

- P2 : endpoints rapport + appel LLM
- P3 : scoring + gestion d'erreurs
- P1 : écran rapport + historique
- P4 : chatbot function calling

### Jour 2 - après-midi

- Intégration bout en bout
- Déploiement (Vercel + VM/Railway)
- Répétition de la démo

## Démarrage local

### Prérequis

- Node.js 20+
- Python 3.12 (recommandé ; `python3.12 -m venv .venv`)
- Docker (pour Redis)
- Compte Neon (PostgreSQL) et clé Mistral AI
- Outils optionnels sur la machine de scan : `amass`, `nuclei`

### 1. Redis

```bash
docker compose up -d redis
```

### 2. Backend

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -r ../scanners/requirements.txt
pip install -r ../ai/requirements.txt
cp .env.example .env
# Éditer .env : DATABASE_URL, REDIS_URL, MISTRAL_API_KEY, JWT_SECRET
uvicorn app.main:app --reload --port 8000
```

Worker RQ (autre terminal) :

```bash
cd backend
source .venv/bin/activate
export PYTHONPATH=..:.
rq worker audits --url redis://127.0.0.1:6379/0
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Ouvrir http://127.0.0.1:5173

### 4. Scanners (test isolé)

```bash
cd /home/tresor/dede
python3 -c "from scanners.orchestrator import run_all; print(run_all('exemple.com', 'https://exemple.com'))"
```

### 5. IA (test isolé)

```bash
export MISTRAL_API_KEY=...
python3 -c "from ai.report_analyzer import analyze; print(analyze({'nuclei': [], 'headers': [], 'ssl': {'findings': []}, 'amass': []}))"
```

## Publier sur GitHub

Ce dépôt est initialisé localement. Pour le pousser :

```bash
gh repo create dede --private --source=. --remote=origin --push
```

ou :

```bash
git remote add origin git@github.com:<votre-compte>/dede.git
git push -u origin main
```

## Sécurité

- HTTPS en production
- JWT + séparation des comptes
- Vérification de propriété avant audit
- Audits non intrusifs uniquement
- Rapports accessibles uniquement au propriétaire
