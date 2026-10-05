# Extensions DashDock — API v1

Une extension est un dossier autonome :

```text
extensions/
  mon-widget/
    manifest.json
    index.html
    style.css      # facultatif
    app.js         # facultatif
```

```json
{
  "id": "mon-widget",
  "name": "Mon widget",
  "version": "1.0.0",
  "description": "Ce que fait mon widget.",
  "entry": "index.html",
  "api_version": 1,
  "category": "information",
  "permissions": ["weather"],
  "translations": {
    "fr": {"name": "Mon widget", "description": "Ce que fait mon widget."},
    "en": {"name": "My widget", "description": "What my widget does."}
  }
}
```

Le champ `id` doit correspondre au nom du dossier : lettres ASCII, chiffres, tirets et underscores, 64 caractères maximum. Les champs `id`, `name`, `version`, `description`, `entry` et `api_version` sont requis ; `category`, `permissions` et `translations` sont facultatifs. `api_version` doit valoir `1`. Les métadonnées facultatives `category` (texte), `icon` (texte) et `tags` (tableau de textes) facilitent la découverte dans le catalogue. Les chemins relatifs peuvent contenir des sous-dossiers, sans `..`, caractères spéciaux ou liens symboliques sortant du dossier racine des extensions.

Utiliser du HTML, CSS et JavaScript natif. Les fichiers CSS/JS locaux fonctionnent avec des chemins relatifs, par exemple `<script src="app.js"></script>`. Aucun SDK ou gestionnaire de paquets n’est nécessaire. Ouvrir Extensions → Store pour installer le paquet, puis Ajouter au dashboard pour créer une instance. Le widget reçoit un titre personnalisable dans le dashboard.

Par défaut, chaque instance est une iframe avec `sandbox="allow-scripts"` : le JavaScript fonctionne, l’accès au DOM du dashboard, à son stockage et à ses API privées est interdit. Une extension qui déclare la permission `links` reçoit en plus `allow-popups allow-popups-to-escape-sandbox`, à la fois sur l’iframe et dans la directive `sandbox` de sa CSP, pour ouvrir un lien dans un onglet externe. La politique CSP garde `connect-src 'none'` et bloque les requêtes réseau directes, les frames imbriquées et les ressources distantes. Inclure ses dépendances dans le dossier. Les images locales et `data:` sont autorisées. Ne pas mettre de secrets dans une extension.

L’API v1 fournit une passerelle contrôlée vers les intégrations backend et une configuration JSON persistante par instance. Les requêtes réseau directes de l’iframe restent bloquées : les méthodes autorisées passent par `postMessage` et les permissions déclarées dans le manifeste. Les extensions sont installées par la personne qui administre le serveur ; le store les télécharge depuis le dépôt public ; il n’y a pas d’upload ZIP depuis l’interface.

## Extensions du store

