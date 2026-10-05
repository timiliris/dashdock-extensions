# Contribuer

1. Créez un dossier avec un identifiant unique sous `extensions/`.
2. Déclarez uniquement les permissions nécessaires et fournissez les textes français et anglais.
3. Validez les messages reçus du parent, utilisez le pont DashDock pour les données et ne stockez jamais de clé API.
4. Testez le widget, les réglages latéraux, le thème clair/sombre et les petits écrans.
5. Régénérez `catalogue.json` avec `node tools/build-catalogue.mjs` et ouvrez une pull request.

Les mainteneurs examinent le code, les permissions et la compatibilité avant fusion. Un changement de fichiers publiés doit augmenter la version du manifeste. Aucune installation d’extension ne doit modifier directement le dashboard ou exécuter des commandes sur le serveur.
