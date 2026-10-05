# DashDock Extensions

Le store public des extensions DashDock. Ce dépôt est indépendant de l’application : les extensions ne sont pas intégrées à son image Docker.

Dans DashDock, ouvrez **Extensions → Store**, installez une extension puis ajoutez ses widgets au dashboard. Les extensions installées restent disponibles hors ligne et leurs réglages sont conservés par widget. Les mises à jour sont manuelles.

The public DashDock extension store. Open **Extensions → Store**, install an extension, then add its widgets. Installed files remain available offline; updates are explicit and preserve widget configuration.

## Créer une extension / Create an extension

```sh
node tools/create-extension.mjs my-widget --name "My widget"
node tools/build-catalogue.mjs
node tools/build-catalogue.mjs --check
```

Une extension est un dossier HTML/CSS/JavaScript autonome avec `manifest.json`. Aucun build frontend ni SDK n’est requis. Le [guide de l’API](docs/extensions.md) explique les thèmes, les langues, les réglages latéraux et les permissions.

Proposez une pull request contenant votre dossier dans `extensions/` et le catalogue régénéré. Le manifeste, les permissions et les fichiers doivent être relus avant fusion. N’incluez jamais de secrets, de dépendances distantes ou de fichiers personnels.

## Catalogue

`catalogue.json` contient les manifestes et la liste exacte des fichiers avec taille et SHA-256. DashDock télécharge les fichiers depuis ce même dépôt, valide les chemins, les tailles et les empreintes, puis active le dossier complet. Une empreinte vérifie le contenu ; elle ne remplace pas la confiance dans les mainteneurs du dépôt.

Pour publier une nouvelle version : modifier le numéro du manifeste, régénérer le catalogue et fusionner les changements sur `main`. Les installations existantes ne se mettent pas à jour automatiquement.

## Vérifications

```sh
node tools/build-catalogue.mjs --check
node tests/assistant.cjs
node tests/stopwatch.cjs
node tests/extensions.cjs
node tests/scaffold.mjs
```
`tools/github-actions-template.yml` fournit un modèle GitHub Actions à activer lorsque les permissions de publication des workflows sont disponibles.
