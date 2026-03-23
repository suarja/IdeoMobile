## Subject 


Alors liste des choses à profiler, entre autres déjà concernant l'écran principal. Moi je pense qu'on est bon.

Ah oui si, quand on choisit, lors du ship de sélection, pour sélectionner quel si continuer ou choisir un autre sujet avec lequel continuer, dès qu'on clique sur l'autre sujet on est lancé. Le message est envoyé.

Il faudrait une étape intermédiaire où on peut joindre. En fait en gros c'est comme un preset et après on peut quand même parler, ajouter une question, discuter.

Tu vois, il faut modifier ce flot sinon on est pas mal du tout à ce niveau-là. Les délits, challenge à délit challenge, ils sont peut-être bien trop trop disparate. Il faut peut-être les centrer, moins qu'ils soient plus centré, moins, et plus entrer sur un même sujet, parce que là ça part dans tous les sens.

Less plus rentré, il a beaucoup en plus. Là il a plus que cinq, d'ailleurs un six. Faudra voir pourquoi ça arrive.

Ah oui et qu'il soit plus dans le design des choses comme ça, mais les choses un peu plus à l'idéal. Ce serait juste qu'on peut contrôler nous, mais why not, sur l'intègre avec GitHub, qu'on a notre flou de validation et de tracking? Pourquoi pas avoir même ça?

Demande vraiment que les challenges soient beaucoup plus centré, quoi l'avancement, mais l'agent. Il faut que vraiment il crée la progression pour que cette progression soit mise à jour, que ce soit par l'agent dans la conversation quotidienne et aussi dans le flot de tracking.

Ouais, le flot de tracking, c'est bien. Ça faut ajouter ça dans le flot de tracking, sinon on est pas mal, insights.

Par rapport à la validation, faudrait construire le flot de validation, disons plus poussé, donc l'orchestration du flot de validation plus poussé, avec la création de l'artefact à la fin. Travailler sur cette question-là, qu'on pourrait se faire de manière synchrone ou asynchrone.

À réfléchir ensuite concernant les projets, bon, ça c'est un sens en cours avec les liens, tout ça. Il faut mettre à jour comment se présenter par rapport aux liens GitHub, surtout, et est-ce qu'on laisse les autres liens et ce qu'on ne va pas centraliser les projets avec le lien? Enfin, d'un côté il ya les liens de l'utilisateur, d'un côté dans son profil, donc là il ya le son GitHub personnel, tout ça et donc avec le token.

Et d'un autre côté on a le projet. On va voir qu'est-ce qui peut être fait dans ce à ce niveau-là, mais c'est vrai que c'est un peu diffusé, un peu dans tous les sens. 

Est-ce qu'il faudrait que les challenges soient quelque chose de beaucoup plus intégré avec justement la feature de tracking, où l'utilisateur, en fait, en valide s'il a accompli le challenge en checkant par exemple son GitHub? Du coup, il faut que les challenges soient vraiment orientés sur la progression dans le repository.

Ce qui permettrait, ce qui fait qu'il faudrait que, quand il essaie de valider, on fasse une recherche de son GitHub. Ça peut être très gourmand, mais il faudrait contraindre, et ça peut être pas mal, au lieu de juste checker par rapport aux conversations, check par rapport à ce qu'il fait ou pas. Ça peut être pas mal. 

Donc, en gros, ce qu'il faudrait, c'est plutôt que d'avoir des défis qui sont validés par l'utilisateur.

En gros, ce qu'il faudrait, c'est de ritualiser aussi l'accomplissement des défis, gens créés, comme un service de notification qui permet, lorsque l'utilisateur, par exemple, imaginons que l'utilisateur a accompli un défi, il va générer une notification.

Et, en utilisateur, si par exemple l'utilisateur est dans l'application à ce moment-là, il y a un listener qui va l'avertir, ou alors, quand il ouvre l'application, il va avoir un modal qui va le féliciter pour l'accomplissement de cet événement, précisément, avec un message qui parle de cet événement et pourquoi c'est bien, et ainsi de suite.

Par exemple, si il y en a plusieurs, on peut grouper ça dans un même message avec le nombre de points gagnés, etc.

De sorte que, si l'agent de chat, il peut quand même créer des défis qui sont alignés avec ce qu'on a dit, donc par rapport au GitHub et tout ça, et par rapport à la conversation, mais il faut que ce soit beaucoup plus précis et beaucoup plus, disons, des objectifs plus smarts, dans le sens où c'est mesurable et vérifiable, et non pas contraint dans le temps.

C'est-à-dire que, par exemple, si l'utilisateur n'a pas avancé sur un défi, je sais pas comment on pourrait faire, parce qu'il faudrait pas non plus qu'il s'accumule. Faudrait pas en créer davantage. Faudrait peut-être pouvoir les c'est un peu tricky, parce que faut donner envie à l'utilisateur de les accomplir, mais s'ils sont là que l'utilisateur ne le fait pas et que, du coup, il faut pouvoir.

Ouais, on va se dire qu'on en a dix, on va juste avoir les daily challenges, on va en avoir dix maximum. Et voilà, dès que l'utilisateur en crée, dès que l'utilisateur en accomplit, on enlève. On peut en créer d'autres, sinon on laisse.

De sorte que voilà, c'est simple, le flot. 

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

