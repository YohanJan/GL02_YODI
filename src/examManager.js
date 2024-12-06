// Importer les modules
const path = require("path");
const fs = require("fs-extra");
const chalk = require('chalk');
const inquirer = require("inquirer");
const vega = require('vega');
const vegalite = require('vega-lite');
const puppeteer = require('puppeteer');
const readline = require("readline");
const parser = require("./processGiftFiles");

const examSet = new Set();
const limit = [15, 20]

const questionsPath = path.join(__dirname, "../data/questions.json");
// Dossier contenant les fichiers d'examen
const examsPath = path.join(__dirname, '../data');
// Variables globales pour stocker les profils
let averageProfileData;
let examProfile;

// async function researchQuestions(questions, keyword, categorie) {
//     console.log("Recherche de questions...");
//     try {
//         // Chargement et affichage des questions de la banque
//         questions = await fs.readJSON(questionsPath);
//         console.log("Questions en notre possession : ", questions);
//         const keywordLower = keyword.toLowerCase();
//         return questions.filter(question => {
//             const contientKeyword = question.text.toLowerCase().includes(keywordLower);
//             const memeCategorie = categorie ? question.categorie === categorie : true;
//             return contientKeyword && memeCategorie;});
//         } catch (error) {
//             console.error(chalk.red("Erreur lors de la recherche :"), error);
//             return null;
//         }
// }

