const { expect } = require("chai");
const GiftParser = require("../GiftParser");

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

            expect(result).to.have.property("type", "multiple_choice");
            expect(result).to.have.property("title", "Question 1");
            expect(result.options).to.deep.include({ text: "4", is_correct: true });
            expect(result.options).to.deep.include({ text: "2", is_correct: false });
        });

        it("should parse a true/false question correctly", () => {
            const title = "Question 2";
            const question = "La Terre est plate. {TRUE}";
            const result = parser.parseLine(title, question);

            expect(result).to.have.property("type", "true_false");
            expect(result).to.have.property("answer", true);
        });

        it("should return null for invalid input", () => {
            const result = parser.parseLine("", "");
            expect(result).to.be.null;
        });
    });

    describe("extractOptions", () => {
        it("should extract options for a multiple-choice question", () => {
            const question = "{~Option A ~Option B =Correct Option}";
            const options = parser.extractOptions(question);

            expect(options).to.have.length(3);
            expect(options).to.deep.include({ text: "Correct Option", is_correct: true });
            expect(options).to.deep.include({ text: "Option A", is_correct: false });
        });
    });

    describe("extractTrueFalse", () => {
        it("should return true for a true/false question with TRUE", () => {
            const question = "Est-ce vrai? {TRUE}";
            const answer = parser.extractTrueFalse(question);

            expect(answer).to.be.true;
        });

        it("should return false for a true/false question with FALSE", () => {
            const question = "Est-ce vrai? {FALSE}";
            const answer = parser.extractTrueFalse(question);

            expect(answer).to.be.false;
        });
    });

    describe("extractNumerical", () => {
        it("should parse numerical question with tolerance", () => {
            const question = "Quelle est la valeur de pi? {#3.14:0.01}";
            const result = parser.extractNumerical(question);

            expect(result).to.deep.equal({ correct_answer: 3.14, tolerance: 0.01 });
        });

        it("should return null for invalid numerical question", () => {
            const question = "Quelle est la valeur de pi? {#3.14}";
            const result = parser.extractNumerical(question);

            expect(result).to.be.null;
        });
    });

    describe("extractMatching", () => {
        it("should extract matching pairs correctly", () => {
            const question = "Match the following: {=A->1 =B->2 =C->3}";
            const pairs = parser.extractMatching(question);

            expect(pairs).to.deep.include({ term: "A", match: "1" });
            expect(pairs).to.deep.include({ term: "B", match: "2" });
            expect(pairs).to.deep.include({ term: "C", match: "3" });
        });
    });

    describe("processFile", () => {
        it("should parse multiple questions from a file", () => {
            const input = `
                ::Question 1:: Quel est le résultat de 2+2? {~2 ~3 =4 ~5}
                ::Question 2:: La Terre est plate. {TRUE}
            `;
            const result = parser.processFile(input);

            expect(result).to.have.length(2);
            expect(result[0]).to.have.property("type", "multiple_choice");
            expect(result[1]).to.have.property("type", "true_false");
        });
    });

    describe("formatText", () => {
        it("should remove HTML tags and brackets", () => {
            const text = "<b>Sample</b> [html] text";
            const formatted = parser.formatText(text);

            expect(formatted).to.equal("Text");
        });
    });

    describe("generateRealQuestion", () => {
        it("should replace blocks with identifiers", () => {
            const text = "Solve {x+2=4}. Then {y=3}.";
            const result = parser.generateRealQuestion(text);

            expect(result).to.equal("Solve (1). Then (2).");
        });
    });
});
