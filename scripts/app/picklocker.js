import { MODULE_ID } from "../main.js";
import { BasePuzzleLock } from "./BasePuzzleLock.js";

export class PickLock extends BasePuzzleLock {
    static get APP_ID() {
        return "pick-lock";
    }

    static get REQUIRES_CONTEXT() {
        return false;
    }

    get formConfiguration() {
        const state = this.document.getFlag(MODULE_ID, this.APP_ID) || {};
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
        ];

        // Add per-pin angle inputs so GMs can configure each pin's sweet spot.
        for (let i = 1; i <= numPins; i++) {
            const pinKey = `pin${i}`;
            const defaultAngle = state[pinKey] !== undefined ? state[pinKey] : 0;
            const minKey = `pin${i}TensionMin`;
            const maxKey = `pin${i}TensionMax`;
            const defaultMin = state[minKey] !== undefined ? state[minKey] : (state.tensionMin !== undefined ? state.tensionMin : 0);
            const defaultMax = state[maxKey] !== undefined ? state[maxKey] : (state.tensionMax !== undefined ? state.tensionMax : 0);

            inputs.push({
                name: `pin${i}Config`,
                type: "custom",
                html: `
                <div class="form-group">
                    <label>${game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.pin`)} ${i}</label>
                    <div class="form-fields">
                        <div style="display:flex; flex-direction:column; align-items:center; margin-right: 5px;">
                            <span style="font-size:0.8em">${game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.pinConfig.angle`)}</span>
                            <input type="number" name="${pinKey}" value="${defaultAngle}" min="0" max="359" step="5" style="text-align: center;">
                        </div>
                        <div style="display:flex; flex-direction:column; align-items:center; margin-right: 5px;">
                            <span style="font-size:0.8em">${game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.pinConfig.minTension`)}</span>
                            <input type="number" name="${minKey}" value="${defaultMin}" min="0" max="100" step="5" style="text-align: center;">
                        </div>
                        <div style="display:flex; flex-direction:column; align-items:center;">
                            <span style="font-size:0.8em">${game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.pinConfig.maxTension`)}</span>
                            <input type="number" name="${maxKey}" value="${defaultMax}" min="0" max="100" step="5" style="text-align: center;">
                        </div>
                    </div>
                </div>`
            });
        }
        return {
            type: this.APP_ID,
            inputs,
        };
    }

    static get defaultState() {
        return {
            pins: [],
            currentAngle: 0,
            currentTension: 0,
            numPins: 5,
        };
    }

    get defaultPrimaryColor() {
        return "gray";
    }

    async _loadState() {
        const state = await super._loadState();
        const savedPins = state.pins || [];
        // Always (re)generate pins based on the configured `numPins` so
        // changes in configuration are reflected immediately.
        const numPins = state.numPins || 5;
        const feedbackRange = state.feedbackRange || 20;
        state.pins = [];
        for (let i = 1; i <= numPins; i++) {
            const angle = state[`pin${i}`] !== undefined
                ? state[`pin${i}`]
                : 0;

            const tMin = state[`pin${i}TensionMin`] !== undefined ? state[`pin${i}TensionMin`] : (state.tensionMin || 0);
            const tMax = state[`pin${i}TensionMax`] !== undefined ? state[`pin${i}TensionMax`] : (state.tensionMax || 0);

            // Intentar preservar el offset si el rango no ha cambiado
            let offset;
            const savedPin = savedPins[i - 1];
            if (savedPin && savedPin.feedbackMin !== undefined && (savedPin.feedbackMax - savedPin.feedbackMin === feedbackRange)) {
                offset = savedPin.feedbackMin;
            } else {
                const steps = Math.floor(feedbackRange / 5) + 1;
                const randomStep = Math.floor(Math.random() * steps);
                offset = -(randomStep * 5);
            }

            state.pins.push({
                sweetSpot: angle,
                tensionMin: tMin,
                tensionMax: tMax,
                set: false,
                feedbackMin: offset,
                feedbackMax: offset + feedbackRange
            });
        }
        return state;
    }

    async activateListeners(html) {
        super.activateListeners(html);
        html = html[0] ?? html;

        // Inyectar estilos para la animación de parpadeo si no existen
        if (!document.getElementById("joker-locker-styles")) {
            const style = document.createElement("style");
            style.id = "joker-locker-styles";
            style.innerHTML = `
                @keyframes joker-locker-blink {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        const loadedState = await this._loadState();
        if (!this.state || this.state.numPins !== loadedState.numPins) {
            this.state = loadedState;
        }
        this.attemptCountedForAngle = false;

        const lockCylinder = $(html).find('.lock-cylinder')[0];
        const topIndicator = $(html).find('.top-indicator')[0];
        const topArrow = topIndicator ? topIndicator.querySelector('.top-arrow') : null;
        const topDegree = topIndicator ? topIndicator.querySelector('.top-degree') : null;
        const tensionBar = $(html).find('.tension-bar')[0];
        const rotateLeftBtn = $(html).find('.arrow.left')[0];
        const rotateRightBtn = $(html).find('.arrow.right')[0];

        let currentAngle = this.state.currentAngle || 0;

        const updateCylinder = () => {
            lockCylinder.style.transform = `rotate(${-currentAngle}deg)`;
            this.state.currentAngle = currentAngle;
            this.updateState();
            this.checkPins();
            updatePinsDisplay();

            if (topDegree) {
                const deg = ((currentAngle % 360) + 360) % 360;
                topDegree.textContent = `${Math.round(deg)}°`;
            }

            if (topArrow) {
                // Feedback visual: Flecha dorada, más grande y parpadeando si está cerca
                const normAngle = ((currentAngle % 360) + 360) % 360;
                let isNear = false;
                for (const pin of this.state.pins) {
                    // Calcular diferencia con signo considerando la rotación circular
                    let diff = (normAngle - pin.sweetSpot + 540) % 360 - 180;
                    
                    if (diff >= pin.feedbackMin && diff <= pin.feedbackMax) {
                        isNear = true;
                        break;
                    }
                }
                if (isNear) {
                    topArrow.style.setProperty("color", "#ffd700", "important");
                    topArrow.style.setProperty("text-shadow", "0 0 5px #ffd700", "important");
                    topArrow.style.setProperty("transform", "scale(1.3)", "important");
                    topArrow.style.setProperty("transform-origin", "center bottom", "important");
                    topArrow.style.setProperty("animation", "joker-locker-blink 1s infinite", "important");
                } else {
                    topArrow.style.removeProperty("color");
                    topArrow.style.removeProperty("text-shadow");
                    topArrow.style.removeProperty("transform");
                    topArrow.style.removeProperty("transform-origin");
                    topArrow.style.removeProperty("animation");
                }
            }
        };

        const updatePinsDisplay = () => {
            this.state.pins.forEach((pin, index) => {
                const pinElement = lockCylinder.querySelector(`.pin:nth-child(${index + 1})`);
                if (pinElement) {
                    pinElement.style.opacity = pin.set ? '1' : '0';
                    const pinBar = pinElement.querySelector('.pin-bar');
                    if (pinBar) {
                        pinBar.style.opacity = pin.set ? '1' : '0';
                    }
                }
            });
        };

        rotateLeftBtn.addEventListener('click', (e) => {
            this.attemptCountedForAngle = false;
            currentAngle += parseInt(e.target.dataset.direction);
            this.state.currentTension = 0; // Reset tension on rotation
            tensionBar.value = 0;
            updateCylinder();
        });

        rotateRightBtn.addEventListener('click', (e) => {
            this.attemptCountedForAngle = false;
            currentAngle += parseInt(e.target.dataset.direction);
            this.state.currentTension = 0; // Reset tension on rotation
            tensionBar.value = 0;
            updateCylinder();
        });

        tensionBar.addEventListener('change', async (e) => {
            const val = parseInt(e.target.value);
            this.state.currentTension = val;

            if (!this.attemptCountedForAngle && val > 0) {
                const normAngle = ((currentAngle % 360) + 360) % 360;
                let isValidAngle = false;
                for (const pin of this.state.pins) {
                    const diff = Math.abs(normAngle - pin.sweetSpot);
                    const dist = Math.min(diff, 360 - diff);
                    if (dist < 5) {
                        isValidAngle = true;
                        break;
                    }
                }
                if (!isValidAngle) {
                    this.attemptCountedForAngle = true;
                    this.state.currentTension = 0;
                    tensionBar.value = 0;
                    await this._onUnlockAttempt(null, false, true);
                    return;
                }
            }

            this.updateState();
            this.checkPins();
            updatePinsDisplay();
        });

        updateCylinder();
        updatePinsDisplay();
    }

    checkPins() {
        const currentAngle = ((this.state.currentAngle % 360) + 360) % 360;
        this.state.pins.forEach((pin, index) => {
            const angleDiff = Math.min(Math.abs(currentAngle - pin.sweetSpot), 360 - Math.abs(currentAngle - pin.sweetSpot));
            if (angleDiff < 5 && this.state.currentTension >= pin.tensionMin && this.state.currentTension <= pin.tensionMax && !pin.set) {
                pin.set = true;
                // this.playInteractionSound();
            }
        });
        this.updateState();
    }

    async getData() {
        const data = await super.getData();
        
        if (this.state && this.state.numPins === (data.numPins || 5)) {
            data.currentTension = this.state.currentTension;
            data.currentAngle = this.state.currentAngle;
            if (this.state.pins && data.pins) {
                data.pins.forEach((pin, i) => {
                    if (this.state.pins[i]) {
                        pin.set = this.state.pins[i].set;
                    }
                });
            }
        }

        data.tensionMin = data.tensionMin || 40;
        data.tensionMax = data.tensionMax || 60;
        data.numPins = data.numPins || 5;
        data.degrees = [];
        for (let i = 0; i < 360; i += 5) {
            data.degrees.push({ angle: i, label: `${i}°`, showLabel: i % 45 === 0 });
        }
        return data;
    }

    async isUnlocked() {
        if (this._forceLocked) return false;
        // Prefer the in-memory state updated during interaction so that
        // freshly-set pins are recognized immediately when the player
        // presses the Unlock button. Fall back to persisted flags if
        // the runtime state isn't available.
        const runtimePins = this.state?.pins;
        if (runtimePins && runtimePins.length) return runtimePins.every(pin => pin.set);
        const state = await this._loadState();
        return state.pins.every((pin) => pin.set);
    }

    async _onUnlockAttempt(event = null, reset = true, forceFail = false) {
        if (forceFail) this._forceLocked = true;
        const result = await super._onUnlockAttempt();
        if (forceFail) this._forceLocked = false;
        if (result === false) return;

        if (!(await this.isUnlocked())) {
            if (reset && this.state) {
                this.state.pins.forEach((pin) => (pin.set = false));
                this.state.currentAngle = 0;
                this.state.currentTension = 0;
                this.render(true);
            }
        }
    }
}