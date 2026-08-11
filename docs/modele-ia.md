# Livrable - Modèles d'intelligence artificielle utilisés par ƉEƉE

**Projet :** ƉEƉE (Diagnostic et Évaluation de la Défense Exposée)  
**Objet :** Description des modèles d'IA intégrés à la plateforme  
**Périmètre :** Analyse de rapports, chatbot, audits multi-agents  
**Date :** août 2026

---

## 1. Synthèse

ƉEƉE s'appuie sur **deux moteurs LLM distincts**, selon le volet fonctionnel :

| Volet | Fournisseur | Modèle | Rôle principal |
|-------|-------------|--------|----------------|
| Analyse de rapport & chatbot | **Mistral AI** | `mistral-small-latest` | Synthèse FR, recommandations, dialogue sur le rapport |
| Audit par agents IA | **Anthropic (Claude)** via LiteLLM | `anthropic/claude-sonnet-4-5` | Orchestration multi-agents, exploration et détection |

Les scanners classiques (Amass, Nuclei, sslyze, en-têtes HTTP) restent **déterministes** : ils ne font pas appel à un LLM pour produire les findings bruts.

---

## 2. Modèle Mistral AI - `mistral-small-latest`

### 2.1 Identification

| Attribut | Valeur |
|----------|--------|
| Fournisseur | Mistral AI (France / UE) |
| Identifiant API | `mistral-small-latest` |
| SDK | `mistralai` (Python) |
| Point d'accès | API Mistral Chat Completions |
| Authentification | Clé `MISTRAL_API_KEY` |
| Emplacement code | `application/ai/mistral_client.py` |

### 2.2 Usages dans ƉEƉE

1. **Analyse post-scan (moteur scanners)**  
   Transformation des résultats bruts (Nuclei, SSL, en-têtes, surface DNS) en :
   - résumé (`summary`)
   - explications
   - findings structurés
   - recommandations détaillées
   - plan de correction pas à pas  
   Prompt système : `application/ai/prompts/explain_findings.md`.

2. **Transcription des audits Agent IA**  
   Après un run dede-agent, le rapport markdown (souvent en anglais) et les vulnérabilités exportées (ZIP ou fichiers legacy) sont envoyés à Mistral pour produire le **rapport client en français**, au même format que le scanner.  
   Prompt système : `application/ai/prompts/explain_agent_report.md`.

3. **Chatbot de rapport**  
   Assistant conversationnel avec *function calling* (score, vulnérabilités, recommandation par index).  
   Module : `application/ai/chatbot.py`.

4. **Régénération d'analyse**  
   Endpoint `POST /reports/{id}/reanalyze` : relance Mistral sur les données déjà stockées, sans nouveau scan.

### 2.3 Paramètres d'inférence

| Paramètre | Analyse de rapport | Chatbot |
|-----------|--------------------|---------|
| Modèle | `mistral-small-latest` | `mistral-small-latest` |
| Température | `0.2` | `0.15` |
| `max_tokens` | `4000` | `280` |
| Format de sortie | JSON forcé (`response_format: json_object`) | Texte court en français |

Choix de conception :
- **Température basse** pour limiter les hallucinations et rester factuel par rapport aux findings fournis.
- **JSON structuré** pour alimenter directement l'UI (score, listes, plan de correction).
- **Réponses chatbot courtes** pour maîtriser le coût tokens et la lisibilité.

### 2.4 Contraintes métier imposées au modèle

Les prompts exigent notamment :
- réponse **uniquement en français** ;
- ne pas inventer de failles absentes des données ;
- ne pas proposer d'exploitation offensive ;
- ne pas citer les noms des outils internes (scanners / agents) dans le texte client.

### 2.5 Mode dégradé

Si `MISTRAL_API_KEY` est absente :
- les résultats bruts des scanners restent disponibles ;
- l'analyse textuelle bascule sur un message d'indisponibilité (scanners) ou un mapping déterministe (agents) ;
- le chatbot signale que l'IA n'est pas configurée.

---

## 3. Modèle Claude - `anthropic/claude-sonnet-4-5`

### 3.1 Identification