async function selectQuestion() {
    console.log("Affichage d'une question sélectionnée...");
    try {
        // Charger les questions depuis le fichier JSON
        const questions = await fs.readJSON(questionsPath);

        if (questions.length === 0) {
            console.log(chalk.red("La banque de questions est vide."));
            return null;
        }

        // Afficher une liste des questions pour sélection
        const { selectedQuestion } = await inquirer.prompt([
            {
                type: "list",
                name: "selectedQuestion",
                message: "Sélectionnez une question à afficher :",
                choices: questions.map((q, index) => ({
                    name: isQuestionInSet(examSet, q)
                        ? chalk.red(`${index + 1}. ${q.title} [${q.type}]`)
                        : `${index + 1}. ${q.title} [${q.type}]`,
                    value: q, // On passe directement l'objet question sélectionné
                })),
            },
        ]);

        return selectedQuestion;
    } catch (error) {
        console.error(chalk.red("Erreur lors du chargement des questions :"), error);
        return null;
    }
}
async function selectNumberOfQuestions() {
    while (true) {
        const { numberOfQuestions } = await inquirer.prompt([
            {
                type: "number",
                name: "numberOfQuestions",
                message: `Combien de questions souhaitez-vous ajouter à l'examen ? (entre ${limit[0]} et ${limit[1]})`,
                validate: (value) => {
                    if (value >= limit[0] && value <= limit[1]) {
                        return true;
                    }
                    return `Veuillez entrer un nombre entre ${limit[0]} et ${limit[1]}.`;
                },
            },
        ]);

        if (numberOfQuestions >= limit[0] && numberOfQuestions <= limit[1]) {
            return numberOfQuestions;
        } else {
            console.log(chalk.red("Nombre invalide. Réessayez."));
        }
    }
}
async function makeExamGift() {
    const numberOfQuestions = await selectNumberOfQuestions();

    while (examSet.size < numberOfQuestions) {
        const selectedQuestion = await selectQuestion();
        if (selectedQuestion) {
            // Vérification avant d'ajouter l'élément pour éviter les doublons
            if (!isQuestionInSet(examSet, selectedQuestion)) {
                examSet.add(selectedQuestion);
                console.log(chalk.green("Question ajoutée à l'examen : ") + selectedQuestion.title);
            } else {
                console.log(chalk.yellow("La question est déjà présente dans l'examen."));
            }
        }

        console.log(
            chalk.blue(`Nombre de questions ajoutées : ${examSet.size}/${numberOfQuestions}`)
        );
    }

    console.log(chalk.green("\nToutes les questions ont été ajoutées à l'examen !"));
    console.log(
        chalk.blue("\nQuestions sélectionnées :"),
        Array.from(examSet).map((q) => q.title).join(", ")
    );

    // Si nécessaire, vous pouvez ensuite générer un fichier GIFT ici
    await generateGiftFile(examSet);
}
async function generateGiftFile(examSet) {
    if (examSet.size === 0) {
        console.log(chalk.red("Aucune question sélectionnée pour générer le fichier GIFT."));
        return;
    }

    // Chemin du fichier GIFT
    const dirPath = path.join(process.cwd(), 'data');
    const giftFilePath = path.join(
        dirPath,
        "exam - " + new Date().toISOString().replace(/[:.]/g, "-") + ".gift"
    );

    // Transformation des questions en format GIFT
    const giftContent = Array.from(examSet)
        .map((question, index) => {
            switch (question.type) {
                case "multiple_choice":
                    const multipleChoiceOptions = question.options
                        .map((option) => (option.is_correct ? `=${option.text}` : `~${option.text}`))
                        .join(" ");
                    return `::${question.title}:: ${question.question} { ${multipleChoiceOptions} }`;

                case "true_false":
                    return `::${question.title}:: ${question.question} { ${question.answer ? "T" : "F"} }`;

                case "short_answer":
                    const shortAnswers = question.correct_answers.map((ans) => `=${ans}`).join(" ");
                    return `::${question.title}:: ${question.question} { ${shortAnswers} }`;

                case "matching":
                    const matchingPairs = question.pairs
                        .map((pair) => `=${pair.term} -> ${pair.match}`)
                        .join(" ");
                    return `::${question.title}:: ${question.question} { ${matchingPairs} }`;

                case "cloze":
                    const clozeQuestion = question.answers.reduce((formatted, answer, index) => {
                        return formatted.replace(`(${index + 1})`, `{=${answer}}`);
                    }, question.question);
                    
                        return `::${question.title}:: ${clozeQuestion}`;

                case "numerical":
                    return `::${question.title}:: ${question.question} {#${question.correct_answer}:${question.tolerance}}`;

                case "multiple_choice_feedback":
                    const feedbackOptions = question.options.map((option) => {
                        const prefix = option.is_correct ? "=" : "~";
                        return `${prefix}${option.text}#${option.feedback}`;
                    }).join(" ");
                    return `::${question.title}:: ${question.question} { ${feedbackOptions} }`;
                case "open":
                    return `::${question.title}:: ${question.question} {}`;
                default:
                    console.log(chalk.yellow(`Type de question non pris en charge : ${question.type}`));
                    return null;
            }
        })
        .filter((content) => content !== null) // Filtrer les types inconnus
        .join("\n\n");

    try {
        await fs.ensureDir(dirPath);

        // Écriture du fichier GIFT
        await fs.writeFile(giftFilePath, giftContent, "utf8");
        console.log(chalk.green(`Fichier GIFT généré avec succès : ${giftFilePath}`));
    } catch (error) {
        console.error(chalk.red("Erreur lors de la génération du fichier GIFT :"), error);
    }
}

// Fonction pour afficher les examens disponibles
function listExams() {
return fs.readdirSync(examsPath).filter(file => (file.startsWith('exam')&file.endsWith('.gift')));}


// Fonction pour lire un fichier et charger les questions
function loadExam(fileName) {  
    const filePath = path.join(examsPath, fileName);
    const content = fs.readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(content);
  } catch {
    console.warn("Fichier non JSON détecté. Tentative de parser comme GIFT...");
  }
}

