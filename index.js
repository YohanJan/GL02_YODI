// const examSimulator = require("./src/examSimulator");
import chalk from 'chalk';
import inquirer from 'inquirer';

async function mainMenu() {
    console.log(chalk.blue("Bienvenue dans l'outil SRYEM GIFT Utility"));

    const { action } = await inquirer.prompt([
        {
            type: "list",
            name: "action",
            message: "Que voulez-vous faire ?",
            choices: [
                "Rechercher des questions",
                "Visualiser une question",
                "Créer un examen GIFT",
                "Générer une VCard",
                "Simuler un examen",
                "Quitter",
            ],
        },
    ]);

    switch (action) {
        case "Rechercher des questions":
            await questionManager.searchQuestions();
            break;
        case "Quitter":
            console.log(chalk.green("Au revoir !"));
            process.exit(0);
    }

    await mainMenu();
}

mainMenu();