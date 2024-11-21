// Importer les modules
const path = require("path");
const fs = require("fs-extra");
const chalk = require("chalk");
const inquirer = require("inquirer");


const questionsPath = path.join(__dirname, "../data/questions.json");


async function viewQuestionDisplay() {
    console.log("Affichage d'une question sélectionnée...");
    try {
        // Charger les questions
        const questions = await fs.readJSON(questionsPath);

        if (questions.length === 0) {
            console.log(chalk.red("La banque de questions est vide."));
            return;
        }

        // Afficher une liste de questions pour sélection
    const { selectedId } = await inquirer.prompt([
        {
            type: "list",
            name: "selectedId",
            message: "Sélectionnez une question à afficher :",
            choices: questions.map((q, index) => ({
                name: `${index + 1}. ${q.title} [${q.type}]`,
                value: q, // Utilisation de l'index pour identifier les questions
            })),
        },
    ]);

        // Récupérer la question sélectionnée
        const question = questions.find((q) => q === selectedId);

        if (question) {
            viewQuestion(question);
        } else {
            console.log(chalk.red("Question non trouvée."));
        }
    } catch (error) {
        console.error(chalk.red("Erreur lors du chargement des questions :"), error);
    }
}

function viewQuestion(question) {
    console.log("\nDétails de la question sélectionnée :");
            console.log(`Titre : ${question.title}`);
            console.log(`Type : ${question.type}`);
            console.log(chalk.blue(`Question :`+` ${question.question}`));

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
                    // const filledQuestion = question.answers.reduce(
                    //     (text, answer, index) => text.replace(`{${index + 1}}`, answer),
                    //     question.question
                    // );
                    // console.log(filledQuestion);
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

            // if (question.options) {
            //     console.log(chalk.blue("Options :"));
            //     question.options.forEach((option, index) =>
            //         console.log(`  ${index + 1}. ${option}`)
            //     );
            // }

            // console.log(chalk.blue(`Réponse      : ${question.answer}`));
}

module.exports = {
    viewQuestionDisplay,viewQuestion
};