// Fonction pour poser une question à l'utilisateur
function askQuestion(rl, question) {
  return new Promise(resolve => {rl.question(question, resolve);});
}
async function simulateExam() {
    const exams = listExams();
  
    if (exams.length === 0) {
      console.log("Aucun examen disponible.");
      return null;
    }
  
    // Afficher la liste des examens
    console.log("Examens disponibles :");
    exams.forEach((exam, index) => {
      console.log(`${index + 1}. ${exam}`);
    });
  
    // Choisir un examen
  const { selectedExam } = await inquirer.prompt([
      {
          type: "list",
          name: "selectedExam",
          message: "Sélectionnez un examen à simuler :",
          choices: exams.map((exam, index) => ({
              name: `${index + 1}. ${exam}`,
              value: exam, // On passe directement l'objet question sélectionné
          })),
      },
  ]);
 
    // Charger l'examen
    //const questions = loadExam(selectedExam);
    questions = await parser.parse("./data/"+selectedExam, "./data/parsedExam.json");
    questions = await fs.readJSON(questionsPath);
  
    if (!questions || questions.length === 0) {
      console.log("L'examen sélectionné est vide ou invalide.");
      return;
    }
  
    // Simuler l'examen
    console.log("Début de la simulation :\n");
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
    let score = 0;
  
    for (const [index, question] of questions.entries()) {
        if (question.type === "multiple_choice" || question.type === "multiple_choice_feedback") {
            console.log(chalk.blue(`Question ${index + 1}: ${question.question}`));
            console.log("Options :");
            question.options.forEach((option, index) => {
                console.log(`  ${index + 1}. ${option.text}`);
            });
        } else if (question.type === "true_false") {
            console.log(chalk.blue(`Question ${index + 1}: ${question.question}`));
            console.log("Répondez par vrai ou faux");
    } else if (question.type === "matching") {
        console.log(chalk.blue(`Question ${index + 1}: ${question.question}`));
        question.pairs.forEach((pairs) => {
            console.log(`${pairs.term}`);
            console.log(`${pairs.match}`);
        });
        console.log("Ecrire les réponses sous cette forme: termA, repA; termB, repB; termC, repC");
    }  else {
        console.log(chalk.blue(`Question ${index + 1}: ${question.question}`));
    }
      const answer = await askQuestion(rl, "Votre réponse : ");
      let correctAnswer;
      switch (question.type) {
        case "multiple_choice":
            correctAnswer = question.options.filter(option => option.is_correct).map(option => option.text);
            break;
        case "true_false":
            correctAnswer = question.answer ? "vrai" : "faux";
            break;
        case "short_answer":
            if (question.correct_answers.includes(answer) === true) {
                score++;
                console.log("Bonne réponse!");
                console.log(`score= ${score}`);
            } else {
                console.log("Mauvaise réponse! La bonne réponse était : " + question.correct_answers);
                console.log(`score= ${score}`);
            }
            break;
        case "matching":
            correctAnswer = question.pairs; 
            const response = answer.split(";").map(pair => {
            const [term, match] = pair.split(",").map(item => item.trim()); // Séparer chaque paire en termes et réponses
            return { term, match };
            });

            // Comparer chaque élément de la réponse avec l'élément correct
            let correct = true;
            for (let i = 0; i < correctAnswer.length; i++) {
                if (correctAnswer[i].term.toLowerCase() !== response[i].term.toLowerCase() || 
                    correctAnswer[i].match.toLowerCase() !== response[i].match.toLowerCase()) {
                    correct = false;
                    break; // Si une paire est incorrecte, on arrête la comparaison
                }
            }

            if (correct) {
                console.log("Bonne réponse !");
                score++;
            } else {
                console.log("Mauvaise réponse !");
            }

            console.log(`score= ${score}`);
            break;
        case "cloze":
            correctAnswer = question.answers;
            const reponse = answer.toString().split(",").map(item => item.trim().toLowerCase());
            const isCorrect = correctAnswer.every((ans, idx) => 
                reponse[idx] && reponse[idx] === ans.toLowerCase()
            );
            if (isCorrect) {
                console.log("Bonne réponse!");
                score++;
                console.log(`score= ${score}`);
            } else {
                console.log("Mauvaise réponse!");
                console.log(`La bonne réponse était : ${correctAnswer.join(", ")}`);
                console.log(`score= ${score}`);
            }
            break;
        case "numerical":
            const tolerance = question.tolerance;
            const correctValue = question.correct_answer;
            // Calculer les bornes valides pour la tolérance
            const lowerBound = correctValue - tolerance;
            const upperBound = correctValue + tolerance;
            // Vérifier si la réponse est dans la plage acceptable
            const answerNumeric = parseFloat(answer);  // Convertir la réponse en nombre

            if (answerNumeric >= lowerBound && answerNumeric <= upperBound) {
                score++;
                console.log("Bonne réponse !");
            } else {
            console.log("Mauvaise réponse !");
            }

            console.log(`score= ${score}`);
            break;
        case "multiple_choice_feedback":
            correctAnswer = question.options
                    .filter(option => option.is_correct)
                    .map(option => option.text);
                break;
        default : 
            correctAnswer = null;
            break;
      }

      if(question.type != "matching" && question.type != "cloze") {
        if(correctAnswer && answer) {
        if(!answer) {
            console.log("Réponse invalide. Veuillez entrer une réponse.");
        } else if (correctAnswer.toString().toLowerCase() === answer.toString().toLowerCase().trim()) {
            console.log("Bonne réponse !");
            score++;
            console.log(`score= ${score}`);
      } else {
            console.log(`Mauvaise réponse. La bonne réponse était : ${correctAnswer}`);
      }
    console.log();
    } }
}
    console.log(`Examen terminé ! Votre score : ${score}/${questions.length}`);
    rl.close();
}
// Initialisation du profil d'examen
function initProfile() {
    profile = {
        cloze: { count: 0, questions: [] },
        matching: { count: 0, questions: [] },
        multiple_choice: { count: 0, questions: [] },
        numerical: { count: 0, questions: [] },
        short_answer: { count: 0, questions: [] },
        true_false: { count: 0, questions: [] },
        multiple_choice_feedback: { count: 0, questions: [] },
        open: { count: 0, questions: [] },
    };
}
// Reconnaissance et mise à jour du type de question
function recognizeType(question) {
    const questionTitle = question.title; // Titre de la question
    if (profile[question.type]) {
        profile[question.type].questions.push(questionTitle); // Ajoute la question au type
        profile[question.type].count++; // Incrémente le compteur pour ce type
    } else {
        console.log(chalk.red(`Type de question inconnu : ${question.type}`));
    }
}
// Analyse du fichier pour définir le profil
async function analyzeFile(filePath, outputPath) {
    console.log(`Analyse du fichier : ${filePath}`);
    console.log(`Chemin d'entrée : ${filePath}`);
    console.log(`Chemin de sortie : ${outputPath}`);

    try {
        // Réinitialiser le profil avant analyse
        initProfile();

        // Parser le fichier
        const parsedData = await parser.parse(filePath, outputPath);
        if (!parsedData) {
            console.log(chalk.red("Le fichier n'a pas pu être parsé ou est vide."));
            return null;
        }

        console.log(`Questions trouvées dans ${filePath} : ${parsedData.length}`);
        
        // Analyser les questions
        parsedData.forEach(recognizeType);

        // Écrire les données parsées dans le fichier
        fs.writeFileSync(outputPath, JSON.stringify(parsedData, null, 2), "utf8");
        console.log(`Toutes les questions ont été écrites dans ${outputPath}`);
        console.log(chalk.green("Données parsées avec succès."));

        // Afficher les résultats par type
        console.log(chalk.cyan("Profil d'examen :"));
        const profileData = prepareProfile(profile);
        console.log(profileData);

        // Retourner le profil pour d'autres usages
        return profile;
    } catch (error) {
        console.error(chalk.red("Erreur lors de l'analyse du fichier :"), error);
        return null;
    }
}
// Préparation des données du profil pour Vega-Lite
function prepareProfile(profile) {
    const data = [];
    for (const [type, { count }] of Object.entries(profile)) {
        data.push({ type, count });
    }
    return data;
}
// Génération et sauvegarde du graphique en HTML
async function renderChartToHtml(spec) {
    const vegaView = new vega.View(vega.parse(vegalite.compile(spec).spec))
        .renderer('none')
        .initialize();
    const svg = await vegaView.toSVG(); // Génération SVG à partir du graphique

    // Sauvegarde du SVG dans un fichier HTML temporaire
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><title>Chart</title></head>
        <body>${svg}</body>
        </html>
    `;
    const htmlPath = './chart.html';
    await fs.writeFile(htmlPath, htmlContent, 'utf8');
    console.log("Graphique HTML généré avec succès :", htmlPath);
}
// Génération et sauvegarde du graphique en PDF
async function renderChartToPdf() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(`file://${process.cwd()}/chart.html`, { waitUntil: 'load' });
    const pdfPath = `./data/chart-${new Date().toISOString().replace(/[:.]/g, "-")}.pdf`;
    await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
    });
    await browser.close();
    console.log("Graphique PDF généré avec succès :", pdfPath);
}
// Sélection d'un fichier pour analyse
async function selectFile(directory) {
    try {
        // Lister les fichiers dans le répertoire
        const files = await fs.readdir(directory);

        // Vérifier quels éléments sont des fichiers
        const fileList = [];
        for (const file of files) {
            const filePath = path.join(directory, file);
            const stat = await fs.stat(filePath);
            if (stat.isFile()) {
                fileList.push(file);
            }
        }

        // Si aucun fichier n'est trouvé
        if (fileList.length === 0) {
            console.log("Aucun fichier trouvé dans ce répertoire.");
            return null;
        }

        // Afficher les fichiers pour sélection
        const { selectedFile } = await inquirer.prompt([
            {
                type: "list",
                name: "selectedFile",
                message: "Sélectionnez un fichier :",
                choices: fileList,
            },
        ]);

        // Retourner le chemin complet du fichier sélectionné
        return path.join(directory, selectedFile);
    } catch (error) {
        console.error("Erreur lors de la lecture du répertoire :", error);
    }
}
// Menu principal pour l'analyse
async function MenuAnalyze() {
    const directoryPath = path.resolve("./data"); // Chemin des fichiers à analyser
    const parsedExamPath = path.resolve("./data/parsedExam.json"); // Fichier de sortie pour les données parsées

    try {
        // Sélectionner un fichier spécifique
        const filePath = await selectFile(directoryPath);

        // Vérifier si un fichier est sélectionné
        if (!filePath) {
            console.log("Aucun fichier sélectionné. Sortie.");
            return;
        }

        console.log("Fichier sélectionné :", filePath);

        // Vérifier si le chemin sélectionné est un fichier valide
        const stats = await fs.stat(filePath);
        if (!stats.isFile() || !filePath.endsWith(".gift")) {
            console.error("Le fichier sélectionné n'est pas un fichier .gift valide.");
            return;
        }

        // Analyse du fichier
        const analyzedProfile = await analyzeFile(filePath, parsedExamPath);
        if (!analyzedProfile) {
            console.log("Aucune donnée à analyser. Sortie.");
            return;
        }

        // Générer la spécification du graphique
        const spec = {
            $schema: "https://vega.github.io/schema/vega-lite/v5.json",
            description: "Types de questions et leur nombre",
            data: { values: prepareProfile(profile) },
            mark: "bar",
            encoding: {
                x: { field: "type", type: "ordinal", title: "Type de question" },
                y: { field: "count", type: "quantitative", title: "Nombre de questions" },
                color: { field: "type", type: "nominal" },
            },
        };

        // Générer et sauvegarder les graphiques
        await renderChartToHtml(spec);
        await renderChartToPdf();
    } catch (error) {
        console.error("Erreur dans MenuAnalyze :", error);
    }
}
function isQuestionInSet(set, question) {
    return Array.from(set).some(
        (q) => JSON.stringify(q.title) === JSON.stringify(question.title)
    );
}
async function averageProfile(directoryPath) {
    console.log(chalk.cyan("Démarrage de l'analyse pour le profil moyen des examens..."));

    try {
        // Lister les fichiers .gift commençant par "exam"
        const files = await listFiles(directoryPath, '.gift', 'exam');
        if (files.length === 0) {
            console.log(chalk.red("Aucun fichier 'exam*.gift' trouvé dans le répertoire."));
            return null;
        }

        console.log(chalk.green(`Fichiers trouvés : ${files.length}`));

        // Initialiser les accumulateurs pour chaque type
        const aggregateProfile = initProfileAccumulators();

        let fileCount = 0;

        // Analyser chaque fichier
        for (const file of files) {
            console.log(chalk.cyan(`Analyse du fichier : ${file}`));

            // Utilisation constante de "./data/parsedExam.json" comme fichier de sortie parsé
            const parsedOutputPath = path.resolve("./data/parsedExam.json");
            const profile = await analyzeFile(file, parsedOutputPath);

            if (profile) {
                accumulateProfile(aggregateProfile, profile);
                fileCount++;
            }
        }

        // Si aucun fichier n'a été analysé correctement
        if (fileCount === 0) {
            console.log(chalk.red("Aucun fichier valide n'a pu être analysé."));
            return null;
        }

        // Calculer les moyennes
        const averageProfile = calculateAverages(aggregateProfile, fileCount);

        console.log(chalk.green("Profil moyen des examens :"));
        console.log(averageProfile);

        return averageProfile;
    } catch (error) {
        console.error(chalk.red("Erreur lors de l'analyse pour le profil moyen :"), error);
        return null;
    }
}
// Lister les fichiers avec une extension donnée dans un répertoire, et filtrer par préfixe
async function listFiles(directoryPath, extension, prefix) {
    try {
        const files = await fs.readdir(directoryPath);
        return files
            .filter((file) => file.endsWith(extension) && file.startsWith(prefix)) // Filtrer par extension et préfixe
            .map((file) => path.join(directoryPath, file));
    } catch (error) {
        console.error(chalk.red("Erreur lors de la lecture des fichiers :"), error);
        return [];
    }
}
// Initialiser les accumulateurs pour les profils
function initProfileAccumulators() {
    return {
        cloze: 0,
        matching: 0,
        multiple_choice: 0,
        numerical: 0,
        short_answer: 0,
        true_false: 0,
        multiple_choice_feedback: 0,
        open: 0,
    };
}
// Ajouter les données d'un profil à l'accumulateur
function accumulateProfile(accumulator, profile) {
    for (const [type, { count }] of Object.entries(profile)) {
        if (accumulator[type] !== undefined) {
            accumulator[type] += count;
        }
    }
}
// Calculer les moyennes pour chaque type de question
function calculateAverages(accumulator, fileCount) {
    const averages = {};
    for (const [type, count] of Object.entries(accumulator)) {
        averages[type] = count / fileCount;
    }
    return averages;
}
async function compareExamToAverage(directoryPath) {
    console.log(chalk.blue("Comparaison d'un examen avec le profil moyen..."));

    try {
        // Réinitialiser les variables globales
        averageProfileData = {};
        examProfile = {};

        // Calcul du profil moyen
        const average = await averageProfile(directoryPath);
        if (!average) {
            console.log(chalk.red("Impossible de calculer le profil moyen. Annulation."));
            return null; // Retourne null en cas d'échec
        }

        console.log(chalk.green("Profil moyen calculé avec succès."));
        console.log(average);

        // Stocke le profil moyen dans la variable globale
        averageProfileData = average;

        // Sélection d'un fichier pour la comparaison
        const filePath = await selectFile(directoryPath, 'gift');
        if (!filePath) {
            console.log(chalk.red("Aucun fichier sélectionné. Annulation."));
            return null;
        }

        console.log(chalk.blue(`Fichier sélectionné pour la comparaison : ${filePath}`));

        // Analyse de l'examen
        const parsedOutputPath = path.resolve("./data/parsedExamComparison.json");
        const rawExamProfile = await analyzeFile(filePath, parsedOutputPath);

        if (!rawExamProfile) {
            console.log(chalk.red("Impossible d'analyser le fichier sélectionné. Annulation."));
            return null;
        }

        // Conversion du profil d'examen
        examProfile = Array.isArray(rawExamProfile)
            ? rawExamProfile.reduce((acc, item) => {
                acc[item.type] = item.count;
                return acc;
            }, {})
            : Object.fromEntries(
                Object.entries(rawExamProfile).map(([key, value]) => [key, value.count])
            );

        console.log(chalk.blue("Profil converti pour la comparaison :"));
        console.log(examProfile);

        // Comparaison des profils
        const comparison = compareProfiles(averageProfileData, examProfile);
        console.log(chalk.blue("Résultats de la comparaison :"));
        console.log(comparison);

        // Retourne les résultats de la comparaison
        return comparison;

    } catch (error) {
        console.error(chalk.red("Erreur lors de la comparaison :"), error);
        return null;
    }
}
function compareProfiles(averageProfileData, examProfile) {
    const results = {};
    const tolerance = 2; // Marge de tolérance de ±2

    for (const [type, averageCount] of Object.entries(averageProfileData)) {
        const examCount = examProfile[type] || 0;
        const lowerBound = averageCount - tolerance;
        const upperBound = averageCount + tolerance;

        if (examCount >= lowerBound && examCount <= upperBound) {
            // Dans la moyenne
            results[type] = chalk.green(`Dans la moyenne avec ${examCount}, avec : ${averageCount.toFixed(2)} pour la moyenne`);
        } else if (examCount > upperBound) {
            // Trop de questions
            results[type] = chalk.red(`Plus de questions que la moyenne avec ${examCount}, contre : ${averageCount.toFixed(2)} pour la moyenne`);
        } else {
            // Pas assez de questions
            results[type] = chalk.yellow(`Moins de questions que la moyenne avec ${examCount}, contre : ${averageCount.toFixed(2)} pour la moyenne`);
        }
    }

    return results;
}
async function comparaisonProfileMoyen(directoryPath) {
    console.log(chalk.cyan("Démarrage de la comparaison avec le profil moyen des examens..."));

    try {
        // Calculer le profil moyen des examens
        const average = await averageProfile(directoryPath);
        if (!average) {
            console.log(chalk.red("Impossible d'extraire le profil moyen. Annulation."));
            return;
        }

        console.log(chalk.green("Profil moyen bien extrait pour graph :"));
        console.log(average);

        // Stocke le profil moyen dans la variable globale profile
        averageProfileData = average;

        // Utiliser la fonction compareExamToAverage pour obtenir les résultats de la comparaison
        const comparisonResults = await compareExamToAverage(directoryPath);

        if (!comparisonResults) {
            console.log(chalk.red("Erreur lors de l'extraction pour graph de la comparaison. Annulation."));
            return;
        }

        console.log(chalk.green("Résultats de la comparaison obtenus avec succès pour graph"));

        // Préparer les données pour le graphique à partir des résultats de la comparaison
        const comparisonData = prepareComparisonData(comparisonResults, averageProfileData);

        if (comparisonData.length === 0) {
            console.log(chalk.red("Aucune donnée valide pour le graphique."));
            return;
        }

        // Spécification pour le graphique
        const spec = {
            $schema: "https://vega.github.io/schema/vega-lite/v5.json",
            description: "Comparaison des types de questions entre l'examen et la moyenne",
            data: {
                values: comparisonData
            },
            mark: "bar",
            encoding: {
                x: { field: "type", type: "ordinal", title: "Type de question" },
                y: { field: "count", type: "quantitative", title: "Nombre de questions" },
                color: { field: "dataset", type: "nominal" },
            },
        };

        // Rendre le graphique en HTML et en PDF
        await renderChartToHtml(spec);
        await renderChartToPdf();

    } catch (error) {
        console.error(chalk.red("Erreur lors de la comparaison et de la création du graphique :"), error);
    }
}
function prepareComparisonData(comparisonResults, averageProfile) {
    const questionTypesOrder = [
        'cloze',
        'matching',
        'multiple_choice',
        'numerical',
        'short_answer',
        'true_false',
        'multiple_choice_feedback',
        'open'
    ];

    const data = [];

    for (const type of questionTypesOrder) {
        if (comparisonResults[type] !== undefined && averageProfile[type] !== undefined) {
            const match = comparisonResults[type].match(/(\d+\.?\d*)/);
            const examCount = match ? parseFloat(match[0]) : 0;

            data.push({ type: `${type}_moyen`, count: averageProfile[type], dataset: "Moyenne" });
            data.push({ type: `${type}_exam`, count: examProfile[type], dataset: "Examen" });
        }
    }

    // Log the final sorted data before returning
    console.log("Données triées pour le graphique : ", data);

    return data;
}

module.exports = {
    makeExamGift, MenuAnalyze, simulateExam, selectQuestion, selectNumberOfQuestions, comparaisonProfileMoyen, generateGiftFile
};


    // // Optionnel : Enregistrez l'examen en fichier GIFT ou JSON
    // const outputPath = path.join(__dirname, "../output/exam.json");
    // await fs.writeJSON(outputPath, exam, { spaces: 2 });
    // console.log(chalk.green(`Examen sauvegardé dans : ${outputPath}`));