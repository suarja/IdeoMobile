## Bugs

### UI

- Dans le composant, donc les gens forment component. Il faudrait pouvoir avoir un bouton pour valider le choix, parce que là actuellement des comptes cliquent sur l'une des options. Il n'y a pas de possibilité de changer d'avis et ensuite de valider, par exemple. Il faudrait ajouter un bouton valider et que le bouton, donc la check box, passe soit sélectionnée. Qu'on passe le composant d'état à l'état sélectionné. 

- Lors du streaming de la réponse de l'agent, il y a un scroll to the bottom jusqu'à la fin du message, où le scroll to bottom s'arrête. Potentiellement, si le message est très long, on ne voit pas la fin du message, puisqu'on n'est pas scrolled to the bottom. On est resté à un moment, comment dire? La fin du message arrive et du coup on perd le scroll to bottom. Voilà, donc il faudrait à la fin du message scroll to the bottom. 

- Lorsque l'agent renvoie un message de clarification dans le streaming, avant que ce soit rendérisé en Agent Form Component, on voit le format utilisé par l'agent. 



### Code
- Lorsque on télécharge un modèle de transcription, il y a une erreur levée par React, indiquant potentiellement une boucle infinie, mais qui ne bloque pas, ou en tout cas ne bloque pas de façon significative. C'est juste une alerte, peut-être pendant une phase du téléchargement du modèle.

Le flot du modèle est aussi à vérifier, dans le sens où on prévient pas l'utilisateur que on demande pas à l'utilisateur de télécharger le modèle, et on prévient pas non plus au démarrage, la première fois. 


## Gamification
## tool to update radar ponderation and project score


### Create a personnalized challenges based on users 

Shared SYSTEM_CHALLENGE_POOL, pickRandom, and
  utcDateString helpers extracted from crons.ts

### Cron job to validate the daily challenges at expiration time 

### Daily challenge agent validator
- Il faudrait blocker la demande de complétion des challenges une fois toutes les heures 
- change the way the agent formulates its response to adress to the user directly and have the user context?




### Chat Agent

- Il faudrait implémenter le paramètre d'ajustement de l'heure du rituel du Daily Stand-Up. 


#### Chat interface

- Ajouter guard agent (router)



### Handle voice session logic (standup)


##### Flow rituel vs Commit

Et du coup nous on gère la non-gérant, comment dire, côté front-end. On va gérer cette attribution de points, tout ça pour vraiment donner l'illusion de la gamification de l'engagement.  
  
Et en fait l'agence qui va faire, c'est qu'il faut que vraiment ils déduisent à chaque fois si c'est une nouvelle session. En fait une nouvelle session, ça peut être à chaque fois que l'utilisateur revient sur l'app. Si par exemple il change de sujet, on voit à chaque fois ce qu'il faut qu'il fasse. C'est qu'il est à l'esprit que il faut qu'il construise son interaction avec l'utilisateur comme si c'était une session.  
  
Par exemple est-ce que c'est comme si on allait du daily stand-up ou alors que moi par exemple je vais voir mon tech lead et je lui demande pour une question? Tu vois, c'est des petites sessions. Ça peut être juste une session question rapide, une session plus se formaliser et rituel dans le daily stand-up ou alors une réunion de fansprint.  
  
Il faut qu'il s'adapte à chaque fois qui le déduisent et qu'il essaye d'orienter comme ça. Il y a ces deux bleus mécanique et agent, qui un peu plus invisible mais qui va permettre en fait que l'agence soit un peu plus responsable, soit plus qui s'adapte et qui soit plus pertinent à chaque fois au besoin de l'utilisateur pour la session, le type de session, section actuelle, sans parler de sessions ni rien.  
  
C'est juste qu'il faut qu'il laisse cette trame en tête et qu'il surtout ils répondent et organisent disons l'interaction comme ça.  
  
Et en fait le côté mobile, côté front-end, qui va récompenser l'utilisateur à chaque interaction et donner cette base de si, à chaque fois que je viens sur l'app, je suis récompensé donc j'ai plus intérêt à venir sur l'app pour par exemple demander de l'aide, faire mes daily stand-up.  
  
Et peut-être, quand l'utilisateur vient sur l'application, pour par exemple il est à partir de 6:00 du matin, on va dire. On dit la première fois, on va voir peut-être une animation de daily stand-up, tu vois, ou alors quelque chose. Ça pourrait être paramétrable, d'ailleurs. C'est quelque chose qu'on pourrait très bien demander pendant le onboarding pour que l'application réagisse.  
  
Voilà, très bien, donc on pourra paramétrer le daily stand-up, par exemple tous les jours le matin à 6:00 sur bref.  
  
Et en fait les fois où les utilisateurs se connectent, après une fois que le daily stand-up a été fait, c'est plutôt des interactions plus pour demander de l'aide. Là on va juste récompenser pour avoir ouvert l'app et sans grosse animation de rituels, tu vois.  
  
Voilà, comme ça on pourrait différencier les animations rituelles, les animations d'engagement, tu vois, donc les hiérarchiser. Les animations rituelles sont beaucoup plus conséquentes, intrusives, on va dire un peu plus ritualisé, et les animations d'engagement elles sont plus légères. Elles permettent juste de récompenser l'utilisateur pour son engagement.  
  
C'est pas mal cette idée.  
  
Et bien sûr les animations rituelles, elles sont programmables. Faudrait voir dans quelles mesures aussi on peut détecter à chaque fois que l'utilisateur se connecte. On peut peut-être lui afficher un conseil, les engagements par exemple, si l'utilisateur s'est connecté il y a une heure.  
  
On lui demande à chaque fois : "Est-ce que tu veux continuer ou pas?" Tu vois, mais c'est quelque chose de très discret, c'est pas intrusif. C'est par exemple en bas de l'écran, juste en bas du dernier message de l'advisor, on a un choix, un petit message texte qui dit : "C'est fait longtemps. Vous voulez continuer ou recommencer? Pas des zéros mais."  
  
Et là on lui propose par exemple une option : "Besoin d'aide, d'aide technique, d'un conseil, distribution." Tu as quelques options comme ça, par rapport à chaque agent, ce qui nous permettrait ensuite, derrière, de les pré-sélectionner, assez, vraiment smart, ça.



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