| Dossier | Fonction | Limites |
| --- | --- | --- |
| `focus` | Durées réglables et sauvegardées de 1 à 180 minutes, démarrer, mettre en pause, réinitialiser | Temps calculé à partir d’une échéance locale ; pas de notification système ; remise à zéro au rechargement |
| `calculator` | Opérations `+ - * /`, parenthèses, nombres décimaux, clavier | Analyseur arithmétique sans `eval`, 120 caractères maximum ; Entrée calcule, Échap efface |
| `checklist` | Ajouter, cocher, supprimer et effacer les tâches terminées | Tâches sauvegardées par widget ; 16 tâches de 100 caractères maximum ; aperçu temporaire |
| `date` | Calendrier mensuel, navigation et retour à aujourd’hui | Date locale du navigateur ; aucun événement ni compte connecté |
| `hello` | Exemple interactif à modifier | Aucun stockage |
| `server-status` | Disponibilité HTTP, latence et graphique historique | Services ajoutables dans les réglages ; suivi serveur activable, un relevé par minute conservé 24 h |
| `bookmarks` | Favoris et raccourcis organisés, avec recherche | Liens HTTP(S) ; réglages persistants par widget ; permission `links` |
| `countdown` | Compte à rebours vers un événement | Échéance sauvegardée par widget ; heure du navigateur ; aucune notification système |
| `scratchpad` | Bloc-notes éditable avec sauvegarde différée | Texte sauvegardé par widget ; taille limitée pour respecter la configuration du serveur |
| `world-clock` | Horloges de plusieurs fuseaux horaires | Zones IANA configurables, changements d’heure gérés par le navigateur |
| `unit-converter` | Conversion de longueur, masse, température et stockage | Calculs locaux ; aucune requête réseau |
| `habit-tracker` | Suivi quotidien des habitudes | Historique borné et sauvegardé par widget ; jours calculés dans le fuseau local du navigateur |
| `stopwatch` | Chronomètre avec pause, reprise et remise à zéro | Session courante ; pilotable par l’assistant IA |
| `weather` | Recherche de ville et météo réelle Open-Meteo | Réseau requis ; pas de clé ; ville persistante par widget |
| `news` | Titres et liens RSS/Atom | Flux définis par l’administrateur ; flux choisi persistant ; permission `links` pour ouvrir les articles |
| `assistant` | Chat OpenRouter, Ollama ou LM Studio | Fournisseur et modèle persistants ; conversation limitée à la session |

Les cinq premières extensions fonctionnent sans requête réseau ; les extensions de service passent par le serveur. Les widgets sont conçus pour un cadre d’environ 260 px de haut. Ne pas annoncer de persistance via `localStorage` : le sandbox sans `allow-same-origin` ne l’autorise pas.

## Recevoir le thème du dashboard

Le dashboard envoie à l’iframe un message `postMessage` :

```js
{
  type: 'dashdock:theme',
  theme: 'dark',
  accent: '#a3bffa',
  font: 'system',
  lang: 'fr',
  colors: {
    bg: '#18202b', text: '#f0f3f8', muted: '#a7b3c4',
    surface: '#242e3b', border: '#384454'
  }
}
```

`theme` vaut `dark` ou `light`, `accent` est une couleur hexadécimale à six chiffres, et `font` vaut `system`, `humanist` ou `mono`. L’objet facultatif `colors` transmet les couleurs exactes de la palette : `bg` (fond du widget), `text`, `muted` (texte secondaire), `surface` (contrôles) et `border`. Chaque champ est facultatif et doit être une couleur `#RRGGBB` ; les champs absents conservent leur valeur actuelle ou celle du thème CSS. Les exemples ignorent les clés inconnues et les couleurs invalides. Au chargement, l’extension annonce qu’elle est prête avec `parent.postMessage({ type: 'dashdock:ready' }, '*')`. Cela permet au parent d’envoyer son thème après l’installation de l’écouteur.

Valider `event.source === parent` et le type de message avant de lire ces valeurs. Les exemples `theme.js` valident chaque valeur avant de l’appliquer à des variables CSS ; ils n’insèrent jamais le contenu reçu dans le DOM. L’origine d’une iframe sandboxée est opaque : l’exemple ne repose pas sur `event.origin`. `'*'` est nécessaire pour joindre cette origine ; les messages ne contiennent aucune donnée privée. Le message de thème transmet uniquement l’apparence et la langue ; les données et la configuration utilisent le protocole de requêtes décrit ci-dessous.

Exemple complet : `extensions/hello/`. Il fournit un bouton interactif pour vérifier que les scripts fonctionnent dans le cadre isolé.


## Français / English

Le message `dashdock:theme` contient `lang: 'fr'` ou `lang: 'en'`. Mettre à jour les textes, les labels accessibles et les formats de date sans recréer l’état utilisateur. Les exemples initiaux utilisent `i18n.js` et déclenchent un événement `document` `dashdock:language` avec `detail: {lang}` depuis leur écouteur de thème. Les nouvelles extensions de service gèrent ce message dans leur propre petit pont local.

