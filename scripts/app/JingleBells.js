import { MODULE_ID } from "../main.js";
import { BasePuzzleLock } from "./BasePuzzleLock.js";

export class JingleBells extends BasePuzzleLock {
    static get APP_ID() {
        return "jingle-bells-lock";
    }

    static get REQUIRES_CONTEXT() {
        return true;
    }

    get template() {
        return `modules/${MODULE_ID}/templates/jingle-bells.hbs`;
    }

    static get formConfiguration() {
        return {
            title: `${MODULE_ID}.${this.APP_ID}.name`,
            type: this.APP_ID,
            inputs: [
                {
                    name: "instrument",
                    type: "select",
                    label: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.instrument.label`),
                    options: {
                        "bell": game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.instrument.bell`),
                        "piano": game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.instrument.piano`),
                        "flute": game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.instrument.flute`),
                        "christmas-bell": game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.instrument.christmas-bell`)
                    },
                    value: "bell"
                },
                {
                    name: "sequence",
                    type: "text",
                    label: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.sequence.label`),
                    notes: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.sequence.notes`),
                    value: ""
                },
                {
                    name: "description",
                    type: "text",
                    label: game.i18n.localize(`${MODULE_ID}.general-lock-config.description.label`),
                    value: ""
                }
            ]
        };
    }

    static get defaultState() {
        return {
            currentSequence: []
        };
    }

    get defaultPrimaryColor() {
        return "gold";
    }

    async getData() {
        const data = await super.getData();
        const notes = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Si"];
        data.bells = notes.map((note, i) => ({
            id: i + 1,
            label: note
        }));
        return data;
    }

    async activateListeners(html) {
        super.activateListeners(html);
        html = html[0] ?? html;
        
        html.querySelectorAll(".bell-btn").forEach(btn => {
            btn.addEventListener("click", (e) => this._onBellClick(e));
        });
        
        html.querySelector(".reset-sequence")?.addEventListener("click", (e) => {
            e.preventDefault();
            if (this.state) {
                this.state.currentSequence = [];
                this.updateState();
            }
            ui.notifications.info(game.i18n.localize(`${MODULE_ID}.notifications.resetSuccess`));
        });
    }

    async _onBellClick(event) {
        event.preventDefault();
        const btn = event.currentTarget;
        const index = parseInt(btn.dataset.index);
        
        const config = await this._loadState();
        const notes = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Si"];
        this._generateSound(index, notes.length, config.instrument);
        
        // Update sequence
        if (!this.state) this.state = await this._loadState();
        const sequence = this.state.currentSequence || [];
        sequence.push(notes[index - 1]);
        this.state.currentSequence = sequence;
    }

    async _getState() {
        const state = await super._getState();
        state.currentSequence = this.state?.currentSequence || [];
        return state;
    }
    
    async _loadState() {
        const state = await super._loadState();
        if (!Array.isArray(state.currentSequence)) state.currentSequence = [];
        return state;
    }

    async isUnlocked() {
        const { config, current } = await this.getAllData();
        const solutionStr = config.sequence || "";
        const solution = solutionStr.split(",").map(s => s.trim().toLowerCase()).filter(n => n);
        const attempt = current.currentSequence || [];
        
        if (solution.length === 0) return false;
        if (attempt.length !== solution.length) return false;
        
        return attempt.every((val, i) => String(val).trim().toLowerCase() === solution[i]);
    }
    
    async _onUnlockAttempt() {
        const unlocked = await this.isUnlocked();
        const result = await super._onUnlockAttempt();
        if (!unlocked && this.state) {
            this.state.currentSequence = [];
        }
        return result;
    }

    _generateSound(index, total, type) {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = this.audioContext;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        // Cálculo de frecuencia (Escala Mayor aproximada comenzando en C4)
        // Pasos en semitonos: 2, 2, 1, 2, 2, 2, 1
        const scale = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19];
        const semitones = scale[(index - 1) % scale.length] + (12 * Math.floor((index - 1) / scale.length));
        const freq = 261.63 * Math.pow(2, semitones / 12);
        
        osc.frequency.value = freq;
        const now = ctx.currentTime;
        
        if (type === "piano") {
            osc.type = "triangle";
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.8, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
        } else if (type === "christmas-bell") {
            osc.type = "sine";
            
            // Oscilador secundario para el brillo agudo (cascabel)
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = "sine";
            osc2.frequency.value = freq * 4; // 2 octavas arriba
            
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.5, now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
            
            gain2.gain.setValueAtTime(0, now);
            gain2.gain.linearRampToValueAtTime(0.3, now + 0.01);
            gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            
            osc2.start(now);
            osc2.stop(now + 2.5);
        } else if (type === "flute") {
            osc.type = "sine";
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.5, now + 0.1);
            gain.gain.setValueAtTime(0.5, now + 0.3);
            gain.gain.linearRampToValueAtTime(0, now + 0.5);
        } else {
            // Campana (Bell) - Por defecto
            osc.type = "sine";
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(1, now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
        }
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 2.5);
    }
    
    async close(options) {
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        return super.close(options);
    }
}