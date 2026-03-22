## Subject 
Alors, il y a deux sujets principaux :
1. C'est concernant la web search. Il faudrait faire en sorte que, en gros, il faudrait donner la rotation suivante à l'application. L'application est vraiment orientée autour du rituel du daily stand up, et donc c'est le fil conducteur. On voit à travers des conversations, notamment à l'oral, que l'application est destinée à être un verbal processor, la personne qui accouche de l'idée à l'oral. En fait, dans un premier temps logique, c'est la validation de l'idée. La validation de l'idée, elle se fait dans un premier temps par l'outil de recherche, disons, par l'agent. L'agent peut faire des recherches. Il s'avère que, de ce que je peux comprendre, elles sont assez rapides et assez ponctuelles.
2. On pourrait, dans un deuxième temps, créer un workflow de recherche approfondie qui fait une analyse de marché comparative, mais ça, c'est peut-être dans un deuxième temps seulement. Faudrait voir dans quelles mesures on ne pourrait pas faire quelque chose de plus flexible et plus rapide, notamment en se basant sur le framework que je vais donner à tout à l'heure. Je vais mettre ça en lien ici, présent, vers le framework de validation d'une idée.
Ensuite, dans un second temps, c'était vraiment d'avoir, à travers ce même outil de recherche, des background jobs réguliers. On pourrait installer ça dans le cron job qui s'exécute par rapport au Daily Challenge et qui viendraient peut-être faire une recherche sur les liens qu'aura fourni l'utilisateur par rapport à disons les réseaux sociaux, le site, le GitHub du projet. On pourrait avoir justement des liens par projet que l'agent pourrait consulter, donc à ce moment de recherche un peu régulière, ou deux recherches ponctuelles finalement.
On pourrait avoir ce double mouvement :
- Soit de recherche ponctuelle, vis-à-vis de la validation de l'idée
- Et, de l'autre côté, pour le suivi de l'avancement du projet, à travers le lien qu'aura fourni l'utilisateur, ce qui permettrait d'avoir deux axes principaux : c'est l'avancement de la validation de l'idée et la gestion de l'avancement du projet à travers des recherches.
Dans un premier temps, rapide, ponctuel, disons, qui pourrait se faire limite dans la conversation, la gente pourrait aller directement vérifier, dire, et ou vérifier où est l'utilisateur dans certains réseaux, dans certains avancements de sites web, par exemple, et ou aussi des recherches un peu plus hebdomadaires, enfin quotidiennes, où l'agent ferait des recherches plus approfondies sur l'état, l'avancement du projet.
Ce qui donnerait lieu à des jobs asynchrone de workflow aux pages de fonds qui donneraient lieu peut-être à des notifications, des plans, des artefacts, que ce soit de l'ordre des contres-rendus, analyses et des choses comme ça. Mais ils sont peut-être dans un second temps.



Critère,Score Faible (1),Score Élevé (5)
Revenu du client cible,Créateurs de contenu sans budget,Entrepreneurs/Managers (B2B)
Fréquence d'utilisation,Une fois par mois / ponctuel,Usage quotidien
Alternatives existantes,Marché saturé (ex: IA writing),Gap réel / niche peu servie
Sophistication technique,Développeurs (peuvent le coder),Artisans/Professions libérales
Profondeur d'intégration,Session indépendante,Données accumulées (Sticky)

## Bugs

### UI

- Et ok, il faudrait ajouter le retour haptique un peu partout dans l'application. Je pense que ça peut faire l'objet d'une feature entière pour voir où est ce qu'on doit ajouter le retour haptique dans l'app. 


### Code


## Gamification
### Afficher la barre de progression en mode banner chaque fois qu'on attribut des points

- afficher la modale banner progress bar à chaque fois que des points sont attribués

## tool to update radar ponderation and project score


### Create a personnalized challenges based on users 

### Cron job to validate the daily challenges at expiration time 

### Daily challenge agent validator
- Il faudrait blocker la demande de complétion des challenges une fois toutes les heures 
- change the way the agent formulates its response to adress to the user directly and have the user context?




### Chat Agent

- Il faudrait implémenter le paramètre d'ajustement de l'heure du rituel du Daily Stand-Up. 

- usage tracking and sharing defaults 
https://docs.convex.dev/agents/agent-usage#customizing-the-agent
https://docs.convex.dev/agents/usage-tracking




#### Chat interface

- Ajouter guard agent (router)


### Handle voice session logic (standup)

## Memory

- update the memory entry to be user friendly
- adding emmbedding


##### Flow rituel vs Commit


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

## Copy
- La boussole du vibe codeur

## Offre irresistible
- si tu suis notre méthode et que tu ne fais pas d'argent avec ton projet, tu ne payes rien


don: project manager