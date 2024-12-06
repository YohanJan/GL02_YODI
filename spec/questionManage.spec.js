const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { selectQuestion } = require('../src/questionMAnager');
const { selectNumberOfQuestions, generateGiftFile } = require('../src/examManager');
const parser = require("../src/processGiftFiles");
const questionsPath = path.join(__dirname, '../data/questions.json');
const GiftParser = require("../src/GiftParser");

jest.mock('inquirer');
jest.mock('fs-extra');

describe("Testing researchQuestions function", () => {
    let mockQuestions;
    const researchQuestions = require("../src/questionMAnager");

    beforeAll(() => {
        // Mock data for questions
        mockQuestions = [
            {
                type: "multiple_choice",
                question: "Quel est le résultat de 2 + 2 ?",
                title: "Addition simple",
            },
            {
                type: "short_answer",
                question: "Quelle est la couleur du ciel ?",
                title: "Couleur du ciel",
            },
        ];

        // Mock parser.parse to simulate JSON generation
        parser.parse = jest.fn().mockResolvedValue(path.join(__dirname, "./data/questions.json"));

        // Mock fs.readJSON to return the predefined questions
        fs.readJSON.mockResolvedValue(mockQuestions);
    });

    it("should parse and load questions successfully", async () => {
        // Mock prompt to avoid user interaction
        inquirer.prompt.mockResolvedValue({ keyword: "résultat" });

        // Mock console.log to capture its output
        console.log = jest.fn();

        await researchQuestions.researchQuestions();

        // Assert parser and fs were called
        expect(parser.parse).toHaveBeenCalledWith("./data/Questions_GIFT", "./data/questions.json");

        expect(fs.readJSON).toHaveBeenCalledWith(questionsPath);

        // Assert console.log was called with matching questions
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Quel est le résultat de 2 + 2 ?"));
    });

    it("should return 'Question not found' for unmatched keywords", async () => {
        // Mock prompt for a non-matching keyword
        inquirer.prompt.mockResolvedValue({ keyword: "inexistant" });

        // Mock console.log to capture its output
        console.log = jest.fn();

        await researchQuestions.researchQuestions();

        // Assert "Question not found" is logged
        expect(console.log).toHaveBeenCalledWith("Question not found");
    });

    it("should handle empty keyword input", async () => {
        // Mock prompt with empty keyword
        inquirer.prompt.mockResolvedValue({ keyword: "" });

        // Mock console.log to capture its output
        console.log = jest.fn();

        await researchQuestions.researchQuestions();

        // Assert all questions are displayed when no keyword is provided
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Quel est le résultat de 2 + 2 ?"));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Quelle est la couleur du ciel ?"));
    });
});

describe('selectQuestion', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return a selected question', async () => {
        const mockQuestions = [
            { title: 'Question 1', type: 'multiple_choice' },
            { title: 'Question 2', type: 'true_false' },
        ];

        jest.spyOn(fs, 'readJSON').mockResolvedValue(mockQuestions);
        inquirer.prompt.mockResolvedValue({ selectedQuestion: mockQuestions[1] });

        const selectedQuestion = await selectQuestion();

        expect(selectedQuestion).toEqual(mockQuestions[1]);
        expect(inquirer.prompt).toHaveBeenCalled();
    });

    it('should return null if question bank is empty', async () => {
        jest.spyOn(fs, 'readJSON').mockResolvedValue([]);

        const selectedQuestion = await selectQuestion();

        expect(selectedQuestion).toBeNull();
        expect(inquirer.prompt).not.toHaveBeenCalled();
    });

    it('should handle question loading errors', async () => {
        jest.spyOn(fs, 'readJSON').mockRejectedValue(new Error('Erreur de lecture'));
        console.error = jest.fn();

        const selectedQuestion = await selectQuestion();

        expect(selectedQuestion).toBeNull();
        expect(console.error).toHaveBeenCalledWith(
            chalk.red('Erreur lors du chargement des questions :'),
            expect.any(Error)
        );
    });
});

