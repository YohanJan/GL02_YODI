// Importer les modules
const path = require("path");
const fs = require("fs-extra");
const chalk = require("chalk");
const inquirer = require("inquirer");
const vega = require('vega');
const vegalite = require('vega-lite');
const puppeteer = require('puppeteer');
const readline = require("readline");
const parser = require("./processGiftFiles");

const examSet = new Set();
const limit = [3, 5]

const questionsPath = path.join(__dirname, "../data/questions.json");
// Dossier contenant les fichiers d'examen
const examsPath = path.join(__dirname, '../data');
profile = {}

async function researchQuestions(questions, keyword, categorie) {
    console.log("Recherche de questions...");
    try {
        // Chargement et affichage des questions de la banque
        questions = await fs.readJSON(questionsPath);
        console.log("Questions en notre possession : ", questions);
        const keywordLower = keyword.toLowerCase();
        return questions.filter(question => {
            const contientKeyword = question.text.toLowerCase().includes(keywordLower);
            const memeCategorie = categorie ? question.categorie === categorie : true;
            return contientKeyword && memeCategorie;});
        } catch (error) {
            console.error(chalk.red("Erreur lors de la recherche :"), error);
            return null;
        }
}

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

async function analyze(toAnalyze) {
    try {

        if (toAnalyze.length === 0) {
            console.log(chalk.red("La banque de questions est vide."));
            return null;
        }

        // Analyser les questions pour définir un profil d'examen
        toAnalyze.forEach(recognizeType)
        console.log(chalk.green("Profil d'examen défini avec succès."));
        // console.log(chalk.bgCyan(JSON.stringify(profile, null, 2)));
    } catch (error) {
        console.error(chalk.red("Erreur lors du chargement des questions :"), error);
    }

    
}
async function MenuAnalyze() {
    const directoryPath = path.resolve("./data"); // Utilisation du chemin absolu
    const parsedExamPath = path.resolve("./data/parsedExam.json"); // Fichier de sortie pour les données parsées
    let parsedData = null;
    let analyzedData = null;

    // Réinitialiser le profil avant chaque analyse
    initProfile();

    try {
        // Sélectionner un fichier spécifique
        const filePath = await selectFile(directoryPath, 'gift');
        
        // Vérifier si un fichier est sélectionné
        if (!filePath) {
            console.log("Aucun fichier sélectionné. Sortie.");
            return;
        }

        console.log("Fichier sélectionné :", filePath);

        // Vérifier si le chemin sélectionné est un fichier valide
        if (!fs.existsSync(filePath)) {
            console.error("Le fichier sélectionné n'existe pas.");
            return;
        }

        const stats = fs.statSync(filePath);
        if (!stats.isFile() || !filePath.endsWith(".gift")) {
            console.error("Le fichier sélectionné n'est pas un fichier .gift valide.");
            return;
        }

        // Parser le fichier sélectionné
        parsedData = await parser.parse(filePath, parsedExamPath);
        if (!parsedData) {
            console.log("Aucune donnée à analyser. Sortie.");
            return;
        }

        // Écrire les données parsées dans parsedExam.json
        fs.writeFileSync(parsedExamPath, JSON.stringify(parsedData, null, 2), "utf8");
        console.log(`Données parsées écrites avec succès dans ${parsedExamPath}.`);

        // Analyser les questions pour définir un profil d'examen
        analyzedData = await analyze(parsedData);

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

        console.log(prepareProfile(profile));

        // Rendre le graphique en HTML et PDF
        await renderChartToHtml(spec);
        console.log("Graphique HTML généré avec succès.");

        await renderChartToPdf(spec);
        console.log("Graphique PDF généré avec succès.");
    } catch (error) {
        console.error("Erreur dans MenuAnalyze :", error);
    }
}

