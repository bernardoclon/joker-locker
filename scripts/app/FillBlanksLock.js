import { MODULE_ID } from "../main.js";
import { BasePuzzleLock } from "./BasePuzzleLock.js";

export class FillBlanksLock extends BasePuzzleLock {
    static get formConfiguration() {
        return {
            title: `${MODULE_ID}.${this.APP_ID}.title`,
            type: this.APP_ID,
            inputs: [
                {
                    name: "text",
                    type: "text",
                    notes: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.text.notes`),
                    placeholder: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.text.placeholder`),
                },
                {
                    name: "solution",
                    type: "text",
                    notes: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.solution.notes`),
                    placeholder: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.solution.placeholder`),
                },
                {
                    name: "caseSensitive",
                    type: "checkbox",
                    value: false,
                },
            ],
        };
    }

    static get defaultState() {
        return {
            currentSolution: [],
        };
    }

    get defaultPrimaryColor() {
        return "magenta";
    }

    async activateListeners(html) {
        super.activateListeners(html);
        html = html[0] ?? html;
        const inputs = Array.from(html.querySelectorAll("input"));
        inputs.forEach((input) => {
            input.addEventListener("input", (event) => {
                this.playInteractionSound();
                input.value = input.value.slice(0, 1);
                this._lastFocusedInputIndex = inputs.indexOf(input);
                this.updateState();
            });
            input.addEventListener("keyup", (event) => {
                if (event.key === "Backspace" && input.value === "") {
                    const currentInputIndex = inputs.indexOf(input);
                    if (inputs[currentInputIndex - 1]) {
                        this._lastFocusedInputIndex = currentInputIndex - 1;
                        inputs[this._lastFocusedInputIndex].focus();
                        const val = inputs[this._lastFocusedInputIndex].value;
                        inputs[this._lastFocusedInputIndex].value = "";
                        inputs[this._lastFocusedInputIndex].value = val;
                    }
                }
            });
        });
        //focus _lastFocusedInputIndex or first empty input
        let focused;
        const nextInput = inputs[this._lastFocusedInputIndex + 1];
        const currentInput = inputs[this._lastFocusedInputIndex];
        if (Number.isFinite(this._lastFocusedInputIndex) && currentInput.value !== "" && nextInput) {
            focused = nextInput;
        } else if (currentInput && currentInput.value === "") {
            focused = currentInput;
        } else {
            focused = inputs.find((input) => input.value === "");
        }
        if (focused) {
            focused.focus();
            const val = focused.value;
            focused.value = "";
            focused.value = val;
        }
    }

    async _getState() {
        const state = await super._getState();
        const html = this.element[0];
        const currentSolution = Array.from(html.querySelectorAll("input")).map((input) => {
            return {
                index: parseInt(input.dataset.index),
                value: input.value,
            };
        });
        state.currentSolution = currentSolution;
        return foundry.utils.expandObject(state);
    }

    async _loadState() {
        const state = await super._loadState();
        const blankChar = "_";
        const text = Array.from(state.text ?? "");
        const currentSolution = state.currentSolution ?? [];
        const fillInString = [];
        for (let i = 0; i < text.length; i++) {
            if (text[i] === blankChar) {
                fillInString.push({
                    isInput: true,
                    value: currentSolution.find((s) => s.index === i)?.value ?? "",
                    index: i,
                });
            } else {
                fillInString.push({
                    isInput: false,
                    value: text[i],
                    index: i,
                });
            }
        }
        state.fillInString = fillInString;

        return state;
    }

    async isUnlocked() {
        const { config, current } = await this.getAllData();
        let solution = config.solution;
        let text = Array.from(config.text);
        const currentSolution = current.currentSolution;

        for (const char of currentSolution) {
            if (char.index >= text.length) continue;
            text[char.index] = char.value;
        }
        text = text.join("");

        if (!config.caseSensitive) {
            solution = solution.toLowerCase();
            text = text.toLowerCase();
        }
        return solution === text;
    }
}
