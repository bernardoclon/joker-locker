import { MODULE_ID } from "../main.js";
import { BasePuzzleLock } from "./BasePuzzleLock.js";
import { generateSudokuPuzzle, isSolved } from "../lib/sudoku.js";

export class SudokuLock extends BasePuzzleLock {
    static get formConfiguration() {
        const numberMapping = [];

        for (let i = 1; i < 10; i++) {
            numberMapping.push({
                name: `key-${i}`,
                label: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.key.label`) + ` ${i}`,
                value: i,
                type: "filepicker",
            });
        }

        return {
            title: `${MODULE_ID}.${this.APP_ID}.title`,
            type: this.APP_ID,
            activateListeners: (html) => {
                html.querySelector(".generate-sudoku").addEventListener("click", async (e) => {
                    e.preventDefault();
                    const difficulty = parseFloat(html.querySelector(`input[name="difficulty"]`).value);
                    const grid = parseInt(html.querySelector(`select[name="grid"]`).value);
                    const sudoku = generateSudokuPuzzle(difficulty, grid);
                    html.querySelector(`textarea[name="sudoku"]`).value = sudoku.map((row) => row.join(",")).join("\n");
                });
            },
            inputs: [
                {
                    name: "difficulty",
                    type: "range",
                    value: 0.5,
                    min: 0,
                    max: 1,
                    step: 0.01,
                },
                {
                    name: "grid",
                    type: "select",
                    options: {
                        4: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.grid.4`),
                        9: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.grid.9`),
                    },
                    value: 4,
                },
                {
                    name: "generate",
                    type: "custom",
                    html: `<div class="flex-row">
                        <button type="button" class="generate-sudoku"><i class="fa-solid fa-dice"></i> ${game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.generate`)}</button>
                        </div>
                        `,
                },
                {
                    name: "sudoku",
                    type: "textarea",
                    rows: 9,
                    value: "",
                },
                ...numberMapping,
            ],
        };
    }

    static get defaultState() {
        return {
            solution: [],
        };
    }

    get defaultPrimaryColor() {
        return "magenta";
    }

    async activateListeners(html) {
        super.activateListeners(html);
        html = html[0] ?? html;
        const gridSize = parseInt((await this._loadState()).grid);
        html.querySelectorAll(".sudoku-cell").forEach((cell) => {
            cell.addEventListener("mousedown", (e) => {
                this.playInteractionSound();
                const value = parseInt(cell.dataset.value);
                //set to 0 if right click
                if (e.button === 2) {
                    cell.dataset.value = 0;
                } else {
                    cell.dataset.value = (value + 1) % (gridSize + 1);
                }
                this.updateState();
            });
        });
    }

    async _getState() {
        const state = await super._getState();
        const html = this.element[0];
        const sudokuCells = html.querySelectorAll(".sudoku-cell");
        const solution = Array.from(sudokuCells).map((cell) => parseInt(cell.dataset.value));
        state.solution = solution;
        return foundry.utils.expandObject(state);
    }

    async _loadState() {
        const state = await super._loadState();
        const sudokuGrid = [];
        const sudokuGridArray = state.sudoku.split("\n").map((line) => line.split(",").map((x) => parseInt(x))).flat();
        for (let i = 0; i < sudokuGridArray.length; i++) {
            const cell = sudokuGridArray[i];

            const solution = state.solution[i] ?? 0;
            const isLocked = cell !== 0;
            const value = isLocked ? cell : solution;
            const key = state[`key-${value}`] ?? `${value}`;
            const isImage = key.includes(".");
            const displayValue = value === 0 ? "" : key || value;
            sudokuGrid.push({
                value,
                locked: isLocked,
                displayValue,
                isImage,
                isFA: key.includes("fa-"),
            });
        }
        state.sudokuGrid = sudokuGrid;
        return state;
    }

    async isUnlocked() {
        const { config, current } = await this.getAllData();
        const rows = [];
        const rowCount = parseInt(config.grid);
        const solution = current.solution;
        const isComplete = solution.every((cell) => cell && cell !== 0);
        if (!isComplete) return false;
        for (let i = 0; i < rowCount; i++) {
            rows.push(solution.slice(i * rowCount, (i + 1) * rowCount));
        }
        return isSolved(rows, rowCount);
    }
}
