
### Contenu du `README.md`

```markdown
# GL02_YODI

`GL02_YODI` est un projet Node.js conçu pour aider les utilisateurs à créer et gérer des fichiers GIFT (General Import Format Technology) destinés à des usages pédagogiques. Il inclut des fonctionnalités pour analyser, traiter et générer des fichiers de questions, ainsi que pour exporter des visualisations et des documents PDF.

## Fonctionnalités

- Analyse et traitement des fichiers GIFT.
- Définition d'un profil d'examen basé sur les questions.
- Exportation de graphiques visuels à l'aide de Vega et Vega-Lite.
- Génération de fichiers PDF avec Puppeteer et PDFKit.
- Prise en charge de plusieurs types de questions : choix multiples, vrai/faux, réponse courte, association, lacunes (cloze), et plus encore.

## Pré-requis

- **Node.js** : Version 18.xx ou plus récente.
- **npm** : Inclus avec Node.js.

## Installation

1. Clonez le dépôt :

   ```bash
   git clone <url-du-dépôt>
   cd gl02_yodi
   ```

2. Installez les dépendances :

   ```bash
   npm install
   ```

## Utilisation

1. Lancez l'application :

   ```bash
   npm start
   ```

2. Suivez les instructions affichées pour traiter ou analyser les fichiers GIFT.

## Structure du projet

```plaintext
gl02_yodi/
├── index.js           # Point d'entrée de l'application
├── src/               # Code source
│   ├── processGiftFiles.js  # Gère l'analyse et le traitement des fichiers GIFT
│   ├── examManager.js       # Gère la création et l'analyse des examens
│   ├── questionManager.js   # Gère les fonctionnalités liées aux questions
├── data/              # Contient les données et exemples de fichiers
│   ├── questions.json       # Exemple de fichier de questions
├── README.md          # Documentation du projet
├── package.json       # Métadonnées et dépendances du projet
```

## Dépendances

Le projet utilise les dépendances suivantes :

- **[canvas](https://www.npmjs.com/package/canvas)** : Pour gérer le rendu SVG des graphiques.
- **[chalk](https://www.npmjs.com/package/chalk)** : Pour styliser les chaînes de texte dans le terminal.
- **[fs-extra](https://www.npmjs.com/package/fs-extra)** : Fournit des fonctionnalités avancées pour le système de fichiers.
- **[he](https://www.npmjs.com/package/he)** : Encodeur/décodeur d'entités HTML.
- **[inquirer](https://www.npmjs.com/package/inquirer)** : Pour afficher des invites interactives en ligne de commande.
- **[path](https://www.npmjs.com/package/path)** : Utilitaires pour manipuler les chemins des fichiers et dossiers.
- **[pdfkit](https://www.npmjs.com/package/pdfkit)** : Librairie pour créer des documents PDF.
- **[puppeteer](https://www.npmjs.com/package/puppeteer)** : Chrome sans interface pour le rendu HTML en PDF.
- **[vega](https://www.npmjs.com/package/vega)** : Grammaire pour générer des visualisations de données.
- **[vega-cli](https://www.npmjs.com/package/vega-cli)** : Interface en ligne de commande pour Vega.
- **[vega-lite](https://www.npmjs.com/package/vega-lite)** : Grammaire simplifiée pour la visualisation de données.

## Développement

Si vous souhaitez contribuer ou modifier le projet :

1. Installez toutes les dépendances :

   ```bash
   npm install
   ```

2. Lancez le projet :

   ```bash
   npm start
   ```

3. Apportez vos modifications et testez-les localement.

## Tests

Aucun test automatisé n'est encore implémenté. Pour tester manuellement :

1. Préparez un fichier GIFT ou utilisez `data/questions.json`.
2. Lancez l'application et traitez le fichier.
3. Vérifiez les résultats et les journaux dans le terminal.

## Licence

Ce projet est sous licence **ISC**. Consultez le fichier `LICENSE` pour plus de détails.

---

**Auteur** : Ajoutez votre nom ici

## Dépannage

Si vous rencontrez des problèmes :
- Assurez-vous que Node.js version 18.xx ou plus récent est installé.
- Vérifiez que toutes les dépendances sont correctement installées avec `npm install`.
- Pour les problèmes avec `canvas` ou `puppeteer`, consultez leur documentation respective.

## Améliorations futures

- Ajouter des tests automatisés.
- Améliorer la gestion des erreurs lors du traitement des fichiers.
- Renforcer l'interface utilisateur pour une meilleure interactivité.
```