describe('selectNumberOfQuestions', () => {
    const limit = [15, 20];

    beforeEach(() => {
        jest.clearAllMocks(); // Nettoyer les mocks avant chaque test
    });

    it('should return a valid number within the limit', async () => {
        inquirer.prompt.mockResolvedValue({ numberOfQuestions: 18 }); // Valeur valide simulée

        const numberOfQuestions = await selectNumberOfQuestions();

        expect(numberOfQuestions).toBe(18); // Vérifie que la valeur retournée est correcte
        expect(inquirer.prompt).toHaveBeenCalledWith([
            expect.objectContaining({
                type: 'number',
                name: 'numberOfQuestions',
                message: `Combien de questions souhaitez-vous ajouter à l'examen ? (entre ${limit[0]} et ${limit[1]})`,
                validate: expect.any(Function),
            }),
        ]);
    });

    it('should prompt again if input is invalid', async () => {
        inquirer.prompt
            .mockResolvedValueOnce({ numberOfQuestions: 10 }) // Premier prompt invalide (en dehors de la limite)
            .mockResolvedValueOnce({ numberOfQuestions: 16 }); // Deuxième prompt valide

        const numberOfQuestions = await selectNumberOfQuestions();

        expect(numberOfQuestions).toBe(16); // Vérifie que la valeur finale est correcte
        expect(inquirer.prompt).toHaveBeenCalledTimes(2); // Vérifie que le prompt a été appelé deux fois
    });

    it('should handle edge values correctly', async () => {
        inquirer.prompt
            .mockResolvedValueOnce({ numberOfQuestions: limit[0] }); // Première valeur à la limite basse

        const numberOfQuestions = await selectNumberOfQuestions();

        expect(numberOfQuestions).toBe(limit[0]); // Vérifie que la limite basse est acceptée
        expect(inquirer.prompt).toHaveBeenCalledTimes(1); // Le prompt ne doit être appelé qu'une seule fois
    });

    it('should reject input below the limit and prompt again', async () => {
        inquirer.prompt
            .mockResolvedValueOnce({ numberOfQuestions: 5 }) // En dehors de la limite
            .mockResolvedValueOnce({ numberOfQuestions: limit[1] }); // Valeur valide

        const numberOfQuestions = await selectNumberOfQuestions();

        expect(numberOfQuestions).toBe(limit[1]); // Vérifie que la valeur finale est correcte
        expect(inquirer.prompt).toHaveBeenCalledTimes(2); // Vérifie que le prompt a été appelé deux fois
    });
});

describe('generateGiftFile', () => {
    const mockExamSet = new Set([
        {
            title: 'Question 1',
            type: 'multiple_choice',
            question: 'What is 2+2?',
            options: [
                { text: '4', is_correct: true },
                { text: '3', is_correct: false },
            ],
        },
    ]);

    it('should generate a GIFT file', async () => {
        const ensureDirSpy = jest.spyOn(fs, 'ensureDir').mockResolvedValue();
        const writeFileSpy = jest.spyOn(fs, 'writeFile').mockResolvedValue();

        // Appeler la fonction pour générer le fichier
        await generateGiftFile(mockExamSet);

        // Construire dynamiquement le chemin du fichier attendu avec des barres obliques inverses
        const dirPath = path.join(process.cwd(), 'data');
        // Utiliser une expression régulière pour permettre de capturer un décalage de temps
        const expectedFilePathRegex = new RegExp(
            `^${dirPath.replace(/\\/g, '\\\\')}\\\\exam - \\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}-\\d{3}Z\\.gift$`
        );

        // Vérifier que la fonction a été appelée avec le chemin complet attendu
        expect(ensureDirSpy).toHaveBeenCalled();
        expect(writeFileSpy).toHaveBeenCalledWith(
            expect.stringMatching(expectedFilePathRegex),
            expect.stringMatching(/::Question 1:: What is 2\+2\? { =4 ~3 }/),
            'utf8'
        );
    });

    it('should display a message if no file is generated', async () => {
        console.log = jest.fn();

        await generateGiftFile(new Set());

        expect(console.log).toHaveBeenCalledWith(
            chalk.red('Aucune question sélectionnée pour générer le fichier GIFT.')
        );
    });
});