Les traductions du manifeste sont facultatives. Le catalogue prend `translations[lang].name` et `.description`, avec repli sur les champs principaux. Le dashboard expose `window.DashDockI18n` (`t(key, params)`, `lang()`, `set(lang)`, `apply(root?)`, `extension(manifest)`) ; cette API parent n’est pas accessible directement à une iframe isolée. Les titres de widgets et le contenu personnel ne sont pas traduits automatiquement.

The parent sends the language with every theme message. Update labels and dates in place, preserving tasks, timer state and conversation text. Optional manifest translations localize catalogue names and descriptions. User content keeps its original text. The dashboard stores the preference locally; extensions receive it through the message protocol.

## Requêtes et réponses du pont / Bridge protocol

Installer l’écouteur avant d’envoyer `dashdock:ready`. Toute requête utilise un `requestId` unique pour associer sa réponse à la promesse en attente :

```js
parent.postMessage({
  type: 'dashdock:request',
  requestId: 'weather-1',
  method: 'weather.search',
  params: {query: 'Bruxelles', lang: 'fr'}
}, '*');

// Message de réponse : result en cas de succès, error en cas d’échec.
{
  type: 'dashdock:response',
  requestId: 'weather-1',
  result: [{name: 'Bruxelles', latitude: 50.85, longitude: 4.35}]
}
```

Valider `event.source === parent` et le `type`. Une réponse d’erreur contient `error` à la place de `result` ; accepter un texte ou un objet avec `message`. Ajouter un délai d’attente, supprimer les requêtes terminées de la collection et afficher les erreurs à l’utilisateur. Le parent vérifie la fenêtre source et le manifeste de l’extension, appelle le serveur avec l’authentification du dashboard puis renvoie le résultat ; aucun token ni clé fournisseur n’est transmis à l’iframe.

À l’initialisation, le parent envoie également le contexte :

```js
{
  type: 'dashdock:context',
  boardId: 'main',
  widgetId: 'widget-id',
  preview: false,
  config: {latitude: 50.85, longitude: 4.35, city: 'Bruxelles'}
}
```

`boardId` et `widgetId` identifient l’instance associée ; ils ne sont pas des permissions ni des secrets. `preview: true` identifie un aperçu du catalogue. Sa configuration reste temporaire et n’écrit aucun dashboard. Les widgets installés ont leur propre objet `config` persisté dans le JSON du dashboard. Il doit être un objet JSON de 8 Kio maximum ; le serveur valide aussi sa profondeur et les tailles des clés, textes et tableaux. `config.get` retourne cet objet ; `config.save` accepte un objet direct ou `{config: objet}`. Exemples :

```js
const config = await request('config.get');
await request('config.save', {provider: 'ollama', model: 'llama3.2'});
// Équivalent : await request('config.save', {config: {...}});
```

`request` désigne ici une petite fonction locale qui crée une promesse, conserve son `requestId` et envoie l’enveloppe ci-dessus. Le fichier `extensions/news/bridge.js` en fournit un exemple utilisable, sans dépendance ; l’assistant possède son propre wrapper avec un délai adapté à l’IA. Le stockage `config` ne remplace pas un coffre de secrets. Ne jamais y sauvegarder de clé API : il est visible dans les exports et accessible aux personnes qui ont accès au dashboard.

## Méthodes et permissions / Methods and permissions

Les méthodes `config.get` et `config.save` sont disponibles pour chaque instance sans permission supplémentaire. Les autres méthodes demandent la permission correspondante dans `manifest.json` :

