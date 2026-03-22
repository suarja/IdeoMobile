# Scraping Tools — Architecture & State

**Last updated:** 2026-03-22

## État actuel des providers

| Provider | Usage | Statut |
|----------|-------|--------|
| Tavily | Validation agent — recherche générale, competitors, Product Hunt | ✅ Opérationnel |
| GitHub API | Tracking agent — infos repo public/privé | ✅ Opérationnel (token optionnel pour privé) |
| Firecrawl | Tracking agent — sites web génériques | ✅ Opérationnel (websites) |
| Firecrawl | TikTok, Instagram, Twitter | ❌ 403 anti-bot — bloqué |

## Scope de chaque agent

- **Validation agent** → Tavily uniquement (inchangé)
- **Tracking agent** → GitHub API + Firecrawl (websites seulement)

### Pourquoi Firecrawl est bloqué sur les réseaux sociaux

TikTok, Instagram et Twitter/X implémentent des protections anti-bot agressives (fingerprinting, rate-limiting, tokens rotatifs). Firecrawl retourne systématiquement des erreurs 403 sur ces plateformes. Il n'existe pas de workaround stable sans un service dédié.

### GitHub API — token optionnel

Le token GitHub (PAT) est optionnel :
- Sans token → repos publics uniquement (60 req/h)
- Avec token → repos privés + 5000 req/h

Le token est stocké dans `userProfiles.githubToken` (Convex). L'utilisateur peut le configurer dans Settings → My Profile.

## V2 — Apify (hors scope actuel)

Pour le tracking social media, Apify propose des actors maintenus :

| Plateforme | Actor Apify |
|-----------|-------------|
| TikTok | `clockworks/tiktok-scraper` |
| Instagram | `apify/instagram-scraper` |
| Twitter/X | `quacker/twitter-scraper` |

**Prérequis V2 :**
- Compte Apify + clé API stockée en env var
- Budget Apify (compute units) — prévoir ~$20-50/mois selon volume
- Adapter `convex/tracking.ts` pour appeler les actors via l'API REST Apify

## Fichiers concernés

```
convex/github.ts          — action validateGitHubToken + githubFetch
convex/tools/scrape/      — githubFetch, firecrawl helpers
convex/tracking.ts        — agent de tracking (appelle les tools)
convex/agents/            — validationAgent (Tavily uniquement)
```