describe("GiftParser Tests", () => {
    let parser;

    beforeEach(() => {
        parser = new GiftParser(false); // Initialisation sans affichage des tokens
    });

    describe("parseLine", () => {
        it("should parse a multiple-choice question correctly", () => {
            const title = "Question 1";
            const question = "Quel est le résultat de 2+2? {~2 ~3 =4 ~5}";
            const result = parser.parseLine(title, question);

            expect(result).toHaveProperty("type", "multiple_choice");
            expect(result).toHaveProperty("title", "Question 1");
            expect(result.options).toEqual(expect.arrayContaining([
                expect.objectContaining({ text: "4", is_correct: true }),
                expect.objectContaining({ text: "2", is_correct: false })
            ]));
        });

        it("should parse a true/false question correctly", () => {
            const title = "Question 2";
            const question = "La Terre est plate. {TRUE}";
            const result = parser.parseLine(title, question);

            expect(result).toHaveProperty("type", "true_false");
            expect(result).toHaveProperty("answer", true);
        });

        it("should return null for invalid input", () => {
            const result = parser.parseLine("", "");
            expect(result).toBeNull();
        });
    });

    describe("extractOptions", () => {
        it("should extract options for a multiple-choice question", () => {
            const question = "{~Option A ~Option B =Correct Option}";
            const options = parser.extractOptions(question);

            expect(options).toHaveLength(3);
            expect(options).toEqual(expect.arrayContaining([
                expect.objectContaining({ text: "Correct Option", is_correct: true }),
                expect.objectContaining({ text: "Option A", is_correct: false })
            ]));
        });
    });

    describe("extractTrueFalse", () => {
        it("should return true for a true/false question with TRUE", () => {
            const question = "Est-ce vrai? {TRUE}";
            const answer = parser.extractTrueFalse(question);

            expect(answer).toBe(true);
        });

        it("should return false for a true/false question with FALSE", () => {
            const question = "Est-ce vrai? {FALSE}";
            const answer = parser.extractTrueFalse(question);

            expect(answer).toBe(false);
        });
    });

    describe("extractNumerical", () => {
        it("should parse numerical question with tolerance", () => {
            const question = "Quelle est la valeur de pi? {#3.14:0.01}";
            const result = parser.extractNumerical(question);

            expect(result).toEqual({ correct_answer: 3.14, tolerance: 0.01 });
        });

        it("should return null for invalid numerical question", () => {
            const question = "Quelle est la valeur de pi? {#3.14}";
            const result = parser.extractNumerical(question);

            expect(result).toBeNull();
        });
    });

    describe("extractMatching", () => {
        it("should extract matching pairs correctly", () => {
            const question = "Match the following: {=A->1 =B->2 =C->3}";
            const pairs = parser.extractMatching(question);

            expect(pairs).toEqual(expect.arrayContaining([
                expect.objectContaining({ term: "A", match: "1" }),
                expect.objectContaining({ term: "B", match: "2" }),
                expect.objectContaining({ term: "C", match: "3" })
            ]));
        });
    });

    describe("processFile", () => {
        it("should parse multiple questions from a file", () => {
            const input = `::Question 1:: Quel est le résultat de 2+2? {~2 ~3 =4 ~5}
                            ::Question 2:: La Terre est plate. {TRUE}`;
            const result = parser.processFile(input);

            expect(result).toHaveLength(2);
            expect(result[0]).toHaveProperty("type", "multiple_choice");
            expect(result[1]).toHaveProperty("type", "true_false");
        });
    });

    describe("formatText", () => {
        it("should remove HTML tags and brackets", () => {
            const text = "<b>Sample</b> [html] text";
            const formatted = parser.formatText(text);

            expect(formatted).toEqual("Sample  text");
        });
    });

    describe("generateRealQuestion", () => {
        it("should replace blocks with identifiers", () => {
            const text = "Solve {x+2=4}. Then {y=3}.";
            const result = parser.generateRealQuestion(text);

            expect(result).toEqual("Solve (1). Then (2).");
        });
    });
});
