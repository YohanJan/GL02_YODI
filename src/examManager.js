// Importer les modules
const path = require("path");
const fs = require("fs-extra");
const chalk = require("chalk");
const inquirer = require("inquirer");
const vega = require('vega');
const vegalite = require('vega-lite');
const puppeteer = require('puppeteer');

const examSet = new Set();
const limit = [3, 5]

const questionsPath = path.join(__dirname, "../data/questions.json");
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
                    return `::Question ${index + 1}:: ${question.question} { ${multipleChoiceOptions} }`;

                case "true_false":
                    return `::Question ${index + 1}:: ${question.question} { ${question.answer ? "T" : "F"} }`;

                case "short_answer":
                    const shortAnswers = question.correct_answers.map((ans) => `=${ans}`).join(" ");
                    return `::Question ${index + 1}:: ${question.question} { ${shortAnswers} }`;

                case "matching":
                    const matchingPairs = question.pairs
                        .map((pair) => `=${pair.term} -> ${pair.match}`)
                        .join(" ");
                    return `::Question ${index + 1}:: ${question.question} { ${matchingPairs} }`;

                case "cloze":
                    return `::Question ${index + 1}:: ${question.question}`;

                case "numerical":
                    return `::Question ${index + 1}:: ${question.question} {#${question.correct_answer}:${question.tolerance}}`;

                default:
                    console.log(chalk.yellow(`Type de question inconnu : ${question.type}`));
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
async function analyze(toAnalyze) {
    try {
        // Charger les questions depuis le fichier JSON
        const questions = await fs.readJSON(toAnalyze);

        if (questions.length === 0) {
            console.log(chalk.red("La banque de questions est vide."));
            return null;
        }

        // Analyser les questions pour définir un profil d'examen
        questions.forEach(recognizeType)
        console.log(chalk.green("Profil d'examen défini avec succès."));
        // console.log(chalk.bgCyan(JSON.stringify(profile, null, 2)));
    } catch (error) {
        console.error(chalk.red("Erreur lors du chargement des questions :"), error);
    }

    
}
async function MenuAnalyze() {
    const directoryPath = path.join(__dirname, "../data"); // Remplacez par le répertoire cible
    await selectFile(directoryPath).then((filePath) => {
        if (filePath) {
            console.log("Fichier sélectionné :", filePath);
        }
    });

    initProfile()

    // Analyze the questions to define an exam profile
    await analyze(questionsPath);

    // Generate a chart from the profile
    const spec = {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        description: "Question types and their counts",
        data: { values: prepareProfile(profile) },
        mark: "bar",
        encoding: {
            x: { field: "type", type: "ordinal", title: "Question Type" },
            y: { field: "count", type: "quantitative", title: "Number of Questions" },
            color: { field: "type", type: "nominal" },
        },
    };

    renderChartToHtml(spec).catch((err) => console.error("Error generating Html:", err));
    renderChartToPdf().catch((err) => console.error("Error generating PDF:", err));

// Generate the PDF



    // console.log((path.(__dirname, "../data"))) // a faire
    // console.log((path.join(__dirname, "../data/questions.json").split("\\").reverse())[0] );
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
        (q) => JSON.stringify(q) === JSON.stringify(question)
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
    };
}
module.exports = {
    makeExamGift, MenuAnalyze
};


    // // Optionnel : Enregistrez l'examen en fichier GIFT ou JSON
    // const outputPath = path.join(__dirname, "../output/exam.json");
    // await fs.writeJSON(outputPath, exam, { spaces: 2 });
    // console.log(chalk.green(`Examen sauvegardé dans : ${outputPath}`));