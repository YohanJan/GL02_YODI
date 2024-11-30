var GiftParser = function (sTokenize) {
    this.parsedPOI = [];
    this.symb = {
        sectionDelimiter: "::" // Utilisation de "::" comme unique délimiteur
    };
    this.showTokenize = sTokenize;
    this.errorCount = 0;

    // Stockage temporaire pour l'association x.0 et x.1, x.2...
    this.questionMappings = {};
    this.readingQuestionStorage = {}; // Stocke les textes Reading associés aux préfixes complets

    /**
     * Analyse une entrée avec type, titre et question.
     * @param {string} title - Le titre du POI.
     * @param {string} question - La question associée.
     * @returns {Object|null} Objet contenant le type, titre, question et détails supplémentaires.
     */
    this.parseLine = function (title, question) {
        if (!title || !question) return null;

        const type = this.identifyType(question);
        const cleanedQuestion = this.formatText(question.trim()); // Appliquer le formatage ici
        if (!cleanedQuestion) {
            console.warn("La question est vide après nettoyage:", title);
            return null;
        }

        let additionalData = {};

        // Processus spécifique pour extraire les réponses selon le type
        switch (type) {
            case "multiple_choice":
                additionalData = { options: this.extractOptions(cleanedQuestion) };
                break;
            case "true_false":
                additionalData = { answer: this.extractTrueFalse(cleanedQuestion) };
                break;
            case "open":
                // Pas de quatrième partie pour "open"
                break;
            case "numerical":
                additionalData = this.extractNumerical(cleanedQuestion);
                break;
            case "matching":
                additionalData = { pairs: this.extractMatching(cleanedQuestion) };
                break;
            case "cloze":
                additionalData = { answers: this.extractCloze(cleanedQuestion) };
                break;
            case "multiple_choice_feedback":
                additionalData = { options: this.extractMultipleChoiceFeedback(cleanedQuestion) };
                break;
            default:
                console.warn("Type de question non reconnu:", title);
        }

        return {
            type: type,
            title: title.trim(),
            question: cleanedQuestion,
            ...additionalData
        };
    };

    /**
     * Identifie le type de question à partir de la section question.
     * @param {string} question - Le contenu de la question.
     * @returns {string} Le type de la question ou "type non reconnu".
     */
    this.identifyType = function (question) {
        question = question.trim();

        if (question.includes("~") && question.includes("=") && question.includes("#")) {
            return "multiple_choice_feedback";
        } else if (question.includes("~") && question.includes("=") && !question.includes("SA")) {
            return "multiple_choice";
        } else if (question.includes("{}")) {
            return "open";
        } else if (question.includes("VRAI") || question.includes("FAUX")) {
            return "true_false";
        } else if (question.includes("{#")) {
            return "numerical";
        } else if (question.includes("->")) {
            return "matching";
        } else if (question.includes("{") && question.includes("}")) {
            // Vérifie si le type est cloze ou short_answer
            const matchBlocks = question.match(/{[^}]*}/g);
            if (matchBlocks && matchBlocks.length > 1) {
                return "cloze"; // Plus d'un bloc de réponse dans la question
            } else {
                return "short_answer"; // Un seul bloc de réponse dans la question
            }
        }

        return "type non reconnu";
    };

    /**
     * Extrait les options pour une question de type "multiple_choice" ou "multiple_choice_feedback".
     * @param {string} question - La question à traiter.
     * @returns {Array} Liste des options formatées.
     */
    this.extractOptions = function (question) {
        let options = [];
        const matches = question.match(/([~=])([^~={}]+)(?=[~={}]*[}])/g);
        if (matches) {
            matches.forEach((match) => {
                const isCorrect = match.startsWith("=");
                const text = match.substring(1).trim();
                options.push({ text: text, is_correct: isCorrect});
            });
        }
        return options;
    };

    /**
     * Extrait la réponse pour une question de type "true_false".
     * @param {string} question - La question à traiter.
     * @returns {boolean} La réponse vraie ou fausse.
     */
    this.extractTrueFalse = function (question) {
        if (question.includes("{VRAI}")) {
            return true;
        } else if (question.includes("{FAUX}")) {
            return false;
        }
        return null;
    };

    /**
     * Extrait les réponses pour une question de type "numerical".
     * @param {string} question - La question à traiter.
     * @returns {Object} Les réponses numériques et la tolérance.
     */
    this.extractNumerical = function (question) {
        const match = question.match(/{=(\d+\.\d+):(\d+\.\d+)}/);
        if (match) {
            return {
                correct_answer: parseFloat(match[1]),
                tolerance: parseFloat(match[2])
            };
        }
        return null;
    };

    /**
     * Extrait les paires pour une question de type "matching".
     * @param {string} question - La question à traiter.
     * @returns {Array} Liste des paires formatées.
     */
    this.extractMatching = function (question) {
        let pairs = [];
        const matches = question.match(/=([^{]+)->([^{]+)(?=[=}])/g);
        if (matches) {
            matches.forEach((match) => {
                const [term, matchText] = match.split("->");
                pairs.push({
                    term: term.trim(),
                    match: matchText.trim()
                });
            });
        }
        return pairs;
    };

    /**
     * Extrait les réponses pour une question de type "cloze".
     * @param {string} question - La question à traiter.
     * @returns {Array} Liste des réponses extraites.
     */
    this.extractCloze = function (question) {
        let answers = [];
        const matches = question.match(/{([^}]+)}/g);
        if (matches) {
            matches.forEach((match) => {
                const content = match.replace(/[{}]/g, "").trim();
                if (content.includes("=")) {
                    answers.push(content.split("=")[1].trim());
                }
            });
        }
        return answers;
    };

