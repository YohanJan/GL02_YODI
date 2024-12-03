const path = require("path");
const fs = require("fs-extra");
const inquirer = require("inquirer");
const chalk = require("chalk");

const questionsPath = path.join(__dirname, "../data/questions.json");

async function researchQuestions() {
    console.log("Recherche de questions...");
    try {

        //parser to json
        const questions = await fs.readJSON(questionsPath);

        const { keyword } = await inquirer.prompt([
            {
                type: "string",
                name: "keyword",
                message: `Entrer un mot clé de recherche`,
            },
        ]);
    
        const keywordLower = keyword ? keyword.toString().toLowerCase() : "";


        const filteredQuestions = questions.filter(question => question.question.toString().toLowerCase().includes(keywordLower)
        );

        console.log( filteredQuestions.length > 0 ? displayListQuestions(filteredQuestions) : "Question not found" )

        
        } catch (error) {
            console.error(chalk.red("Erreur lors de la recherche :"), error);
            return null;
        }
}
function displayListQuestions(questions) {
    console.log("Liste des questions trouvées :");
    questions.forEach((question, index) => {
        console.log(`${index + 1}. ${question.title} [${question.type}]`);
        console.log(`--> ${question.question.substring(0, 90)} `);
    });
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
                    name: `${index + 1}. ${q.title} [${q.type}]`,
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

function viewQuestion(question) {
    if (!question) {
        console.log(chalk.red("Aucune question à afficher."));
        return;
    }

    console.log("\nDétails de la question sélectionnée :");
    console.log(`Titre : ${question.title}`);
    console.log(`Type : ${question.type}`);
    console.log(chalk.blue(`Question : ${question.question}`));

    switch (question.type) {
        case "multiple_choice":
            console.log("Options :");
            question.options.forEach((option, index) => {
                console.log(
                    `  ${index + 1}. ${option.text} ${
                        option.is_correct ? "(Correcte)" : ""
                    }`
                );
            });
            break;

        case "true_false":
            console.log(`Réponse : ${question.answer ? "Vrai" : "Faux"}`);
            break;

        case "short_answer":
            console.log(
                "Réponses acceptées :",
                question.correct_answers.join(", ")
            );
            break;

        case "matching":
            console.log("Associations :");
            question.pairs.forEach((pair) => {
                console.log(`  ${pair.term} -> ${pair.match}`);
            });
            break;

        case "cloze":
            console.log("Texte avec lacunes :");
            const filledQuestion = question.answers.reduce(
                (text, answer, index) => text.replace(`{${index + 1}}`, answer),
                question.question
            );
            console.log(filledQuestion);
            console.log("Réponses attendues :");
            question.answers.forEach((answer, index) => {
                console.log(`  Lacune ${index + 1} : ${answer}`);
            });
            break;

        case "numerical":
            console.log(
                `Réponse : ${question.correct_answer} ± ${question.tolerance}`
            );
            break;

        case "multiple_choice_feedback":
            console.log("Options avec feedback :");
            question.options.forEach((option, index) => {
                console.log(
                    `  ${index + 1}. ${option.text} ${
                        option.is_correct ? "(Correcte)" : ""
                    } - Feedback: ${option.feedback || "Aucun"}`
                );
            });
            break;

        default:
            console.log("Type de question inconnu.");
    }
}

async function viewQuestionDetails() {
    const selectedQuestion = await selectQuestion();
    if (selectedQuestion) {
        viewQuestion(selectedQuestion);
    }
}
module.exports = {
    researchQuestions,viewQuestionDetails,viewQuestion,selectQuestion
};
