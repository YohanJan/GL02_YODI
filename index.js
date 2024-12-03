// const examSimulator = require("./src/examSimulator");
const chalk = require('chalk');
const inquirer = require('inquirer');
const questionManager = require('./src/questionMAnager.js');
const examManager = require('./src/examManager.js');

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
                "Quitter",
            ],
        },
    ]);

    switch (action) {
        case "Rechercher des questions":
            await questionManager.researchQuestions();
            break;
        case "Visualiser une question":
            await questionManager.viewQuestionDetails();
            break;
        case "Créer un examen GIFT":
            await examManager.makeExamGift();
            break;
        case "Générer une VCard":
            let contact = {
                name : "Gigi",
                surname : "Hadid",
                email : "blabla@utt.fr",
                phone : 678908754
            };
            function generateVCard(contact) {
            const vCard = `BEGIN: VCARD\nVERSION: 4.0\nN: ${contact.name}\nSN: ${contact.surname}\nEMAIL: ${contact.email}\nTEL: ${contact.phone}\nEND: VCARD`
                return vCard;
            }
            break;
        case "Definir un profil d' examen":
            await examManager.MenuAnalyze();
            break;
        case "Quitter":
            console.log(chalk.green("Au revoir !"));
            process.exit(0);
    }

    await mainMenu();
}

mainMenu();