// Render the chart to an HTML file
async function renderChartToHtml(spec) {
    const vegaView = new vega.View(vega.parse(vegalite.compile(spec).spec))
        .renderer('none')
        .initialize();
    const svg = await vegaView.toSVG(); // Generate SVG from the chart

    // Save SVG to a temporary HTML file
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><title>Chart</title></head>
        <body>${svg}</body>
        </html>
    `;
    const htmlPath = './chart.html';
    await fs.writeFile(htmlPath, htmlContent, 'utf8');


}
// Render the chart to a PDF file
async function renderChartToPdf() {
        // Step 4: Convert the HTML to a PDF using Puppeteer
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(`file://${process.cwd()}/chart.html`, { waitUntil: 'load' });
        await page.pdf({
            path: './data/chart '+ new Date().toISOString().replace(/[:.]/g, "-") +'.pdf',
            format: 'A4',
            printBackground: true,
        });
        await browser.close();
    
        console.log("PDF generated: chart.pdf");
}
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

//prepare profile for vegalite
function prepareProfile(profile) {
    const data = [];
    for (const [type, { count }] of Object.entries(profile)) {
        data.push({ type, count });
    }
    return data;
}
function isQuestionInSet(set, question) {
    return Array.from(set).some(
        (q) => JSON.stringify(q.title) === JSON.stringify(question.title)
    );
}
function recognizeType(question) {
    const toAdd = question.title;
    if (profile[question.type]) {
        profile[question.type].questions.push(toAdd); // Ajoute la question
        profile[question.type].count++; // Incrémente le compteur
    } else {
        console.log(chalk.red(`Type de question inconnu : ${question.type}`));
    }
}
function initProfile(){
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
// Fonction pour réinitialiser les variables de stockage
function initializeProfileData() {
    return {
        cloze: { count: 0 },
        matching: { count: 0 },
        multiple_choice: { count: 0 },
        numerical: { count: 0 },
        short_answer: { count: 0 },
        true_false: { count: 0 },
        multiple_choice_feedback: { count: 0 },
        open: { count: 0 }
    };
}

// Fonction pour analyser un fichier d'examen et mettre à jour le profil accumulé
async function analyzeExamFile(filePath, profileData) {
    console.log(chalk.green(`Traitement du fichier : ${filePath}`));

    const parsedExamPath = path.resolve("./data/parsedExam.json"); // Chemin de sortie pour les données parsées
    const parsedData = await parser.parse(filePath, parsedExamPath);
    if (!parsedData) {
        console.log(chalk.red(`Erreur lors du parsing du fichier : ${filePath}`));
        return null;
    }

    // Écrire les données parsées dans parsedExam.json
    fs.writeFileSync(parsedExamPath, JSON.stringify(parsedData, null, 2), "utf8");
    console.log(`Données parsées écrites avec succès dans ${parsedExamPath}.`);

    // Analyser les questions pour définir le profil d'examen
    await analyze(parsedData);

    // Mettre à jour le profil accumulé
    for (const [type, data] of Object.entries(profile)) {
        if (profileData[type]) {
            profileData[type].count += data.count;
        }
    }

    return profileData;
}

// Fonction pour calculer le profil moyen à partir des données collectées
function calculateAverageProfile(profileData, numExams) {
    const averageProfile = {};
    for (const [type, data] of Object.entries(profileData)) {
        averageProfile[type] = { count: Math.round(data.count / numExams) };
    }
    return averageProfile;
}

// Fonction principale pour comparer le profil moyen à un examen spécifique
async function compareExamProfile() {
    console.log(chalk.blue("=== Comparaison d'un examen avec le profil moyen des examens ==="));

    const directoryPath = path.resolve("./data");
    const examFiles = fs.readdirSync(directoryPath).filter(file => file.startsWith("exam") && file.endsWith(".gift"));

    if (examFiles.length === 0) {
        console.log(chalk.red("Aucun fichier d'examen trouvé dans le dossier ./data."));
        return;
    }

    console.log(chalk.green(`Fichiers d'examen détectés : ${examFiles.join(", ")}`));

    let profileData = initializeProfileData();
    let numExams = 0;

    try {
        // Partie 1 : Analyse de tous les fichiers d'examen pour calculer le profil moyen
        for (const file of examFiles) {
            const filePath = path.join(directoryPath, file);
            profileData = await analyzeExamFile(filePath, profileData);
            if (profileData) {
                numExams++;
            }
        }

        if (numExams === 0) {
            console.log(chalk.red("Aucun profil valide n'a été généré."));
            return;
        }

        // Calcul du profil moyen
        const averageProfile = calculateAverageProfile(profileData, numExams);
        console.log(chalk.green("Profil moyen généré avec succès :"));
        console.log(chalk.bgCyan(JSON.stringify(averageProfile, null, 2)));

        // Partie 2 : Sélection d'un fichier d'examen à comparer
        console.log(chalk.blue("Sélectionnez un fichier d'examen à comparer au profil moyen."));
        const selectedExam = await selectFile(directoryPath, "gift");
        if (!selectedExam || !selectedExam.startsWith("exam")) {
            console.log(chalk.red("Fichier non valide ou non sélectionné. Opération annulée."));
            return;
        }

        console.log(chalk.green(`Fichier d'examen sélectionné : ${selectedExam}`));
        initProfile(); // Réinitialisation avant l'analyse du fichier sélectionné

        const parsedSelectedExamPath = path.resolve(`./data/parsedSelectedExam.json`);
        const parsedSelectedExam = await parser.parse(selectedExam, parsedSelectedExamPath);
        if (!parsedSelectedExam) {
            console.log(chalk.red("Impossible de parser le fichier d'examen sélectionné."));
            return;
        }

        // Écrire les données parsées dans parsedSelectedExam.json
        fs.writeFileSync(parsedSelectedExamPath, JSON.stringify(parsedSelectedExam, null, 2), "utf8");
        console.log(`Données parsées écrites avec succès dans ${parsedSelectedExamPath}.`);

        await analyze(parsedSelectedExam); // Analyse des données du fichier sélectionné
        const selectedExamProfile = { ...profile };

        console.log(chalk.green("Profil de l'examen sélectionné généré avec succès :"));
        console.log(chalk.bgCyan(JSON.stringify(selectedExamProfile, null, 2)));

        // Génération du graphique de comparaison
        console.log(chalk.blue("Génération du graphique de comparaison..."));

        const chartData = [];
        for (const [type, averageData] of Object.entries(averageProfile)) {
            const selectedData = selectedExamProfile[type] || { count: 0 };
            chartData.push({ type, category: "Profil Moyen", count: averageData.count });
            chartData.push({ type, category: "Examen Sélectionné", count: selectedData.count });
        }

        const spec = {
            $schema: "https://vega.github.io/schema/vega-lite/v5.json",
            description: "Comparaison des profils de types de questions",
            data: { values: chartData },
            mark: "bar",
            encoding: {
                x: { field: "type", type: "ordinal", title: "Type de question" },
                y: { field: "count", type: "quantitative", title: "Nombre de questions" },
                color: { field: "category", type: "nominal", title: "Catégorie" },
            },
        };

        await renderChartToHtml(spec);
        console.log(chalk.green("Graphique HTML généré avec succès."));

        await renderChartToPdf(spec);
        console.log(chalk.green("Graphique PDF généré avec succès."));
    } catch (error) {
        console.error(chalk.red("Erreur dans compareExamProfile :"), error);
    }
}


module.exports = {
    makeExamGift, MenuAnalyze, simulateExam, compareExamProfile
};


    // // Optionnel : Enregistrez l'examen en fichier GIFT ou JSON
    // const outputPath = path.join(__dirname, "../output/exam.json");
    // await fs.writeJSON(outputPath, exam, { spaces: 2 });
    // console.log(chalk.green(`Examen sauvegardé dans : ${outputPath}`));