| Attribut | Valeur |
|----------|--------|
| Fournisseur | Anthropic |
| Famille | Claude (Sonnet 4.5) |
| Identifiant configuré | `anthropic/claude-sonnet-4-5` |
| Variable d'environnement | `DEDE_LLM` |
| Passerelle | LiteLLM + SDK OpenAI Agents |
| Base API | `LLM_API_BASE=https://api.anthropic.com` |
| Authentification | `LLM_API_KEY` (clé API Anthropic) |
| Service | Instance **dede-agent** (hors stack core), exposée via `agent-service` (`DEDE_AGENT_URL`) |

### 3.2 Usages dans ƉEƉE

Ce modèle alimente le moteur **Agent IA** (option d'audit distincte du scanner classique) :

- orchestration d'une **équipe d'agents** spécialisés ;
- exploration guidée de la cible (dans le cadre autorisé) ;
- production d'artefacts : vulnérabilités, rapport markdown, éventuel export ZIP, transcript du graphe d'agents.

Le core ƉEƉE ne dialogue pas directement avec Claude : il appelle le microservice `agent-service`, qui supervise le CLI dede-agent.

### 3.3 Chaîne post-audit (lien avec Mistral)

```
Claude (agents)  →  artefacts (MD EN + vulns / ZIP)
                              ↓
                     Mistral (transcription FR)
                              ↓
                     Rapport client ƉEƉE (UI / PDF)
```

Ainsi, Claude produit l'analyse technique multi-agents ; Mistral assure la **mise en forme francophone** pour le client final.

### 3.4 Configuration de référence

Extrait de configuration documentée (instance dede-agent) :

```bash
DEDE_LLM=anthropic/claude-sonnet-4-5
LLM_API_KEY=<clé API Anthropic>
LLM_API_BASE=https://api.anthropic.com
```

---

## 4. Ce qui n'utilise pas de modèle génératif

| Composant | Nature |
|-----------|--------|
| Amass / découverte de surface | Outil déterministe |
| Nuclei | Templates de détection |
| sslyze / analyse TLS | Analyse cryptographique |
| En-têtes HTTP | Règles de configuration |
| Scoring scanners | Algorithme de pénalités |
| Génération PSSI Markdown | Gabarit déterministe à partir des findings |

---

## 5. Justification du choix des modèles

### Mistral `mistral-small-latest`
- Fournisseur européen, aligné avec une démarche de souveraineté / conformité pour un produit cybersécurité francophone.
- Bon compromis **qualité / coût / latence** pour la rédaction structurée (JSON) et le chatbot.
- API stable via le SDK officiel `mistralai`.

### Claude Sonnet 4.5
- Orienté **agentique** (via OpenAI Agents + LiteLLM) : adapté aux boucles multi-agents, outils et raisonnement d'audit.
- Solide en planification, suivi d'instructions et production de rapports techniques structurés.
- Configurable (`DEDE_LLM`) sans modifier le code core ƉEƉE.

---

## 6. Sécurité et gouvernance des appels LLM

- Les clés API ne sont **jamais** exposées au frontend ; elles restent côté services (`engine`, instance dede-agent).
- Les prompts interdisent l'invention de vulnérabilités et l'aide à l'attaque.
- Les sorties destinées au client passent par une **rédaction / sanitisation** (masquage des noms d'outils) avant affichage API.
- En cas d'échec LLM, le système conserve les données brutes et bascule en mode dégradé plutôt que de bloquer totalement le livrable d'audit.

---

## 7. Références techniques dans le code

| Fichier | Rôle |
|---------|------|
| `application/ai/mistral_client.py` | Client Mistral, modèle par défaut |
| `application/ai/report_analyzer.py` | Analyse scanners / agents → JSON FR |
| `application/ai/chatbot.py` | Chatbot function calling |
| `application/ai/prompts/explain_findings.md` | Prompt scanners |
| `application/ai/prompts/explain_agent_report.md` | Prompt transcription agents |
| `.env.docker.dede-agent.example` | Configuration Claude pour dede-agent |
| `docker/Dockerfile.agent-service` | Runtime agents (LiteLLM / openai-agents) |

---

## 8. Conclusion

Pour les livrables ƉEƉE, les modèles d'IA à citer sont :

1. **Mistral AI - `mistral-small-latest`** : analyse, recommandations, plan de correction et chatbot (cœur produit francophone).  
2. **Anthropic Claude - `anthropic/claude-sonnet-4-5`** : moteur des audits multi-agents IA.

Cette architecture sépare clairement **détection / raisonnement agentique** (Claude) et **communication client en français** (Mistral).
