const fs = require("fs");
const path = require("path");

// Charge le GiftParser
const GiftParser = require("./GiftParser"); 

// Dossier contenant les fichiers GIFT
const inputFolder = path.join(process.cwd(), 'data', 'Questions_GIFT');

// Fichier JSON de sortie
const outputFile = path.join(process.cwd(), 'data', 'testQuestions.json');

// Initialisation du GiftParser
const parser = new GiftParser(true); // Paramètre pour afficher le tokenizing

// Liste des fichiers déjà traités
let processedFiles = [];

// Fonction pour lire tous les fichiers du dossier
function readGiftFiles(folderPath) {
    const files = fs.readdirSync(folderPath); // Liste les fichiers dans le dossier
    const giftFiles = files.filter(file => file.endsWith(".gift")); // Filtre les fichiers .gift
    return giftFiles.map(file => path.join(folderPath, file)); // Renvoie les chemins complets
}

// Fonction pour vérifier les doublons dans les questions
function addUniqueQuestions(existingQuestions, newQuestions) {
    if (!Array.isArray(newQuestions)) {
        console.warn("addUniqueQuestions: 'newQuestions' is not a valid array. Skipping.");
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

        console.log(`Processing file: ${filePath}`);
        const content = fs.readFileSync(filePath, "utf8"); // Lit le contenu du fichier
        const questions = parser.processFile(content); // Appelle la méthode processFile
        addUniqueQuestions(allQuestions, questions); // Ajoute les questions sans doublons
        processedFiles.push(filePath); // Marque le fichier comme traité
    });

    return allQuestions;
}

// Fonction principale
function main() {
    try {
        const giftFiles = readGiftFiles(inputFolder);
        if (giftFiles.length === 0) {
            console.log("No GIFT files found in the folder.");
            return;
        }

        const allQuestions = processGiftFiles(giftFiles);

        // Écriture dans le fichier JSON
        fs.writeFileSync(outputFile, JSON.stringify(allQuestions, null, 2), "utf8");
        console.log(`All questions written to ${outputFile}`);
    } catch (err) {
        console.error("An error occurred:", err);
    }
}

// Exécute le script
main();
