import { MODULE_ID } from "../main.js";
import { CryptexLock } from "./CryptexLock.js";
import { BasePuzzleLock } from "./BasePuzzleLock.js";

const RUNE_MAP = {
    "A": "ᚨ", "B": "ᛒ", "C": "ᚲ", "D": "ᛞ", "E": "ᛖ", "F": "ᚠ", "G": "ᚷ",
    "H": "ᚺ", "I": "ᛁ", "J": "ᛃ", "K": "ᚲ", "L": "ᛚ", "M": "ᛗ", "N": "ᚾ",
    "O": "ᛟ", "P": "ᛈ", "Q": "ᛩ", "R": "ᚱ", "S": "ᛊ", "T": "ᛏ", "U": "ᚢ",
    "V": "ᚹ", "W": "ᚹ", "X": "ᛉ", "Y": "ᛃ", "Z": "ᛉ"
};

export class CelticLock extends CryptexLock {
    static get APP_ID() {
        return "celtic-lock";
    }

    get template() {
        // Reutilizamos la plantilla del Cryptex ya que la estructura es idéntica
        return `modules/${MODULE_ID}/templates/cryptex-lockr.hbs`;
    }

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

    get defaultPrimaryColor() {
        return "#3a5f0b"; // Un verde oscuro tipo bosque para la temática celta
    }

    async _loadState() {
        const state = await super._loadState();
        
        // Cachear configuraciones para la lógica del listener
        this.cylinderConfigurations = [];
        for (let i = 0; i < 10; i++) {
            const cylinder = state[`cylinder-${i}`] ?? "";
            if (!cylinder) continue;
            this.cylinderConfigurations.push(cylinder.split(",").map((c) => c.trim()));
        }

        // Traducir visualización a Runas
        if (state.cylinderDisplay) {
            state.cylinderDisplay = state.cylinderDisplay.map(row => 
                row.map(char => RUNE_MAP[char.toUpperCase()] || char)
            );
        }
        
        return state;
    }

    async activateListeners(html) {
        // Llamamos directamente a BasePuzzleLock para evitar la lógica de CryptexLock que lee del DOM
        BasePuzzleLock.prototype.activateListeners.call(this, html);
        
        html = html[0] ?? html;
        html.querySelectorAll(".cylinder").forEach((cylinderElement, index) => {
            cylinderElement.addEventListener("mouseup", async (e) => {
                this.playInteractionSound();
                
                const state = await this._loadState();
                const cylinderCfg = this.cylinderConfigurations[index];
                
                if (!cylinderCfg) return;

                const currentSolution = state.selectedSolution;
                const currentChar = currentSolution[index];
                const currentIndex = cylinderCfg.indexOf(currentChar);
                
                // Calcular nuevo índice basado en la configuración de letras (no runas)
                let newIndex = e.button === 0 ? (currentIndex + 1) : (currentIndex - 1);
                newIndex = (newIndex + cylinderCfg.length) % cylinderCfg.length;
                
                const newChar = cylinderCfg[newIndex];
                const newSolution = [...currentSolution];
                newSolution[index] = newChar;
                
                html.querySelector("input").value = newSolution.join(",");
                this.updateState();
            });
        });
    }

    async isUnlocked() {
        const { config, current } = await this.getAllData();
        const solution = (config.solution || "").toUpperCase().trim();
        const selectedSolution = (current.selectedSolution || "").toUpperCase().split(",").join("");
        return solution === selectedSolution;
    }
}
