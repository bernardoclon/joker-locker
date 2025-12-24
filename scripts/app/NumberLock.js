import { MODULE_ID } from "../main.js";
import { BasePuzzleLock } from "./BasePuzzleLock.js";

export class NumberLock extends BasePuzzleLock {
    static get formConfiguration() {
        const keypadCharacters = [];

        for (let i = 0; i < 10; i++) {
            keypadCharacters.push({
                name: `keypad-${i}`,
                label: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.keypad.label`) + ` ${i}`,
                value: i,
                type: "filepicker",
            });
        }

        return {
            title: `${MODULE_ID}.${this.APP_ID}.title`,
            type: this.APP_ID,
            inputs: [
                {
                    name: "code",
                    type: "number",
                    placeholder: "1234",
                    value: "",
                },
                ...keypadCharacters,
            ],
        };
    }

    static get REQUIRES_CONTEXT() {
        return true;
    }

    static get defaultState() {
        return {
            currentCode: "",
        };
    }

    get defaultPrimaryColor() {
        return "magenta";
    }

    async activateListeners(html) {
        super.activateListeners(html);
        html = html[0] ?? html;
        const codeInput = html.querySelector("input[name='currentCode']");
        const correctCode = await this._loadState();
        const codeLength = `${correctCode.code}`.length;
        codeInput.placeholder = "•".repeat(codeLength);
        html.querySelectorAll(".keypad-button").forEach((button) => {
            button.addEventListener("click", () => {
                this.playInteractionSound();
                const currentCode = codeInput.value;
                const buttonAction = button.dataset.value;
                if (buttonAction === "clear") {
                    codeInput.value = "";
                } else if (buttonAction === "back") {
                    codeInput.value = currentCode.slice(0, -1);
                } else {
                    const currentLength = `${currentCode}`.length;
                    if (currentLength >= codeLength) {
                        return;
                    }
                    codeInput.value = `${currentCode}${buttonAction}`;
                }
                this.updateState();
            });
        });
    }

    async _loadState() {
        const state = await super._loadState();
        for (let i = 0; i < 10; i++) {
            const keypad = state[`keypad-${i}`];
            state[`keypad-${i}`] = {
                value: keypad,
                isImage: keypad.length > 1 && keypad.includes("."),
            };
        }
        return state;
    }

    async isUnlocked() {
        const { config, current } = await this.getAllData();
        return `${config.code}` === `${current.currentCode}`;
    }
}
