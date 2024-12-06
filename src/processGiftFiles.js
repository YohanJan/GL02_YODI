const fs = require("fs");
const path = require("path");
const GiftParser = require("./GiftParser");
const chalk = require("chalk");

// Initialisation du GiftParser
const parser = new GiftParser(true); // Paramètre pour afficher le tokenizing
parser.isInitialized = false; // Ajout de la variable de suivi

// Ajout de la méthode reset pour réinitialiser le GiftParser
parser.reset = function () {
    this.parsedPOI = [];
    this.questionMappings = {};
    this.readingQuestionStorage = {};
    this.errorCount = 0;
    this.isInitialized = true; // Marquer comme initialisé après réinitialisation
    console.log(chalk.green("GiftParser réinitialisé."));
};

// Liste des fichiers déjà traités
let processedFiles = [];

// Fonction pour lire un fichier ou un dossier et obtenir les chemins des fichiers .gift
function getGiftFilePaths(inputPath) {
    try {
        const stats = fs.statSync(inputPath);

        if (stats.isDirectory()) {
            const files = fs.readdirSync(inputPath).filter(file => file.endsWith(".gift"));
            return files.map(file => path.resolve(inputPath, file));
        } else if (stats.isFile() && inputPath.endsWith(".gift")) {
            return [path.resolve(inputPath)];
        } else {
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
        console.warn("addUniqueQuestions: 'newQuestions' n'est pas un tableau valide. Ignoré.");
        return existingQuestions;
    }

    newQuestions.forEach(newQuestion => {
        if (!existingQuestions.some(existing =>
            existing.title === newQuestion.title &&
            existing.question === newQuestion.question
        )) {
            existingQuestions.push(newQuestion);
        }
    });

    return existingQuestions;
}

// Fonction pour traiter les fichiers .gift et collecter les questions
function processGiftFiles(filePaths, existingProcessedFiles = []) {
    let allQuestions = [];
    const processedFiles = [...existingProcessedFiles]; // Copie locale

    // Vérifier si le parser a été réinitialisé
    if (!parser.isInitialized) {
        console.log(chalk.yellow("GiftParser non initialisé. Réinitialisation en cours..."));
        parser.reset();
    }

    filePaths.forEach(filePath => {
        if (processedFiles.includes(filePath)) {
            console.log(`Skipping already processed file: ${filePath}`);
            return;
        }

        console.log(`Traitement du fichier : ${filePath}`);
        const content = fs.readFileSync(filePath, "utf8");
        const questions = parser.processFile(content);

        console.log(`Questions trouvées dans ${filePath} : ${questions.length}`);
        allQuestions = addUniqueQuestions(allQuestions, questions);
        processedFiles.push(filePath);
    });

    return { allQuestions, processedFiles };
}

// Fonction principale de parsing
async function parse(inputPath, outputPath) {
    let processedFiles = []; // Déclaration locale uniquement

    console.log("Chemin d'entrée :", inputPath);
    console.log("Chemin de sortie :", outputPath);

    try {
        const giftFiles = getGiftFilePaths(inputPath);
        if (giftFiles.length === 0) {
            console.log("Aucun fichier GIFT trouvé.");
            return;
        }

        const { allQuestions, processedFiles: newProcessedFiles } =
            processGiftFiles(giftFiles, processedFiles);

        console.log("Toutes les questions ont été traitées.");
        console.log(`Total unique questions trouvées : ${allQuestions.length}`);

        fs.writeFileSync(outputPath, JSON.stringify(allQuestions, null, 2), "utf8");
        console.log(`Toutes les questions ont été écrites dans ${outputPath}`);

        return allQuestions;
    } catch (err) {
        console.error("Une erreur est survenue lors du parsing :", err);
    }
}

module.exports = {
    parse,
};
