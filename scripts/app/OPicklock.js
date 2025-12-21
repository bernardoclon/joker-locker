import { MODULE_ID } from "../main.js";
import { BasePuzzleLock } from "./BasePuzzleLock.js";
import { Socket } from "../lib/socket.js";

export class FCerradura2 extends BasePuzzleLock {
    static get APP_ID() {
        return "f-cerradura-2";
    }

    static get REQUIRES_CONTEXT() {
        return false;
    }

    get formConfiguration() {
        const state = this.document.getFlag(MODULE_ID, this.APP_ID) || this.constructor.defaultState;
        const numPins = state.numPins || 5;
        const inputs = [
            {
                name: "numPins",
                type: "number",
                label: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.numPins.label`),
                value: numPins,
                min: 1,
                max: 10,
                step: 1,
            },
            {
                name: "feedbackRange",
                type: "number",
                label: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.feedbackRange.label`),
                value: state.feedbackRange !== undefined ? state.feedbackRange : 20,
                min: 10,
                max: 20,
                step: 5,
            },
            {
                name: "tensionMin",
                type: "number",
                label: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.tensionMin.label`),
                value: state.tensionMin !== undefined ? state.tensionMin : 40,
                min: 0,
                max: 100,
                step: 1,
            },
            {
                name: "tensionMax",
                type: "number",
                label: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.tensionMax.label`),
                value: state.tensionMax !== undefined ? state.tensionMax : 60,
                min: 0,
                max: 100,
                step: 1,
            },
        ];

        // Configurar altura de cada pin
        for (let i = 1; i <= numPins; i++) {
            const pinKey = `pin${i}Height`;
            const defaultHeight = state[pinKey] !== undefined ? state[pinKey] : 30 + i * 5;
            inputs.push({
                name: pinKey,
                type: "number",
                label: game.i18n.format(`${MODULE_ID}.${this.APP_ID}.pinHeight.label`, { number: i }),
                value: defaultHeight,
                min: 0,
                max: 100,
                step: 5,
            });
        }
        return {
            type: this.APP_ID,
            description: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.description`),
            playerInfo: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.playerInfo`),
            inputs,
        };
    }

    static get defaultState() {
        return {
            pins: [],
            currentTension: 0,
            numPins: 5,
            tensionMin: 40,
            tensionMax: 60,
            pin1Height: 30,
            pin2Height: 40,
            pin3Height: 50,
            pin4Height: 35,
            pin5Height: 45,
        };
    }

    get defaultPrimaryColor() {
        return "silver";
    }

    async _updateState(updates) {
        const current = await this._loadState();
        const newState = foundry.utils.mergeObject(current, updates);
        const data = {
            flags: {
                [MODULE_ID]: {
                    [this.APP_ID]: newState,
                },
            },
        };
        await Socket.routeUpdate({ uuid: this.document.uuid, data }, { users: this.UPDATE_AUTHORITY });
    }

    async _loadState() {
        const state = await super._loadState();
        const numPins = state.numPins || 5;
        const feedbackRange = state.feedbackRange || 20;

        // Asegurar valores por defecto para compatibilidad con datos existentes
        if (state.tensionMin === undefined) state.tensionMin = 40;
        if (state.tensionMax === undefined) state.tensionMax = 60;
        if (state.currentTension === undefined) state.currentTension = 0;

        if (!state.pins || state.pins.length !== numPins) {
            state.pins = [];
            for (let i = 1; i <= numPins; i++) {
                state.pins.push({
                    currentHeight: 0,
                    set: false,
                });
            }
        }

        for (let i = 1; i <= numPins; i++) {
            const height = state[`pin${i}Height`] !== undefined ? state[`pin${i}Height`] : 30 + i * 5;
            if (state.pins[i - 1]) state.pins[i - 1].height = height;
            if (state.pins[i - 1]) state.pins[i - 1].set = state.pins[i - 1].currentHeight === height;

            // Recalcular si no existe o si el rango configurado ha cambiado
            const currentRange = state.pins[i - 1].feedbackMax - state.pins[i - 1].feedbackMin;
            if (state.pins[i - 1] && (state.pins[i - 1].feedbackMin === undefined || currentRange !== feedbackRange)) {
                const steps = Math.floor(feedbackRange / 5) + 1;
                const randomStep = Math.floor(Math.random() * steps);
                const offset = -(randomStep * 5);
                state.pins[i - 1].feedbackMin = offset;
                state.pins[i - 1].feedbackMax = offset + feedbackRange;
            }
        }
        return state;
    }

    async getData() {
        const data = await super.getData();
        data.pins.forEach((pin, index) => {
            pin.number = index + 1;
            pin.currentHeight = Math.max(0, Math.min(100, pin.currentHeight));
            pin.currentHeightPercent = pin.currentHeight + '%';
        });
        data.currentTension = Math.max(0, Math.min(100, data.currentTension));
        return data;
    }

    async activateListeners(html) {
        super.activateListeners(html);
        html = html[0] ?? html;

        if (!this.state) {
            this.state = await this._loadState();
        }

        // Función para actualizar visualmente (sin guardar estado todavía)
        const updateVisuals = (event, container) => {
            const rect = container.getBoundingClientRect();
            const y = event.clientY - rect.top;
            const height = rect.height;
            let value = Math.max(0, Math.min(100, Math.round(((height - y) / height) * 100)));
            value = Math.round(value / 5) * 5;
            const index = parseInt(container.dataset.index);
            const pin = this.state.pins[index];
            
            const fill = container.querySelector('.pin-fill');
            if (fill && pin) {
                fill.style.bottom = `clamp(0px, calc(${value}% - 10px), calc(100% - 20px))`;
                const target = pin.height;
                const diff = value - target;
                if (diff >= pin.feedbackMin && diff <= pin.feedbackMax) {
                    fill.style.background = "linear-gradient(90deg, #b8860b, #ffd700, #b8860b)";
                    fill.style.setProperty("box-shadow", "0 0 10px #ffd700", "important");
                } else {
                    fill.style.background = "linear-gradient(90deg, #777, #ccc, #777)";
                    fill.style.removeProperty("box-shadow");
                }
            }
            
            // Actualizar texto de altura en tiempo real
            const wrapper = container.closest('.pin-wrapper');
            if (wrapper) {
                const info = wrapper.querySelector('.pin-info span:last-child');
                if (info) info.textContent = value;
            }
            return value;
        };

        // Listeners para los contenedores de barras de pin
        html.querySelectorAll('.pin-bar-container').forEach((container, index) => {
            container.addEventListener('mousedown', (event) => {
                event.preventDefault();
                let lastValue = updateVisuals(event, container);
                
                const onMouseMove = (e) => {
                    e.preventDefault();
                    lastValue = updateVisuals(e, container);
                };
                
                const onMouseUp = (e) => {
                    window.removeEventListener('mousemove', onMouseMove);
                    window.removeEventListener('mouseup', onMouseUp);

                    const fill = container.querySelector('.pin-fill');
                    if (fill) {
                        fill.style.background = "linear-gradient(90deg, #777, #ccc, #777)";
                        fill.style.removeProperty("box-shadow");
                    }

                    this.setPinHeight(index, lastValue);
                };

                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
            });
        });

        // Listener para tensión
        const tensionInput = html.querySelector('#tension');
        if (tensionInput) {
            tensionInput.addEventListener('change', (event) => {
                const value = parseInt(event.target.value);
                this.setTension(value);
            });
        }
    }

    async setPinHeight(index, value) {
        value = Math.max(0, Math.min(100, value));
        if (!this.state) this.state = await this._loadState();
        this.state.pins[index].currentHeight = value;
        this.state.pins[index].set = value === this.state.pins[index].height;
        await this._updateState({ pins: this.state.pins });
    }

    async setTension(value) {
        value = Math.max(0, Math.min(100, value));
        const state = await this._loadState();
        state.currentTension = value;
        await this._updateState({ currentTension: value });
    }

    async isUnlocked() {
        const state = await this._loadState();
        const allCorrect = state.pins.every(pin => pin.set);
        const tensionOk = state.currentTension >= state.tensionMin && state.currentTension <= state.tensionMax;
        return allCorrect && tensionOk;
    }

    async _onUnlockAttempt() {
        const result = await super._onUnlockAttempt();
        if (result === false) return;

        if (!(await this.isUnlocked())) {
            const state = await this._loadState();
            state.pins.forEach((pin) => {
                pin.currentHeight = 0;
                pin.set = false;
            });
            state.currentTension = 0;
            await this._updateState({ pins: state.pins, currentTension: 0 });
            if (this.state) {
                this.state.pins.forEach((pin) => {
                    pin.currentHeight = 0;
                    pin.set = false;
                });
                this.state.currentTension = 0;
            }
            this.render(true);
        }
    }
}