const fs = require("fs");
const path = require("path");

// Charge le GiftParser
const GiftParser = require("./GiftParser"); 


// Initialisation du GiftParser
const parser = new GiftParser(true); // Paramètre pour afficher le tokenizing

// Liste des fichiers déjà traités
let processedFiles = [];

// Fonction pour lire tous les fichiers du dossier
function readGiftFiles(folderPath) {
    let files = [];
    try {
        // List files in the folder
        files = fs.readdirSync(folderPath);
    } catch (err) {
        if (err.code === 'ENOTDIR') {
            // If the path is not a directory, treat it as a single file
            return [folderPath];
        } else {
            console.error("Error reading directory or file:", err);
            return [];
        }
    }

    // Filter and return full paths of .gift files
    const giftFiles = files.filter(file => file.endsWith(".gift")); 
    return giftFiles.map(file => path.resolve(folderPath, file)); // Use path.resolve for absolute paths
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

        // console.log(`Processing file: ${filePath}`);
        const content = fs.readFileSync(filePath, "utf8"); // Lit le contenu du fichier
        const questions = parser.processFile(content); // Appelle la méthode processFile
        addUniqueQuestions(allQuestions, questions); // Ajoute les questions sans doublons
        processedFiles.push(filePath); // Marque le fichier comme traité
    });

    return allQuestions.length > 0 ? allQuestions : [];
}

// Fonction principale
async function parse(inputFolder, outputFile = "../data/questions.json") {
    try {
        const giftFiles = readGiftFiles(inputFolder);
        if (giftFiles.length === 0) {
            console.log("No GIFT files found in the folder.");
            return;
        }

        const allQuestions = processGiftFiles(giftFiles);

        if (allQuestions.length === 0) {
            console.log("No questions to write in the GIFT files.");
            return;
        }
        else {
            console.log(`Total unique questions found: ${allQuestions.length}`);
            // Écriture dans le fichier JSON
            fs.writeFileSync(outputFile, JSON.stringify(allQuestions, null, 2), "utf8");
        }
        console.log(`All questions written to ${outputFile}`);
        return allQuestions
    } catch (err) {
        console.error("An error occurred while parsing :", err);
    }
}


module.exports = {
    parse,
};