describe("Testing researchQuestions function", () => {
    const fs = require("fs-extra");
    const inquirer = require("inquirer");
    const chalk = require("chalk");
    const parser = {
        parse: jest.fn(),
    };

    

    const researchQuestions = require("../src/questionMAnager");

    jest.mock("fs-extra");
    jest.mock("inquirer");

    let mockQuestions;

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
        parser.parse.mockResolvedValue("./data/questions.json");

        // Mock fs.readJSON to return the predefined questions
        fs.readJSON.mockResolvedValue(mockQuestions);
    });

    it("should parse and load questions successfully", async () => {
        // Mock prompt to avoid user interaction
        inquirer.prompt.mockResolvedValue({ keyword: "résultat" });

        // Execute the function
        console.log = jest.fn(); // Mock console.log to avoid cluttering test output
        await researchQuestions.researchQuestions();

        // Assert parser and fs were called
        expect(parser.parse).toHaveBeenCalledWith("./data/Questions_GIFT", "./data/questions.json");
        expect(fs.readJSON).toHaveBeenCalledWith("./data/questions.json");

        // Assert console.log was called with matching questions
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Quel est le résultat de 2 + 2 ?"));
    });

    it("should return 'Question not found' for unmatched keywords", async () => {
        // Mock prompt for a non-matching keyword
        inquirer.prompt.mockResolvedValue({ keyword: "inexistant" });

        // Execute the function
        console.log = jest.fn(); // Mock console.log to avoid cluttering test output
        await researchQuestions.researchQuestions();

        // Assert "Question not found" is logged
        expect(console.log).toHaveBeenCalledWith("Question not found");
    });

    it("should handle empty keyword input", async () => {
        // Mock prompt with empty keyword
        inquirer.prompt.mockResolvedValue({ keyword: "" });

        // Execute the function
        console.log = jest.fn(); // Mock console.log to avoid cluttering test output
        await researchQuestions.researchQuestions();

        // Assert all questions are displayed when no keyword is provided
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Quel est le résultat de 2 + 2 ?"));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Quelle est la couleur du ciel ?"));
    });
});
