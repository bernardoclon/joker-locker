import { MODULE_ID } from "../main.js";
import { BasePuzzleLock } from "./BasePuzzleLock.js";

const CELL = {
    EMPTY: 0,
    PAWN: 1,
    STAR: 2,
    PAWN_STAR: 3,
};

export class FourByFourLock extends BasePuzzleLock {
    static get formConfiguration() {
        return {
            title: `${MODULE_ID}.${this.APP_ID}.title`,
            type: this.APP_ID,
            activateListeners: (html) => {
                html.querySelector(".generate").addEventListener("click", async (e) => {
                    e.preventDefault();
                    const grid = parseInt(html.querySelector(`input[name="gridSize"]`).value);
                    const noStars = html.querySelector(`input[name="noStars"]`).checked;
                    const puzzle = generatePuzzle(grid, noStars);
                    html.querySelector(`textarea[name="puzzleGrid"]`).value = puzzle;
                });
                const gridSize = parseInt(html.querySelector(`input[name="gridSize"]`).value);
                const pawnCount = Math.floor(gridSize * gridSize * 0.6);
                const noStars = html.querySelector(`input[name="noStars"]`).checked;
                const starCount = noStars ? 0 : Math.floor(pawnCount / 3) * 2;
                const starsInEmptyCells = Math.floor(starCount / 3);
                const starsInPawnCells = starCount - starsInEmptyCells;
                let infoText = "";
                infoText += game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.pawnNumber`) + `: <strong>${pawnCount}</strong><br>`;
                infoText += game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.starNumber`) + `: <strong>${starsInPawnCells}/${starCount}</strong><br>`;
                const infoEl = document.createElement("p");
                infoEl.innerHTML = infoText;
                html.querySelector(`input[name="gridSize"]`).closest(".form-group").querySelector(".notes").after(infoEl);

            },
            inputs: [
                {
                    name: "pawnImage",
                    type: "filepicker",
                    notes: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.pawnImage.notes`),
                    value: "icons/commodities/bones/skull-white-purple.webp",
                },
                {
                    name: "starImage",
                    type: "filepicker",
                    notes: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.starImage.notes`),
                    value: "icons/magic/light/explosion-star-glow-purple.webp",
                },
                {
                    name: "noStars",
                    type: "checkbox",
                    notes: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.noStars.notes`),
                    value: false,
                },
                {
                    name: "gridSize",
                    type: "range",
                    notes: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.gridSize.notes`),
                    min: 3,
                    max: 10,
                    step: 1,
                    value: 4,
                },
                {
                    name: "generate",
                    type: "custom",
                    html: `<div class="flex-row">
                        <button type="button" class="generate"><i class="fa-solid fa-dice"></i> ${game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.generate`)}</button>
                        </div>
                        `,
                },
                {
                    name: "puzzleGrid",
                    type: "textarea",
                    notes: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.puzzleGrid.notes`),
                    rows: 10,
                },
            ],
        };
    }

    static get REQUIRES_CONTEXT() {
        return true;
    }

    static get defaultState() {
        return {
            solvedState: [],
        };
    }

    get defaultPrimaryColor() {
        return "magenta";
    }

    async activateListeners(html) {
        super.activateListeners(html);
        html = html[0] ?? html;
        const puzzleItems = html.querySelectorAll(".puzzle-item");
        const maxPawns = Math.floor(puzzleItems.length * 0.6);
        puzzleItems.forEach((cell) => {
            cell.addEventListener("click", (e) => {
                const value = parseInt(cell.dataset.value);
                const currentPawns = Array.from(puzzleItems).filter((cell) => parseInt(cell.dataset.value) == CELL.PAWN || parseInt(cell.dataset.value) == CELL.PAWN_STAR).length;
                if (currentPawns >= maxPawns && (value === CELL.EMPTY || value === CELL.STAR)) return;
                this.playInteractionSound();
                let newValue = value;
                if (value === CELL.EMPTY) newValue = CELL.PAWN;
                if (value === CELL.STAR) newValue = CELL.PAWN_STAR;
                if (value === CELL.PAWN) newValue = CELL.EMPTY;
                if (value === CELL.PAWN_STAR) newValue = CELL.STAR;
                cell.dataset.value = newValue;
                this.updateState();
            });
        });
    }

    async _getState() {
        const state = await super._getState();
        const html = this.element[0];
        const solvedState = Array.from(html.querySelectorAll(".puzzle-item")).map((cell) => parseInt(cell.dataset.value));
        state.solvedState = solvedState;
        return foundry.utils.expandObject(state);
    }

    async _loadState() {
        const state = await super._loadState();
        const deserialized = deserializePuzzle(state.puzzleGrid);
        delete deserialized.solved;
        let usedPawns = 0;
        deserialized.display = deserialized.display.map((cell, index) => {
            const solvedValue = state.solvedState[index] ?? cell;
            const processedCell = {
                image: "",
                pawnImage: "",
                value: solvedValue,
            };
            if (solvedValue === CELL.STAR || solvedValue === CELL.PAWN_STAR) processedCell.image = state.starImage;
            if (solvedValue === CELL.PAWN || solvedValue === CELL.PAWN_STAR) processedCell.pawnImage = state.pawnImage;
            if (solvedValue === CELL.PAWN || solvedValue === CELL.PAWN_STAR) usedPawns++;
            return processedCell;
        });
        deserialized.pawnsInCols = deserialized.pawnsInCols.map((count) => toRomanNumeral(count));
        deserialized.pawnsInRows = deserialized.pawnsInRows.map((count) => toRomanNumeral(count));
        const maxPawns = Math.floor(deserialized.display.length * 0.6);
        const availablePawns = Array.from({ length: maxPawns }, () => ({ image: "" }));
        let hasPawns = maxPawns - usedPawns;
        for (let i = 0; i < maxPawns; i++) {
            if (hasPawns > 0) {
                availablePawns[i].image = state.pawnImage;
                hasPawns--;
            }
        }
        return { ...state, ...deserialized, availablePawns };
    }

    async isUnlocked() {
        const { config, current } = await this.getAllData();
        const solvedState = current.solvedState;
        const deserialized = deserializePuzzle(config.puzzleGrid);
        const solved = deserialized.solved;
        const grid = solved.length;
        const pawnCount = Math.floor(grid * grid * 0.6);
        const starCount = config.noStars ? 0 : Math.floor(pawnCount / 3) * 2;
        const starsInEmptyCells = Math.floor(starCount / 3);
        const starsInPawnCells = starCount - starsInEmptyCells;
        const pawnsInColsSolution = deserialized.pawnsInCols;
        const pawnsInRowsSolution = deserialized.pawnsInRows;

        //first check if the number of starsInPawnCells is correct
        let currentStarsInPawnCells = 0;
        for (let i = 0; i < solvedState.length; i++) {
            if (solvedState[i] === CELL.PAWN_STAR) currentStarsInPawnCells++;
        }
        if (currentStarsInPawnCells !== starsInPawnCells) return false;

        //then check if the number of pawns in each row and column is correct
        const pawnsInCols = Array.from({ length: grid }, () => 0);
        const pawnsInRows = Array.from({ length: grid }, () => 0);
        for (let i = 0; i < solvedState.length; i++) {
            const row = Math.floor(i / grid);
            const col = i % grid;
            if (solvedState[i] === CELL.PAWN || solvedState[i] === CELL.PAWN_STAR) {
                pawnsInCols[col]++;
                pawnsInRows[row]++;
            }
        }

        for (let i = 0; i < grid; i++) {
            if (pawnsInCols[i] !== pawnsInColsSolution[i] || pawnsInRows[i] !== pawnsInRowsSolution[i]) return false;
        }
        return true;
    }
}

