import {getRGBfromCSSColor} from "../lib/utils.js";
import { MODULE_ID } from "../main.js";
import { BasePuzzleLock } from "./BasePuzzleLock.js";

export class MatchLock extends BasePuzzleLock {
    static get formConfiguration() {
        return {
            title: `${MODULE_ID}.${this.APP_ID}.title`,
            type: this.APP_ID,
            inputs: [
                {
                    name: "matchTable",
                    type: "textarea",
                    rows: 12,
                    notes: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.matchTable.notes`),
                    value: `Word 1|Match 1\nWord 2|Match 2\nWord 3|Match 3\nWord 4|Match 4\nWord 5|Match 5\nWord 6|Match 6\nWord 7|Match 7\nWord 8|Match 8\nWord 9|Match 9\nWord 10|Match 10\n`
                },
                {
                    name: "secretWord",
                    type: "text",
                    notes: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.secretWord.notes`),
                },
                {
                    name: "dictionary",
                    type: "text",
                    notes: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.dictionary.notes`),
                    value: "A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z"
                }
            ],
        };
    }

    static get defaultState() {
        return {
            matchIndexes: [],
            matchesShuffle: [],
            secretWordPositions: [],
            randomWordPositions: [],
            currentSecretWord: "",
        };
    }

    get defaultPrimaryColor() {
        return "magenta";
    }

    async activateListeners(html) {
        super.activateListeners(html);
        html = html[0] ?? html;
        html.querySelectorAll(".pair-word").forEach((word) => {
            word.addEventListener("click", async (event) => {
                this.playInteractionSound();
                html.querySelectorAll(".pair-word").forEach((w) => w.classList.remove("selected"));
                word.classList.add("selected");
            });
        });

        html.querySelectorAll(".pair-match").forEach((match) => {
            match.addEventListener("click", async (event) => {
                const selectedWord = html.querySelector(".pair-word.selected");
                if (!selectedWord) return;
                this.playInteractionSound();
                const matchIndex = parseInt(match.dataset.index);
                const currentMatchIndex = parseInt(selectedWord.dataset.matchedTo);
                Array.from(html.querySelectorAll(".pair-word")).filter((word) => parseInt(word.dataset.matchedTo) === matchIndex).forEach((word) => word.dataset.matchedTo = -1);
                selectedWord.dataset.matchedTo = matchIndex === currentMatchIndex ? -1 : matchIndex;
                this.updateState();
            });
        });

        this.createSVGLinks(html);

        const secretInput = html.querySelector("input[name='currentSecretWord']");
        if (secretInput) {            
            secretInput.focus();
            const length = secretInput.value.length;
            secretInput.setSelectionRange(length, length);
            secretInput.addEventListener("input", async (event) => {
                this.playInteractionSound();
                this.updateState();
            });
        }

    }

    createSVGLinks(html) {
        const svgContainer = html.querySelector(".svg-container");
        const leftColWords = Array.from(html.querySelectorAll(".pair-word")).filter((word) => parseInt(word.dataset.matchedTo) !== -1);
        const rightColMatches = Array.from(html.querySelectorAll(".pair-match"));

        svgContainer.innerHTML = "";
        const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        const svgContainerRect = svgContainer.getBoundingClientRect();
        const lineXOffset = 0.01 * svgContainerRect.width;
        svgElement.setAttribute("width", svgContainerRect.width);
        svgElement.setAttribute("height", svgContainerRect.height);
        svgElement.setAttribute("viewBox", `0 0 ${svgContainerRect.width} ${svgContainerRect.height}`);
        svgContainer.appendChild(svgElement);

        for (const word of leftColWords) {
            
            const wordRect = word.getBoundingClientRect();
            const matchIndex = parseInt(word.dataset.matchedTo);
            const match = rightColMatches.find((match) => parseInt(match.dataset.index) === matchIndex);
            if (!match) continue;
            const matchRect = match.getBoundingClientRect();

            const x1 = wordRect.right - svgContainerRect.left + lineXOffset;
            const y1 = wordRect.top - svgContainerRect.top + wordRect.height / 2;
            const x2 = matchRect.left - svgContainerRect.left - lineXOffset;
            const y2 = matchRect.top - svgContainerRect.top + matchRect.height / 2;

            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", x1);
            line.setAttribute("y1", y1);
            line.setAttribute("x2", x2);
            line.setAttribute("y2", y2);
            line.setAttribute("stroke", "var(--lock-secondary-color-100)");
            line.setAttribute("stroke-linecap", "round");
            line.setAttribute("stroke-width", "calc(0.2 * var(--lock-font-size))");
            svgElement.appendChild(line);
        }

    }

    async shuffle() {
        const state = await this._loadState();
        const length = state.displayTable.length;
        const shuffle = Array.from({length}, (_, i) => i);
        shuffle.sort(() => Math.random() - 0.5);
        const secretWord = state.secretWord;
        if(!secretWord) return this.document.setFlag(MODULE_ID, `${this.APP_ID}.matchesShuffle`, shuffle);


        const dictionary = state.dictionary.split(",").map((str) => str.trim());
        const secretWordLetters = (secretWord.includes(",") ? secretWord.split(",") : Array.from(secretWord)).map(c=>c.trim()).filter((char) => char);

        const html = this.element[0];
        const svgContainer = html.querySelector(".svg-container");
        const containerRect = svgContainer.getBoundingClientRect();
        const colLeft = html.querySelector(".match-col-left");
        const colRight = html.querySelector(".match-col-right");
        const colLeftWidth = colLeft.getBoundingClientRect().width * 1.2;
        const colRightWidth = colRight.getBoundingClientRect().width * 1.2;
        const wordCount = colLeft.querySelectorAll(".pair-word").length;
        const gridSize = Math.ceil(wordCount * 2);

        //divide the container rect into a grid
        const grid = Array.from({length: gridSize}).map((_, i) => {
            return Array.from({length: gridSize}).map((_, j) => {
                const gridSquare = {
                    x: (j / gridSize) * containerRect.width,
                    y: (i / gridSize) * containerRect.height,
                    x2: ((j + 1) / gridSize) * containerRect.width,
                    y2: ((i + 1) / gridSize) * containerRect.height,
                }
                //exclude the left and right columns
                if (gridSquare.x < colLeftWidth || gridSquare.x2 > containerRect.width - colRightWidth) return null;
                //exclude the top and bottom rows
                if (gridSquare.y < containerRect.height * 0.05 || gridSquare.y2 > containerRect.height * 0.95) return null;
                return gridSquare;
            });
        }).flat().filter((square) => square);

        //display debug grid
        this.debugGrid = grid;

        //get an array of lines that are a result of the correct matches
        //first, set the col right order to the shuffle order
        Array.from(colRight.querySelectorAll(".pair-match")).forEach((match, index) => {
            match.style.order = shuffle[index];
        });

        const lines = [];

        //for each word, find the match and create a line
        Array.from(colLeft.querySelectorAll(".pair-word")).forEach((word, index) => {
            const matchedEl = Array.from(colRight.querySelectorAll(".pair-match")).find((match) => parseInt(match.dataset.index) === index);
            if (!matchedEl) return;
            const wordRect = word.getBoundingClientRect();
            const matchRect = matchedEl.getBoundingClientRect();
            const x1 = wordRect.right;
            const y1 = wordRect.top + wordRect.height / 2;
            const x2 = matchRect.left;
            const y2 = matchRect.top + matchRect.height / 2;
            //make position relative to the container
            lines.push({
                x1: x1 - containerRect.left,
                y1: y1 - containerRect.top,
                x2: x2 - containerRect.left,
                y2: y2 - containerRect.top,
            })
        });

        const intersectingBoxes = [];
        const nonIntersectingBoxes = [];

        for (const box of grid) {
            const intersects = lines.filter((line) => lineRectangleIntersection(box,line));
            if (intersects.length) {
                box.intersects = true;
                const center = {
                    x: (box.x + box.x2) / 2,
                    y: (box.y + box.y2) / 2,
                };
                const points = intersects.map((line) => closestPointOnLineToPoint(line, center))

                let closestPoint = points[0];
                let closestDistance = Math.sqrt((center.x - closestPoint.x) ** 2 + (center.y - closestPoint.y) ** 2);

                for (const point of points) {
                    const distance = Math.sqrt(Math.pow((center.x - point.x), 2) + Math.pow((center.y - point.y),2));
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestPoint = point;
                    }
                }



                intersectingBoxes.push({...box, closestPoint});
            } else {
                nonIntersectingBoxes.push(box);
            }
        }

        const secretWordPositions = [];
        const randomWordPositions = [];

        const boxPositionToPercentCenter = (box) => {
            const center = box.closestPoint ?? {
                x: (box.x + box.x2) / 2,
                y: (box.y + box.y2) / 2,
            };
            return {
                x: (center.x / containerRect.width) * 100,
                y: (center.y / containerRect.height) * 100,
            };
        }

        //evenly distribute the secret word letters across the non-intersecting boxes
        const secretWordLettersCopy = [...secretWordLetters];
        const indexMulti = Math.max(1, Math.floor(nonIntersectingBoxes.length / secretWordLettersCopy.length));
        let currentWordIndex = 0;
        for (let i = 0; i < nonIntersectingBoxes.length - indexMulti; i += indexMulti) {
            const randomIndex = Math.min(nonIntersectingBoxes.length - 1, Math.floor(Math.random() * indexMulti) + i);
            secretWordPositions.push({
                index: currentWordIndex,
                position: boxPositionToPercentCenter(nonIntersectingBoxes[randomIndex]),
            });
            currentWordIndex++;
        }

        const randomLettersCount = secretWordLetters.length * 3;

        //evenly distribute the random letters across the non-intersecting boxes
        const randomIndexMulti = Math.max(1, Math.floor(intersectingBoxes.length / randomLettersCount));
        for (let i = 0; i < intersectingBoxes.length - randomIndexMulti; i += randomIndexMulti) {
            const randomIndex = Math.min(intersectingBoxes.length - 1, Math.floor(Math.random() * randomIndexMulti) + i);
            randomWordPositions.push({
                index: Math.floor(Math.random() * dictionary.length),
                position: boxPositionToPercentCenter(intersectingBoxes[randomIndex]),
            });
        }
        this.document.update({
            flags: {
                [MODULE_ID]: {
                    [this.APP_ID]: {
                        matchesShuffle: shuffle,
                        secretWordPositions,
                        randomWordPositions,
                    }
                }
            }
        })
    }

    async _getState() {
        const state = await super._getState();
        const html = this.element[0];
        const pairs = html.querySelectorAll(".pair-word");
        const indexes = Array.from(pairs).map((pair) => parseInt(pair.dataset.matchedTo) ?? -1);
        state.matchIndexes = indexes;
        return foundry.utils.expandObject(state);
    }

    async _loadState() {
        const state = await super._loadState();
        const deserializedTable = this.deserialize(state.matchTable);
        const matchIndexes = state.matchIndexes;
        const matchesShuffle = state.matchesShuffle;
        deserializedTable.forEach((pair, index) => {
            pair.match.order = matchesShuffle[index] ?? index;
            pair.word.matchedTo = matchIndexes[index] ?? -1;
        });
        state.displayTable = deserializedTable;
        const secretWord = (state.secretWord.includes(",") ? state.secretWord.split(",") : Array.from(state.secretWord)).map(c => c.trim()).filter((char) => char);
        const dictionary = state.dictionary.split(",").map((str) => str.trim());
        const secretWordPositions = state.secretWordPositions.map((s) => {
            return {
                ...s,
                value: secretWord[s.index],
                isSecret: true,
            };
        });
        console.log(secretWord, secretWordPositions);
        const randomWordPositions = state.randomWordPositions.map((r) => {
            return {
                ...r,
                value: dictionary[r.index],
            };
        });
        const lettersDisplay = secretWordPositions.concat(randomWordPositions);
        state.lettersDisplay = lettersDisplay;
        return state;
    }

    async isUnlocked() {
        const {config, current} = await this.getAllData();

        const secretWord = config.secretWord;
        const currentSecretWord = current.currentSecretWord;
        if(secretWord) return secretWord.toLowerCase().trim() === currentSecretWord.toLowerCase().trim();

        const matchIndexes = current.matchIndexes;
        const deserialized = this.deserialize(config.matchTable);
        if(deserialized.length !== matchIndexes.length) return false;
        const isUnlocked = matchIndexes.every((index, i) => index === i);
        return isUnlocked;
    }

    getSidebarButtons() {
        const buttons = super.getSidebarButtons();
        buttons.unshift({
            label: game.i18n.localize(`${MODULE_ID}.sidebar-buttons.shuffle`),
            class: "shuffle",
            icon: "<i class='fas fa-random' style='color: var(--color-shadow-highlight)'></i>",
            visible: game.user.isGM,
            onClick: async () => {
                this.shuffle();
            },
        });
        return buttons;
    }

    deserialize(matchTable) {
        return matchTable.split("\n").filter(l => l.length > 3).map((line, index) => {
            const [word, match] = line.split("|").map((str) => str.trim());
            return {
                word: {
                    text: word,
                    index: index,
                    isImage: word.includes("."),
                },
                match: {
                    text: match,
                    index: index,
                    isImage: match.includes("."),
                },
            }
        });
    }
}
function closestPointOnLineToPoint(line, p) {
    const {x1, x2, y1, y2} = line;
    if((x2 - x1) == 0) return {x:x1, y:p.y};
    if((y2 - y1) == 0) return {x:p.x, y:y1};
    const m = (y2 - y1) / (x2 - x1);
    const b = y1 - m * x1;

    const m2 = -1 / m;
    const b2 = p.y - m2 * p.x;

    const x3 =  (b - b2) / (m2 - m);
    const y3 = m2 * x3 + b2;

    return { x: x3, y: y3 };
  }

function lineRectangleIntersection(rectangle, line) {
    
    const m = (line.y2 - line.y1) / (line.x2 - line.x1);
    const b = line.y1 - m * line.x1;

    const getX = (y) => (y - b) / m;
    const getY = (x) => m * x + b;

    const rectXL = rectangle.x;
    const XLIntersect = getY(rectXL);
    if (XLIntersect >= rectangle.y && XLIntersect <= rectangle.y2) return true;

    const rectXR = rectangle.x2;
    const XRIntersect = getY(rectXR);
    if (XRIntersect >= rectangle.y && XRIntersect <= rectangle.y2) return true;

    const rectYT = rectangle.y;
    const YTIntersect = getX(rectYT);
    if (YTIntersect >= rectangle.x && YTIntersect <= rectangle.x2) return true;

    const rectYB = rectangle.y2;
    const YBIntersect = getX(rectYB);
    if (YBIntersect >= rectangle.x && YBIntersect <= rectangle.x2) return true;

    return false;
}