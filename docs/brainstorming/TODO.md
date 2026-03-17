
## Gamification
## tool to update radar ponderation and project score
### Handle voice session logic (standup)
- quand est ce qu'une session est crééé
- Voir un détecteur, une espèce de modal ou autre, qui crée une animation et qui participe à la création de nouvelles sessions de voix, lorsque l'utilisateur revient sur l'application ou que une session se termine avec un élément, une animation, quelque chose de visuel, donc un agent. Merci. 

### Create a personnalized challenges based on users 

Shared SYSTEM_CHALLENGE_POOL, pickRandom, and
  utcDateString helpers extracted from crons.ts

### Cron job to validate the daily challenges at expiration time 

### Daily challenge agent validator
- Il faudrait blocker la demande de complétion des challenges une fois toutes les heures 
- change the way the agent formulates its response to adress to the user directly and have the user context?



### Chat Agent
- [x] check user daily challenges (readDailyChallenges tool)
- [x] multi-agent router (Haiku router + 4 specialist agents)
- [x] web search (Tavily/Perplexity/Anthropic native — triggerValidationSearch)
- session detector
Il faudrait que, quand l'application le sourd, on fasse un check rapide, par exemple, "a eu lieu le dernier message?" et que, du coup, on puisse, pas raison, dans un premier temps, peut-être, prompter l'utilisateur pour lui demander ce qu'il veut : continuer la session précédente ou en démarrer une autre.

Non, c'est un peu con, parce que, toute façon, c'est la même conversation en fait. Si, si, mais ça va être un peu de la magie en fait dans l'interface, en sache que je veux dire.

C'est que, si on veut recommencer une nouvelle session, on ne va pas afficher son dernier message ni celui de l'agent. On va avoir un canvas blanc. S'il continue, bon, laisse tel quel. Non, c'est pas moi. 

#### Chat interface
- tool calling show in interface
Il faudrait intégrer maintenant qu'on va avoir le tool calling. Il faudrait créer l'interface pour cela. 

- agent form components 

- au dela d'une certaine longeur de message que faire? 
  - apple intélligence ?
  - modèle pour compacter et résumer 
  - 

- 

##

### Tools 

#### Web Search
- [x] Tavily (default, TAVILY_API_KEY)
- [x] Perplexity (PERPLEXITY_API_KEY)
- [x] Anthropic native (webSearch_20250305, no extra key)
- [x] triggerValidationSearch tool (validation + distribution agents, quota 1/projet 4/mois)

#### Agent Tools Futurs
- [ ] generateHtmlMockup (designAgent) — maquette HTML dans Convex file storage
- [ ] generateMarkdownDoc (developmentAgent) — ADR + tech stack docs
- [ ] searchSocialProfile (distributionAgent) — analyse style éditorial Twitter/TikTok
- [ ] createContentDraft (distributionAgent) — posts alignés avec la voix de l'user

  
## Onboarding 
### Aha moement
L'utilisateur aura donc un échange avec l'agent, et à l'issue de celui-là, ce qu'on peut faire, c'est voilà, avoir peut-être une espèce d'évaluation de l'idée et peut-être la création d'objectifs quotidiens que l'utilisateur pourra voir. En fait, en gros, on va lui créer la page focus sur mesure avec des challenges et la barre de progression, tout ça, et voilà, à la volée. 