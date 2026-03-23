# GitHub API — Capacités & Stratégie de Tracking

**Date :** 2026-03-23

---

## Ce qu'on peut obtenir sans token

Rate limit : **60 req/heure par IP** (Convex a une IP partagée — à surveiller en prod).

Tous les repos **publics** sont accessibles.

### Endpoints utiles

| Endpoint | Données clés | Usage tracking |
|----------|-------------|----------------|
| `GET /repos/{owner}/{repo}` | stars, forks, open_issues_count, pushed_at, description, language, topics, created_at, license | ✅ Snapshot quotidien |
| `GET /repos/{owner}/{repo}/commits?per_page=10` | messages, dates, auteurs | ✅ Activité récente |
| `GET /repos/{owner}/{repo}/releases/latest` | tag, date, changelog | ✅ Versioning |
| `GET /repos/{owner}/{repo}/issues?state=open&per_page=10` | titres, labels, dates | ✅ Feedback communauté |
| `GET /repos/{owner}/{repo}/contributors` | nb contributeurs, commits par personne | ✅ Taille équipe |
| `GET /repos/{owner}/{repo}/stats/commit_activity` | commits par semaine sur 52 semaines | ✅ Tendance long terme |
| `GET /search/repositories?q={query}` | concurrent research | ⚠️ Usage ponctuel (rate limit plus serré : 10/min) |

### Ce qu'on obtient déjà (implémenté dans `github.ts`)

```
owner/repo — description
Stars: X | Forks: X | Open issues: X
Last push: YYYY-MM-DDTHH:MM:SSZ
Recent commits:
- feat: message (date)
- fix: message (date)
...
```

---

## Ce qu'un token PAT débloque

Rate limit : **5 000 req/heure** (x83).

En plus des repos publics :
- Repos **privés** de l'utilisateur (lecture)
- Meilleure stabilité en prod (IP Convex partagée → 60 req/h peut vite être épuisé si plusieurs users)

> **Conclusion :** Pour le POC avec quelques utilisateurs, pas de token = acceptable sur des repos publics. En production réelle, le token devient nécessaire pour éviter les rate limit errors.

---

## Ce qu'on ne peut PAS faire avec l'API GitHub

- Lire les analytics de trafic du repo (`/repos/{owner}/{repo}/traffic/views`) → **nécessite d'être owner du repo** (pas juste lecteur)
- Accéder aux discussions privées, wikis privés
- Obtenir les GitHub Actions logs sans token admin
- Scraper les profils utilisateurs de manière exhaustive (pas de données comportementales)

---

## Workflow de tracking GitHub recommandé

### Pour chaque projet actif avec un lien GitHub

**1 appel principal** (`/repos/{owner}/{repo}`) — toujours :
```
stars, forks, open_issues_count, pushed_at, description
```

**1 appel commits** (`/commits?per_page=5`) — toujours :
```
5 derniers commits : message + date
→ détecter l'activité depuis le dernier tracking
```

**1 appel releases** (`/releases/latest`) — conditionnel :
```
Seulement si un tag de release existe (pas tous les projets en ont)
→ détecter une nouvelle version publiée
```

**Total : 2-3 appels par projet par run cron.**

Avec 10 projets actifs = 30 appels max → bien dans les 60/h sans token, largement dans les 5 000/h avec token.

---

## Signaux utiles pour le rapport quotidien

| Signal | Endpoint | Interprétation |
|--------|----------|----------------|
| Stars +N depuis hier | `/repos` → `stargazers_count` diff | Traction / viralité |
| Dernier commit > 7 jours | `/commits[0].date` | ⚠️ Inactivité à signaler |
| Open issues en hausse | `open_issues_count` diff | Usage réel, feedback entrant |
| Nouvelle release | `/releases/latest` tag change | Milestone franchi |
| Nouveau contributeur | `/contributors` diff | Signal de croissance équipe |

---

## Évolution possible : GitHub Events API

`GET /repos/{owner}/{repo}/events` — flux d'événements bruts (push, fork, star, issue, PR).

Avantage : un seul appel donne **tous** les événements depuis le dernier polling, sans avoir à differ chaque métrique séparément.

Limite : historique de 90 événements max, pas de pagination au-delà.

**Recommandation V2 :** remplacer les 3 appels actuels par `/events` + parsing côté agent.

---

## Décision scope V1

**Aller avec GitHub API en priorité sur les réseaux sociaux, pour 3 raisons :**

1. **Fonctionne aujourd'hui**, sans dépendance externe payante (Apify)
2. **Les vibe coders ont tous un repo GitHub** — c'est le signal de progrès le plus direct (commits = travail réel)
3. **Données structurées** → l'agent peut faire des diffs propres entre deux runs, pas du parsing de HTML fragile

Les réseaux sociaux (TikTok/Instagram) restent V2 via Apify — utiles pour la distribution, pas pour le progrès technique.

---

## Fichiers concernés

```
convex/tools/scrape/github.ts    — githubFetch() — implémenté
convex/github.ts                 — action validateGitHubToken — implémenté
convex/tracking.ts               — scrapeUrl tool (appelle githubFetch si URL github.com)
convex/tools/scrape/index.ts     — dispatcher URL → githubFetch ou firecrawlScrape
```
