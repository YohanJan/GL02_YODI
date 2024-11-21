// Importer les modules
const path = require("path");
const fs = require("fs-extra");
const chalk = require("chalk");
const inquirer = require("inquirer");


const questionsPath = path.join(__dirname, "../data/questions.json");


async function viewQuestion() {
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
                choices: questions.map((q) => ({
                    name: `${q.id}. ${q.question} [${q.type} - ${q.difficulty}]`,
                    value: q.id,
                })),
            },
        ]);

        // Récupérer la question sélectionnée
        const question = questions.find((q) => q.id === selectedId);

        if (question) {
            console.log(chalk.green("\nDétails de la question sélectionnée :"));
            console.log(chalk.blue(`Type         : ${question.type}`));
            console.log(chalk.blue(`Difficulté   : ${question.difficulty}`));
            console.log(chalk.blue(`Question     : ${question.question}`));

            if (question.options) {
                console.log(chalk.blue("Options :"));
                question.options.forEach((option, index) =>
                    console.log(`  ${index + 1}. ${option}`)
                );
            }

            console.log(chalk.blue(`Réponse      : ${question.answer}`));
        } else {
            console.log(chalk.red("Question non trouvée."));
        }
    } catch (error) {
        console.error(chalk.red("Erreur lors du chargement des questions :"), error);
    }
}

module.exports = {
    viewQuestion,
};