| Permission | Méthodes | Paramètres |
| --- | --- | --- |
| `status` | `status.targets`, `status.check`, `status.history`, `status.tracking` | `{}` ; `{target}` ; `{target, hours: 1\|6\|24}` ; `{target, enabled: true\|false}` |
| `weather` | `weather.search`, `weather.current` | `{query: 'Bruxelles', lang: 'fr'}` ; `{latitude: 50.85, longitude: 4.35}` |
| `news` | `news.feeds`, `news.items` | `{}` ; `{feed: 'id-administrateur'}` |
| `ai` | `ai.providers`, `ai.models`, `ai.chat` | `{}` ; `{provider: 'ollama'}` ; `{provider, model, messages: [{role: 'user', content: 'Bonjour'}]}` |
| `dashboard` | `dashboard.widgets`, `dashboard.action` | `{}` ; `{widget_id, action, arguments}` |
| `services` | `status.create` et actions IA `service.create`, `service.select` | `{name, url}` ; voir tableau des actions ci-dessous |
| `links` | Aucune méthode RPC ; autorise les onglets externes | Liens HTTP(S) avec `target="_blank"` et `rel="noopener noreferrer"` |

La permission `links` est indépendante des permissions de données. L’extension Actualités déclare `"permissions": ["news", "links"]` : `news` autorise la lecture des flux par le pont, `links` autorise l’ouverture des articles dans un nouvel onglet. Valider les URL HTTP(S) avant de créer un lien, puis utiliser `target="_blank" rel="noopener noreferrer"`. Les documents ouverts sortent du sandbox de l’extension ; cette permission ne donne aucun accès au DOM du dashboard, à son stockage ou à ses secrets, et n’active pas les appels `fetch` directs.

Une méthode inconnue ou une permission absente produit une erreur. Les cibles HTTP initiales et les flux sont définis dans `DASHDOCK_STATUS_TARGETS` et `DASHDOCK_NEWS_FEEDS` côté serveur. Avec la permission `services`, le widget Statut des serveurs et l’assistant peuvent ajouter des services persistants via `status.create({name, url})`. Les URL doivent être HTTP(S), sans identifiants ni fragment ; le serveur valide la cible et bloque les endpoints de métadonnées. Les aperçus ne créent pas de services. Les flux RSS et les endpoints des fournisseurs IA restent configurés côté serveur. La météo utilise les endpoints Open-Meteo prédéfinis. Voir [ai.md](ai.md) pour les limites des conversations et l’installation des fournisseurs.

Requests use a unique ID and resolve from `dashdock:response`. Always verify the parent window, handle errors and timeouts, and declare the required manifest permission. `dashdock:context` carries the instance configuration and preview flag. `config.get` and `config.save` are permission-free and scoped to the current widget; preview saves are temporary. Persist preferences, never credentials. Direct iframe networking remains blocked; administrator-defined targets, feeds and provider URLs govern backend access.


The optional `links` permission enables `allow-popups allow-popups-to-escape-sandbox` in both the iframe and its CSP sandbox. It lets user-activated HTTP(S) article links open in an external tab with `target="_blank" rel="noopener noreferrer"`. The bundled news extension declares both `news` (feed data) and `links` (opening articles). `connect-src 'none'` still applies to the extension; direct networking remains blocked and data access continues through the bridge.

Les formulaires locaux utilisent `allow-forms` pour déclencher leurs événements JavaScript. La CSP `form-action 'none'` interdit toute soumission réseau directe ; les données passent par le pont. / Local forms use `allow-forms` for JavaScript submit events. CSP `form-action 'none'` blocks direct network form submissions; data goes through the bridge.

## Générateur de démarrage / Starter generator

`node tools/create-extension.mjs mon-widget --name "Mon widget"` crée un dossier indépendant dans `extensions/`, avec thème et langue hérités, manifeste traduit et guide local. Il ne remplace aucun fichier existant et n'active aucune permission réseau. Modifier `index.html` et `i18n.js`, puis régénérer catalogue.json et proposer une pull request au store. / Creates an independent themed, bilingual extension with no network permissions. Existing folders are never overwritten. Edit its HTML and translations, then reload the catalogue; Node is only a development helper.

