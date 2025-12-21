import { MODULE_ID } from "../main.js";
import { BasePuzzleLock } from "./BasePuzzleLock.js";

export class CryptexLock extends BasePuzzleLock {
    static get formConfiguration() {
        const cylinders = [];
        for (let i = 0; i < 10; i++) {
            cylinders.push({
                name: `cylinder-${i}`,
                label: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.cylinder.label`) + ` ${i}`,
                type: "text",
                placeholder: "A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z",
            });
        }

        return {
            title: `${MODULE_ID}.${this.APP_ID}.title`,
            type: this.APP_ID,
            inputs: [
                {
                    name: "solution",
                    label: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.solution.label`),
                    type: "text",
                },
                ...cylinders,
            ],
        };
    }

    static get REQUIRES_CONTEXT() {
        return true;
    }

    static get defaultState() {
        return {
            selectedSolution: "",
        };
    }

    get defaultPrimaryColor() {
        return "#9d9463";
    }

    async activateListeners(html) {
        super.activateListeners(html);
        html = html[0] ?? html;
        html.querySelectorAll(".cylinder").forEach((cylinderElement, index) => {
            cylinderElement.addEventListener("mouseup", (e) => {
                console.log("click");
                this.playInteractionSound();
                const symbols = cylinderElement.querySelectorAll(".symbol");
                const next = symbols[3].innerHTML;
                const previous = symbols[1].innerHTML;
                const currentSolution = Array.from(html.querySelectorAll(".cylinder")).map((c) => c.querySelectorAll(".symbol")[2].innerHTML);
                const newChar = e.button === 0 ? next : previous;
                let newSolution = [];
                console.log(currentSolution.length);
                for (let i = 0; i < currentSolution.length; i++) {
                    if (i === index) {
                        newSolution.push(newChar);
                    } else {
                        newSolution.push(currentSolution[i]);
                    }
                }
                html.querySelector("input").value = newSolution.join(",");
                this.updateState();
            });
        });
    }

    async _loadState() {
        const state = await super._loadState();
        const cylinderConfigurations = [];
        for (let i = 0; i < 10; i++) {
            const cylinder = state[`cylinder-${i}`] ?? "";
            if (!cylinder) continue;
            cylinderConfigurations.push(cylinder.split(",").map((c) => c.trim()));
        }

        const cylinderDisplay = [];
        let currentSolution = state.selectedSolution ? state.selectedSolution.split(",") : cylinderConfigurations.map((c) => c[0]);
        //if the solution is not the correct length, fill it with the first character of each cylinder
        if (currentSolution.length !== cylinderConfigurations.length) {
            const defaultSolution = cylinderConfigurations.map((c) => c[0]);
            currentSolution = currentSolution.concat(defaultSolution.slice(currentSolution.length));
        }
        if (currentSolution.length > cylinderConfigurations.length) {
            currentSolution = currentSolution.slice(0, cylinderConfigurations.length);
        }
        for (const cylinderCfg of cylinderConfigurations) {
            const cylIndex = cylinderConfigurations.indexOf(cylinderCfg);
            const currentIndex = cylinderCfg.indexOf(currentSolution[cylIndex]);
            const indexes = [currentIndex - 2, currentIndex - 1, currentIndex, (currentIndex + 1) % cylinderCfg.length, (currentIndex + 2) % cylinderCfg.length];

            const cylinder = indexes.map((i) => cylinderCfg.at(i));

            cylinderDisplay.push(cylinder);
        }

        state.cylinderDisplay = cylinderDisplay;
        state.selectedSolution = currentSolution;

        return state;
    }

    async isUnlocked() {
        const { config, current } = await this.getAllData();
        const solution = config.solution;
        const selectedSolution = current.selectedSolution;
        return solution === selectedSolution.split(",").join("");
    }
}
