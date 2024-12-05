const fs = require("fs");
const path = require("path");

// Charge le GiftParser
const GiftParser = require("./GiftParser");
const chalk = require("chalk");

// Initialisation du GiftParser
const parser = new GiftParser(true); // Paramètre pour afficher le tokenizing

// Liste des fichiers déjà traités
let processedFiles = [];

// Fonction pour lire un fichier ou un dossier
function getGiftFilePaths(inputPath) {
    try {
        const stats = fs.statSync(inputPath);

        if (stats.isDirectory()) {
            // Si c'est un dossier, liste tous les fichiers .gift
            const files = fs.readdirSync(inputPath).filter(file => file.endsWith(".gift"));
            return files.map(file => path.resolve(inputPath, file)); // Résolution des chemins absolus
        } else if (stats.isFile() && inputPath.endsWith(".gift")) {
            // Si c'est un fichier unique, retourner un tableau avec ce fichier
            console.log(chalk.red(`Fichier unique trouvé : ${inputPath}`));
            return [path.resolve(inputPath)];
        } else {
            console.error("Le chemin fourni n'est ni un fichier .gift valide ni un dossier.");
            return [];
        }
    } catch (err) {
        console.error("Erreur lors de l'accès au chemin :", err);
        return [];
    }
}

// Fonction pour vérifier les doublons dans les questions
function addUniqueQuestions(existingQuestions, newQuestions) {
    if (!Array.isArray(newQuestions)) {
        console.warn("addUniqueQuestions: 'newQuestions' is not un tableau valide. Ignoré.");
        return;
    }

    newQuestions.forEach(newQuestion => {
        if (!existingQuestions.some(existing =>
            existing.title === newQuestion.title &&
            existing.question === newQuestion.question
        )) {
            existingQuestions.push(newQuestion);
        }
    });
}

// Fonction pour traiter chaque fichier
function processGiftFiles(filePaths) {
    let allQuestions = [];

    filePaths.forEach(filePath => {
        if (processedFiles.includes(filePath)) {
            console.log(`Skipping already processed file: ${filePath}`);
            return;
        }

        const content = fs.readFileSync(filePath, "utf8"); // Lit le contenu du fichier
        const questions = parser.processFile(content); // Appelle la méthode processFile
        addUniqueQuestions(allQuestions, questions); // Ajoute les questions sans doublons
        processedFiles.push(filePath); // Marque le fichier comme traité
    });

    return allQuestions.length > 0 ? allQuestions : [];
}

// Fonction principale
async function parse(inputPath, outputFile = "./data/questions.json") {
    try {
        const giftFiles = getGiftFilePaths(inputPath); // Récupère les fichiers GIFT (dossier ou fichier)
        if (giftFiles.length === 0) {
            console.log("Aucun fichier GIFT trouvé.");
            return;
        }

        const allQuestions = processGiftFiles(giftFiles);
        console.log("Toutes les questions ont été traitées.");

        if (allQuestions.length === 0) {
            console.log("Aucune question trouvée dans les fichiers GIFT.");
            return;
        } else {
            console.log(`Total unique questions found: ${allQuestions.length}`);
            // Écriture dans le fichier JSON
            fs.writeFileSync(outputFile, JSON.stringify(allQuestions, null, 2), "utf8");
        }
        console.log(`Toutes les questions ont été écrites dans ${outputFile}`);
        return allQuestions;
    } catch (err) {
        console.error("Une erreur est survenue lors du parsing :", err);
    }
}

module.exports = {
    parse,
};
