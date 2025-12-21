import { MODULE_ID } from "../main.js";
import { BasePuzzleLock } from "./BasePuzzleLock.js";

export class MastermindLock extends BasePuzzleLock {
    static get formConfiguration() {
        return {
            title: `${MODULE_ID}.${this.APP_ID}.title`,
            type: this.APP_ID,
            inputs: [
                {
                    name: "solution",
                    type: "text",
                    notes: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.solution.notes`),
                    value: "red,green,blue,yellow",
                },
                {
                    name: "pipOptions",
                    type: "text",
                    notes: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.pipOptions.notes`),
                    value: "red,green,blue,yellow,orange,purple",
                },
            ],
        };
    }

    static get defaultState() {
        return {
            currentSolution: [],
            previousAttempts: [],
        };
    }

    get defaultPrimaryColor() {
        return "magenta";
    }

    async activateListeners(html) {
        super.activateListeners(html);
        html = html[0] ?? html;
        html.querySelectorAll(".current-attempt .mastermind-pip").forEach((pip) => {
            pip.addEventListener("click", async (event) => {
                this.playInteractionSound();
                const currentIndex = event.currentTarget.dataset.optionIndex;
                const pipOptions = await this.getPipOptions();
                const newIndex = (parseInt(currentIndex) + 1) % pipOptions.length;
                event.currentTarget.dataset.optionIndex = newIndex;
                this.updateState();
            });
        });
        const previousAttempts = html.querySelector(".previous-attempts");
        previousAttempts.scrollTop = previousAttempts.scrollHeight;
    }

    isColor(color) {
        if (color.includes(".") || color.includes("fa-") || color.length < 3) return false;
        return true;
    }

    async getPipOptions() {
        const state = await this._loadState();
        return state.pipOptions.split(",").map((color) => color.trim());
    }

    async _getState() {
        const state = await super._getState();
        const html = this.element[0];
        const solutionPips = html.querySelectorAll(".current-attempt .mastermind-pip");
        state.currentSolution = Array.from(solutionPips).map((pip) => pip.dataset.optionIndex);
        if (this._previousAttempts) {
            state.previousAttempts = this._previousAttempts;
            delete this._previousAttempts;
        }
        return foundry.utils.expandObject(state);
    }

    async _loadState() {
        const state = await super._loadState();
        const solution = state.solution.split(",").map((color) => color.trim());
        const pipOptions = state.pipOptions.split(",").map((color) => color.trim());
        state.solutionPips = solution.map((color, index) => {
            const current = parseInt(state.currentSolution[index] ?? 0);
            return {
                color,
                selected: pipOptions[current],
                optionIndex: current,
                isColor: this.isColor(pipOptions[current]),
            };
        });
        const previousPips = [];
        for (const attempt of state.previousAttempts) {
            const pips = attempt.map((index, i) => {
                const pipColor = pipOptions[index];
                const isCorrect = solution[i] == pipColor;
                const isPresent = !isCorrect && solution.find((color) => color == pipColor);
                let guessColor = "white";
                if (isCorrect) guessColor = "lime";
                else if (isPresent) guessColor = "yellow";
                else guessColor = "red";
                return {
                    selected: pipColor,
                    optionIndex: index,
                    guessColor,
                    isColor: this.isColor(pipColor),
                };
            });
            previousPips.push(pips);
        }
        state.previousPips = previousPips;
        return state;
    }

    async _onUnlockAttempt() {
        const result = await super._onUnlockAttempt();
        if (result === false) return;
        const state = await this._loadState();
        const previousAttempts = state.previousAttempts;
        const currentSolution = state.currentSolution;
        previousAttempts.push(currentSolution);
        this._previousAttempts = previousAttempts;
        this.updateState();
        return result;
    }

    async isUnlocked() {
        const { config, current } = await this.getAllData();
        const solution = config.solution.split(",").map((color) => color.trim());
        const pipOptions = config.pipOptions.split(",").map((color) => color.trim());
        const currentSolution = current.currentSolution;
        if (currentSolution.length !== solution.length) return false;
        for (let i = 0; i < solution.length; i++) {
            if (solution[i] !== pipOptions[currentSolution[i]]) return false;
        }
        return true;
    }
}
