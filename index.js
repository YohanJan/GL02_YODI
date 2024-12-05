// const examSimulator = require("./src/examSimulator");
const chalk = require('chalk');
const inquirer = require('inquirer');
const questionManager = require('./src/questionMAnager.js');
const examManager = require('./src/examManager.js');
const parser = require('./src/processGiftFiles.js')
const path = require("path");

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
                "Definir un profil d' examen",
                "Definir un parser",
                "Quitter",
            ],
        },
    ]);

    switch (action) {
        case "Rechercher des questions":
            // await examManager.test();
            break;
        case "Visualiser une question":
            await questionManager.viewQuestionDetails();
            break;
        case "Créer un examen GIFT":
            await examManager.makeExamGift();
            break;
                
        case "Definir un profil d' examen":
            await examManager.MenuAnalyze();
            break;
        case "Definir un parser":
           await parser.parse("./data/exam - 2024-12-04T17-07-04-353Z.gift","./data/questions.json");
           await parser.parse("./data/exam - 2024-12-04T17-07-04-353Z.gift","./data/questions.json");
           await parser.parse("./data/exam - 2024-12-04T17-10-04-233Z.gift","./data/questions.json");
           await parser.parse("./data/exam - 2024-12-04T17-10-04-233Z.gift","./data/questions.json");
            break;
            
        case "Quitter":
            console.log(chalk.green("Au revoir !"));
            process.exit(0);
    }

    await mainMenu();
}

mainMenu();