Les listes Checklist sauvegardent leurs tâches et Focus sauvegarde ses durées dans `Widget.config`; ce sont des exemples de configuration persistante. Les anciens widgets sans config restent valides. / Checklist saves tasks and Focus saves durations in per-widget config; old widgets without config stay valid.


### Panneau de réglages latéral

Une extension peut annoncer `{type: 'dashdock:ready', settings: true}` pour afficher une roue dentée sur sa carte. DashDock ouvre son point d’entrée dans un panneau latéral avec `?view=settings`. La carte reçoit `?view=widget` ; l’aperçu reçoit `?view=preview`. L’extension adapte son interface à ce paramètre (contenu dans la carte, configuration dans le panneau).

Le panneau utilise le même identifiant de widget, les mêmes permissions et le même thème. `config.save` persiste les réglages et transmet `dashdock:config` aux deux instances. Écoutez cet événement pour mettre à jour la carte sans recharger son iframe ni perdre son état de session. Les réglages doivent être des données ; les clés secrètes restent côté serveur. Le panneau se ferme avec Échap, sa croix ou un clic sur le fond.

### Actions sur le dashboard / Dashboard actions

La permission `dashboard` permet à un widget installé d’énumérer et de modifier les widgets de son dashboard avec `dashboard.widgets` et `dashboard.action`. Elle est refusée dans les aperçus et les panneaux de réglages. L’inventaire contient seulement les identifiants, titres, types et actions disponibles : aucun contenu de note ni aucune configuration des autres extensions n’est transmis au modèle.

L’assistant déclare `ai` et `dashboard`. Le pont joint automatiquement l’inventaire validé à `ai.chat`. Un modèle compatible avec les outils peut appeler `dashboard_action`; le backend valide ces appels et retourne `actions` en plus de `content`. L’assistant exécute les actions structurées via le pont et affiche chaque résultat ou erreur. Un texte libre du modèle ne déclenche jamais de commande.

| Action | Arguments | Cible |
| --- | --- | --- |
| `note.create` | `{title, content}` | `widget_id: ''`, nouvelle note |
| `note.append` | `{text}` | Identifiant d’une note existante |
| `stopwatch.start` | `{}` | Identifiant d’un chronomètre prêt |
| `stopwatch.pause` | `{}` | Identifiant d’un chronomètre prêt |
| `stopwatch.reset` | `{}` | Identifiant d’un chronomètre prêt |
| `service.create` | `{name, url}` | `widget_id: ''` obligatoire : enregistre le service et crée un nouveau widget, sans remplacer une carte existante |
| `service.select` | `{target}` | Identifiant d’un widget Statut des serveurs existant ; `target` est un identifiant de service |

Le chronomètre annonce `parent.postMessage({type:'dashdock:ready', actions:['start','pause','reset']}, '*')`. Il accepte ensuite les messages du parent `{type:'dashdock:action', requestId, action:'start', arguments:{}}` et répond `{type:'dashdock:action-result', requestId, result:{running:true, elapsed_ms:0}}` ou `{type:'dashdock:action-result', requestId, error:'unsupported_action'}`. Toujours vérifier `event.source === parent` et l’action reçue. Les commandes démarrer et pause sont idempotentes. Le chronomètre conserve son temps entre une pause et une reprise, et se réinitialise au rechargement.

Only installed widget views with the `dashboard` permission may list or execute dashboard actions. Creating or selecting monitored services also requires `services`. The bridge scopes the request to the sender’s board, checks the target and permitted action, and rejects previews, settings views, arbitrary commands and foreign messages. Tool-capable models are required; ordinary model text never executes. This protocol supports native notes, stopwatches and monitored services; announcing arbitrary action names does not grant new capabilities. The server-status settings panel may separately call `status.create` with the `services` permission and then save its selected target with `config.save`.
