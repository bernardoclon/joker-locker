import { MODULE_ID } from "../main.js";
import { BasePuzzleLock } from "./BasePuzzleLock.js";

export class SwitchesLock extends BasePuzzleLock {
    static get formConfiguration() {
        return {
            title: `${MODULE_ID}.${this.APP_ID}.title`,
            type: this.APP_ID,
            inputs: [
                {
                    name: "switchesSolution",
                    value: "0000",
                    type: "text",
                    notes: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.switchesSolution.notes`),
                },
                {
                    name: "showSwitches",
                    value: false,
                    type: "checkbox",
                    notes: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.showSwitches.notes`),
                }
            ],
        };
    }

    static get defaultState() {
        return {};
    }

    get defaultPrimaryColor() {
        return "magenta";
    }

    get defaultSecondaryColor() {
        return "lime";
    }

    static get REQUIRES_CONTEXT() {
        return true;
    }

    async activateListeners(html) {
        super.activateListeners(html);
        html = html[0] ?? html;
        html.querySelectorAll(".switch-container").forEach((switchElement) => {
            switchElement.addEventListener("click", () => {
                this.playInteractionSound();
                switchElement.classList.toggle("active");
                this.updateState();
            });
        });
    }

    async _loadState() {
        const state = await super._loadState();
        const { switchesSolution } = state;
        const switchCount = switchesSolution.length;
        const switchesValue = state.switchesValue ?? Array(switchCount).fill("0").join("");
        const switches = [];
        for (let i = 0; i < switchCount; i++) {
            switches.push({
                name: `switch-${i}`,
                value: switchesValue[i] === "1" ? true : false,
            });
        }
        state.switches = switches;
        return state;
    }

    async _getState() {
        const state = {};
        let solutionString = "";
        this.element[0].querySelectorAll(".switch-container").forEach((switchElement, index) => {
            if (switchElement.classList.contains("active")) {
                solutionString += "1";
            } else {
                solutionString += "0";
            }
        });
        state.switchesValue = solutionString;
        return state;
    }

    async isUnlocked() {
        const { config, current } = await this.getAllData();
        return current.switchesValue === config.switchesSolution;
    }
}
