# Frontend ƉeƉeFIA

Interface React de la plateforme d'audit cybersécurité ƉeƉeFIA.

Ce document explique comment installer et lancer `frontend/` sur votre machine. L'API, les scanners et l'IA se trouvent dans `application/` (voir [`../application/README.md`](../application/README.md)).

## Sommaire

1. [Architecture](#1-architecture)
2. [Modules](#2-modules)
3. [Prérequis](#3-prérequis)
4. [Installation](#4-installation)
5. [Configuration](#5-configuration)
6. [Lancement](#6-lancement)
7. [Pages et routes](#7-pages-et-routes)
8. [Sécurité et conventions](#8-sécurité-et-conventions)
9. [Dépannage](#9-dépannage)

---

## 1. Architecture

### Arborescence

```
frontend/
├── scripts/
│   └── build-icon-font.mjs   # Génère la police d'icônes réduite
├── src/
│   ├── api/           # Client HTTP + session JWT
│   ├── assets/        # Police d'icônes générée
│   ├── components/    # Composants réutilisables
│   ├── hooks/         # Hooks React (profil utilisateur, etc.)
│   ├── pages/         # Écrans (accueil, auth, dashboard, rapports, chatbot)
│   ├── styles/        # Feuille @font-face générée
│   ├── App.jsx        # Routes
│   ├── main.jsx       # Point d'entrée (polices + styles globaux)
│   └── index.css      # Styles Tailwind
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── .env.example
├── .gitignore
└── README.md
```

### Stack

| Technologie | Rôle |
|-------------|------|
| React 18 | Interface utilisateur |
| Vite 5 | Serveur de développement et build |
| React Router 7 | Navigation SPA |
| Tailwind CSS 3 | Styles |
| Material Symbols | Icônes (police auto-hébergée) |
| Fontsource | Polices Inter et JetBrains Mono auto-hébergées |

### Polices et icônes

Aucune police n'est chargée depuis un CDN : l'interface reste identique hors
ligne et les icônes n'affichent jamais le nom de leur ligature au chargement.

La police Material Symbols complète pèse près de 4 Mo. Le dépôt n'embarque donc
qu'un sous-ensemble limité aux icônes réellement utilisées (environ 75 ko),
produit par `npm run icons`. **Relancez cette commande après avoir introduit une
nouvelle icône**, sinon celle-ci s'affichera en toutes lettres.

### Flux avec le backend

```
Navigateur
    │
    ▼
frontend/ (Vite :5173)
    │  VITE_API_URL  ou  proxy /api → :8000
    ▼
application/backend (FastAPI)
```

En développement local, deux options :

1. `VITE_API_URL=http://127.0.0.1:8000` (recommandé)
2. Laisser le proxy Vite (`/api` → `http://127.0.0.1:8000`) si `VITE_API_URL` est vide

---

## 2. Modules

### 2.1 API (`src/api/client.js`)

- Appels authentifiés vers le backend
- Stockage du jeton JWT (`localStorage`)
- Détection d'inactivité (15 min, alignée sur le backend)
- Déconnexion automatique si session expirée

### 2.2 Pages (`src/pages/`)

| Fichier | Écran |
|---------|--------|
| `Landing.jsx` | Page d'accueil publique (présentation, offre) |
| `Login.jsx` / `Signup.jsx` | Authentification |
| `Dashboard.jsx` | Vue d'ensemble |
| `Platforms.jsx` / `AddPlatform.jsx` | Plateformes à auditer |
| `Reports.jsx` / `Report.jsx` | Historique et détail d'audit |
| `Chatbot.jsx` | Assistant sur un rapport |
| `Profile.jsx` | Profil et mot de passe |
| `legal/CGU.jsx` / `Confidentialite.jsx` | Mentions légales |

### 2.3 Composants (`src/components/`)

Exemples : `Sidebar`, `AppShell`, `ScoreGauge`, `AuditProgress`, `ConfirmDialog`, `SessionGuard`, `StatusBadge`, etc.

---

## 3. Prérequis

| Composant | Exigence |
|-----------|----------|
| Node.js | 20+ recommandé |
| npm | Fourni avec Node.js |
| Backend ƉeƉeFIA | API joignable (souvent `http://127.0.0.1:8000`) |

Pour lancer un audit complet depuis l'UI, le backend, Redis et le worker doivent aussi tourner (voir `application/README.md`).

---

## 4. Installation

Depuis la racine du dépôt :

```bash
cd frontend
npm install
cp .env.example .env
```

Éditez `frontend/.env` (voir [Configuration](#5-configuration)).

---

## 5. Configuration

Fichier : `frontend/.env` (modèle : `.env.example`).

| Variable | Description | Exemple local |
|----------|-------------|---------------|
| `VITE_API_URL` | URL de l'API **sans** slash final | `http://127.0.0.1:8000` |

Le préfixe `VITE_` est obligatoire : Vite n'expose au navigateur que ces variables.

Après toute modification de `.env`, redémarrez `npm run dev`.

---

## 6. Lancement

### 6.1 Frontend seul

```bash
cd frontend
npm run dev
```

Interface : http://127.0.0.1:5173

### 6.2 Avec le backend (parcours complet)

1. Démarrer Redis, l'API et le worker (voir `application/README.md`)
2. Vérifier http://127.0.0.1:8000/health
3. Lancer le frontend :

```bash
cd frontend
npm run dev
```

### Scripts npm

| Commande | Rôle |
|----------|------|
| `npm run dev` | Serveur de développement (hot reload) |
| `npm run build` | Build de production dans `dist/` |
| `npm run preview` | Prévisualiser le build localement |
| `npm run icons` | Régénérer la police d'icônes (nécessite un accès réseau) |

---

## 7. Pages et routes

| Route | Accès | Description |
|-------|--------|-------------|
| `/` | Public | Page d'accueil |
| `/login` | Public | Connexion |
| `/signup` | Public | Inscription |
| `/cgu` | Public | Conditions d'utilisation |
| `/confidentialite` | Public | Politique de confidentialité |
| `/dashboard` | Privé | Tableau de bord |
| `/platforms` | Privé | Liste des plateformes |
| `/platforms/new` | Privé | Ajouter une plateforme |
| `/reports` | Privé | Historique des audits |
| `/reports/:auditId` | Privé | Rapport détaillé |
| `/reports/:auditId/chat` | Privé | Chatbot sur le rapport |
| `/profile` | Privé | Profil utilisateur |

Les routes privées exigent un jeton JWT valide et une session non expirée.

---

## 8. Sécurité et conventions

- Ne jamais committer `.env` (utiliser `.env.example`).
- Ne pas stocker de secrets dans le code source : seule `VITE_API_URL` est publique côté client.
- Les actions destructives (suppression, déconnexion, etc.) passent par `ConfirmDialog`.
- Respecter le design existant (Tailwind, composants partagés) plutôt que d'introduire un nouveau style isolé.
- Voir `frontend/.gitignore`.

---

## 9. Dépannage

| Symptôme | Cause probable | Action |
|----------|----------------|--------|
| Page blanche / erreur module | Dépendances manquantes | `npm install` puis relancer `npm run dev` |
| `Network Error` / API injoignable | Backend arrêté ou mauvaise URL | Vérifier `/health` et `VITE_API_URL` |
| CORS bloqué | Origine front absente côté API | Ajouter `http://127.0.0.1:5173` dans `CORS_ORIGINS` du backend |
| Redirection vers `/login?reason=idle` | Inactivité > 15 min | Se reconnecter |
| `.env` ignoré | Serveur Vite déjà lancé | Redémarrer `npm run dev` |
| Styles absents | Tailwind / PostCSS | Vérifier `tailwind.config.js` et relancer |
| Une icône s'affiche en toutes lettres | Glyphe absent du sous-ensemble | `npm run icons` puis relancer le build |

---

## Documents liés

| Ressource | Chemin |
|-----------|--------|
| README du dépôt | [`../README.md`](../README.md) |
| Backend / scanners / IA | [`../application/README.md`](../application/README.md) |
| Exemple d'environnement | [`.env.example`](.env.example) |