function generatePuzzle(grid, noStars = false) {
    const pawnCount = Math.floor(grid * grid * 0.6);
    const starCount = noStars ? 0 : Math.floor(pawnCount / 3) * 2;
    const starsInEmptyCells = Math.floor(starCount / 3);
    const starsInPawnCells = starCount - starsInEmptyCells;

    const puzzle = Array.from({ length: grid }, () => Array.from({ length: grid }, () => 0));
    const pawnsInCols = Array.from({ length: grid }, () => 0);
    const pawnsInRows = Array.from({ length: grid }, () => 0);

    for (let i = 0; i < pawnCount; i++) {
        let row, col;
        do {
            row = Math.floor(Math.random() * grid);
            col = Math.floor(Math.random() * grid);
        } while (puzzle[row][col] !== 0);
        puzzle[row][col] = 1;
    }
    for (let i = 0; i < starsInEmptyCells; i++) {
        let row, col;
        do {
            row = Math.floor(Math.random() * grid);
            col = Math.floor(Math.random() * grid);
        } while (puzzle[row][col] !== 0);
        puzzle[row][col] = 2;
    }
    for (let i = 0; i < starsInPawnCells; i++) {
        let row, col;
        do {
            row = Math.floor(Math.random() * grid);
            col = Math.floor(Math.random() * grid);
        } while (puzzle[row][col] !== 1);
        puzzle[row][col] = 3;
    }

    for (let row = 0; row < grid; row++) {
        for (let col = 0; col < grid; col++) {
            if (puzzle[row][col] === 1 || puzzle[row][col] === 3) {
                pawnsInCols[col]++;
                pawnsInRows[row]++;
            }
        }
    }

    let puzzleText = "col:" + pawnsInCols.join(",") + "\n" + "row:" + pawnsInRows.join(",") + "\n" + puzzle.map((row) => row.join(",")).join("\n");
    return puzzleText;
}

function deserializePuzzle(puzzleText) {
    const lines = puzzleText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 2);
    const pawnsInCols = lines[0]
        .split(":")[1]
        .split(",")
        .map((x) => parseInt(x));
    const pawnsInRows = lines[1]
        .split(":")[1]
        .split(",")
        .map((x) => parseInt(x));
    const puzzle = lines.slice(2).map((line) => line.split(",").map((x) => parseInt(x)));
    //get the display puzzle (the unsolved one) by converting all 1s to 0s and 3s to 2s
    const display = puzzle.map((row) => row.map((cell) => (cell === 1 ? 0 : cell === 3 ? 2 : cell)));
    return { pawnsInCols, pawnsInRows, solved: puzzle, display: display.flat() };
}

function toRomanNumeral(number) {
    const romanNumerals = {
        1: "I",
        2: "II",
        3: "III",
        4: "IV",
        5: "V",
        6: "VI",
        7: "VII",
        8: "VIII",
        9: "IX",
        10: "X",
    };
    return romanNumerals[number];
}