/**
 * Extrait les options et le feedback pour une question de type "multiple_choice_feedback".
 * @param {string} question - La question à traiter.
 * @returns {Array} Liste des options avec feedback.
 */
this.extractMultipleChoiceFeedback = function (question) {
    let options = [];
    const matches = question.match(/([~=])([^~={}]+)(#([^~={}]+))?/g);
    if (matches) {
        matches.forEach((match) => {
            const isCorrect = match.startsWith("=");
            const text = match.split(/[#~=]/)[1].trim();
            const feedbackMatch = match.match(/#([^~={}]+)/);
            let feedback = feedbackMatch ? feedbackMatch[1].trim() : "";

            // Supprimer le mot "feedback" au début de la partie feedback (insensible à la casse)
            if (feedback.toLowerCase().startsWith("feedback")) {
                feedback = feedback.substring(8).trim(); // Supprime "feedback" et les espaces suivants
            }

            options.push({ text, is_correct: isCorrect, feedback });
        });
    }
    return options;
};


    /**
     * Ajoute une entrée dans parsedPOI sans doublons.
     * @param {Object} parsed - Objet représentant la question traitée.
     */
    this.addToParsedPOI = function (parsed) {
        if (!parsed) {
            console.warn("Tentative d'ajout d'un objet null ou non défini à parsedPOI.");
            return;
        }
        if (!this.parsedPOI.some(
            (item) => item.title === parsed.title && item.question === parsed.question
        )) {
            this.parsedPOI.push(parsed);
        }
    };

    
    /**
     * Nettoie le texte d'entrée et extrait les POIs.
     * @param {string} input - Le contenu du fichier GIFT.
     * @returns {Array} Liste des POIs extraits.
     */
    this.processFile = function (input) {
        const lines = input.split("\n");

        let currentTitle = null;
        let currentQuestion = [];
        let currentReadingPrefix = null;

        lines.forEach((line) => {
            line = line.trim();

            if (line.startsWith("//") || line === "") return; // Ignorer les commentaires et lignes vides

            if (line.startsWith(this.symb.sectionDelimiter)) {
                // Si un nouveau titre commence, traiter le POI précédent
                if (currentTitle) {
                    const parsed = this.parseLine(currentTitle, currentQuestion.join("\n"));
                    if (parsed) {
                        const readingPrefix = this.extractReadingPrefix(currentTitle);

                        // Stocker le texte si c'est un texte Reading sans "{}"
                        if (readingPrefix && !parsed.question.includes("{") && !parsed.question.includes("}")) {
                            this.readingQuestionStorage[readingPrefix] = parsed.question;
                            currentReadingPrefix = readingPrefix; // Enregistrer le préfixe pour utilisation future
                            return; // Ne pas ajouter ce texte Reading au JSON
                        }

                        // Si une question héritant d'une Reading est détectée
                        if (
                            currentReadingPrefix &&
                            currentTitle.startsWith(currentReadingPrefix) &&
                            parsed.question.includes("{") &&
                            parsed.question.includes("}")
                        ) {
                            parsed.question =
                                this.readingQuestionStorage[currentReadingPrefix] + "\n" + parsed.question;
                        }

                        // Si c'est un x.0, stocker sa question pour héritage
                        const titleInfo = this.detectIndexedTitle(currentTitle);
                        if (titleInfo && titleInfo.suffix.endsWith("0")) {
                            this.questionMappings[titleInfo.index] = parsed.question;
                        }

                        // Si c'est un x.1, x.2..., ajouter la question héritée
                        if (titleInfo && !titleInfo.suffix.endsWith("0")) {
                            parsed.question =
                                (this.questionMappings[titleInfo.index] || "") + "\n" + parsed.question;
                        }

                        // Ajouter la question au tableau parsedPOI seulement si ce n'est pas une x.0
if (!titleInfo || !titleInfo.suffix.endsWith("0")) {
    this.addToParsedPOI(parsed);
}
                    }
                }

                // Nouveau titre détecté
                const parts = line.split(this.symb.sectionDelimiter).map((p) => p.trim());
                if (parts.length >= 2) {
                    currentTitle = parts[1]; // Le titre est après le premier "::"
                    currentQuestion = [parts.slice(2).join(" ")]; // La question commence après "::"
                } else {
                    this.errorCount++;
                    currentTitle = null;
                    currentQuestion = [];
                }
            } else {
                // Accumuler les lignes comme partie de la question tant qu'il n'y a pas de nouveau titre
                if (currentTitle) {
                    currentQuestion.push(line);
                }
            }
        });

        // Traiter le dernier POI
        if (currentTitle) {
            const parsed = this.parseLine(currentTitle, currentQuestion.join("\n"));
            if (parsed) {
                const readingPrefix = this.extractReadingPrefix(currentTitle);

                if (readingPrefix && !parsed.question.includes("{") && !parsed.question.includes("}")) {
                    this.readingQuestionStorage[readingPrefix] = parsed.question;
                }

                if (
                    currentReadingPrefix &&
                    currentTitle.startsWith(currentReadingPrefix) &&
                    parsed.question.includes("{") &&
                    parsed.question.includes("}")
                ) {
                    parsed.question =
                        this.readingQuestionStorage[currentReadingPrefix] + "\n" + parsed.question;
                }

                const titleInfo = this.detectIndexedTitle(currentTitle);
                if (titleInfo && titleInfo.suffix.endsWith("0")) {
                    this.questionMappings[titleInfo.index] = parsed.question;
                }

                if (titleInfo && !titleInfo.suffix.endsWith("0")) {
                    parsed.question =
                        (this.questionMappings[titleInfo.index] || "") + "\n" + parsed.question;
                }

                this.addToParsedPOI(parsed);
            }
        }

        if (this.showTokenize) {
            console.log("Tokenized data:", this.parsedPOI);
        }

        return this.parsedPOI;
    };

    /**
     * Détecte si un titre correspond au format x.0, x.1 ou x.A1.
     * @param {string} title - Le titre à analyser.
     * @returns {Object|null} Informations sur le titre (index x et suffixe) ou null.
     */
    this.detectIndexedTitle = function (title) {
        const match = title.match(/(\d+)\.([A-Za-z]?\d+)/);
        if (match) {
            return { index: parseInt(match[1], 10), suffix: match[2] };
        }
        return null;
    };

    /**
     * Extrait le préfixe "Reading" du titre, s'il existe.
     * @param {string} title - Le titre à analyser.
     * @returns {string|null} Le préfixe Reading ou null.
     */
    this.extractReadingPrefix = function (title) {
        const match = title.match(/^(.*)\sReading/);
        return match ? match[1].trim() + " Reading" : null;
    };

    /**
     * Nettoie et applique le formatage au texte contenant des balises HTML.
     * @param {string} text - Le texte à traiter.
     * @returns {string} Texte formaté.
     */
    this.formatText = function (text) {
        if (!text) return "";

        // Remplacement des balises reconnues
        text = text.replace(/<b>(.*?)<\/b>/g, "**$1**"); // Gras
        text = text.replace(/<i>(.*?)<\/i>/g, "_$1_"); // Italique
        text = text.replace(/<u>(.*?)<\/u>/g, "__$1__"); // Souligné
        text = text.replace(/<h(\d)>(.*?)<\/h\1>/g, "\n# $2\n"); // Titre (H1, H2, ...)
        text = text.replace(/<br\s*\/?>|\n/g, "\n"); // Retour à la ligne

        // Suppression des balises non reconnues
        text = text.replace(/<[^>]+>/g, "").replace(/\[[^\]]+\]/g, "");

        return text.trim();
    };
};

module.exports = GiftParser;
