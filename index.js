// const examSimulator = require("./src/examSimulator");
const chalk = require('chalk');
const inquirer = require('inquirer');
const questionManager = require('./src/questionMAnager.js');

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
            await questionManager.viewQuestionDisplay();
            break;
        case "Visualiser une question":
            await questionManager.viewQuestionDisplay();
            break;
        case "Quitter":
            console.log(chalk.green("Au revoir !"));
            process.exit(0);
    }

    await mainMenu();
}

mainMenu();