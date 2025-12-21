import { MODULE_ID } from "../main.js";
import { BasePuzzleLock } from "./BasePuzzleLock.js";

export class SoundLock extends BasePuzzleLock {
    static get formConfiguration() {
        return {
            title: `${MODULE_ID}.${this.APP_ID}.title`,
            type: this.APP_ID,
            inputs: [
                {
                    name: "sequence",
                    type: "text",
                    value: "G,A,F,-F,C",
                    notes: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.sequence.notes`),
                },
                {
                    name: "chordDuration",
                    type: "number",
                    notes: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.chordDuration.notes`),
                    value: 500,
                },
                {
                    name: "pauseBetweenNotes",
                    type: "number",
                    notes: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.pauseBetweenNotes.notes`),
                    value: 100,
                },
            ],
        };
    }

    static get defaultState() {
        return {
            currentNotes: [],
        };
    }

    get defaultPrimaryColor() {
        return "magenta";
    }

    async activateListeners(html) {
        super.activateListeners(html);
        html = html[0] ?? html;
        html.querySelector(".sequence-container").addEventListener("click", async (event) => {
            const state = await this._loadState();
            this.playSequence(
                state.sequence.split(",").map((s) => s.trim()),
                state.chordDuration,
                state.pauseBetweenNotes,
            );
        });
        html.querySelectorAll(".chord-selector").forEach((chord) => {
            chord.addEventListener("mouseup", async (event) => {
                this.playInteractionSound();
                const current = chord.dataset.chord;
                const chordIndex = NOTES.findIndex((note) => note === current);
                if (event.button === 0) {
                    const nextNote = NOTES[(chordIndex + 1) % NOTES.length];
                    chord.dataset.chord = nextNote;
                } else {
                    const nextNote = NOTES[(chordIndex - 1 + NOTES.length) % NOTES.length];
                    chord.dataset.chord = nextNote;
                }
                this.updateState();
            });
        });
    }

    async _getState() {
        const state = await super._getState();
        const html = this.element[0];
        const chords = html.querySelectorAll(".chord-selector");
        const solution = Array.from(chords).map((chord) => chord.dataset.chord);
        state.currentNotes = solution;
        return foundry.utils.expandObject(state);
    }

    async _loadState() {
        const state = await super._loadState();
        const sequence = state.sequence ?? "";
        const rawSequence = sequence.split(",").map((note) => note.trim());
        const sequenceArray = rawSequence.map(getMIDIValue);
        const sequenceArrayNoNaN = sequenceArray.filter((midi) => !isNaN(midi));
        const midiMax = Math.max(...sequenceArrayNoNaN);
        const midiMin = Math.min(...sequenceArrayNoNaN);
        //normalize the sequence to be between 0 and 1
        const normalizedSequence = sequenceArray.map((midi) => (midi - midiMin) / (midiMax - midiMin));

        const sequenceDisplay = [];

        for (let i = 0; i < normalizedSequence.length; i++) {
            sequenceDisplay.push({
                index: i,
                note: rawSequence[i],
                midi: sequenceArray[i],
                normalized: normalizedSequence[i] * 100,
                isPause: rawSequence[i].includes("P"),
            });
        }

        state.sequenceDisplay = sequenceDisplay;

        const currentNotes = state.currentNotes ?? [];

        const displayNotes = [];

        for (let i = 0; i < sequenceArrayNoNaN.length; i++) {
            displayNotes.push({
                value: currentNotes[i] ?? NOTES[0],
            });
        }

        state.displayNotes = displayNotes;

        return state;
    }

    async isUnlocked() {
        const { config, current } = await this.getAllData();
        const solution = await this.getSolutionArray();
        return config.sequence.replaceAll(" ", "") === solution.join(",").replaceAll(" ", "");
    }

    async _onUnlockAttempt() {
        const result = await super._onUnlockAttempt();
        if (result !== false) {
            this.playCurrentAttempt();
        }
    }

    async getSolutionArray() {
        const sortedNotes = [...NOTES].sort((a, b) => (a.includes("#") ? -1 : 1));
        const state = await this._loadState();
        const sequence = state.sequence.split(",").map((s) => s.trim());
        const currentSolution = state.currentNotes;
        let i = 0;
        const solution = [];
        for (let note of sequence) {
            const solutionNote = currentSolution[i];
            if (!note.includes("P")) {
                i++;
            }
            const noteChord = sortedNotes.find((n) => note.includes(n));
            solution.push(note.replace(noteChord, solutionNote));
        }
        return solution;
    }

    async playCurrentAttempt() {
        const solution = await this.getSolutionArray();
        const state = await this._loadState();
        this.playSequence(solution, state.chordDuration, state.pauseBetweenNotes);
    }

    playSequence(sequence = [], duration = 500, pauseBetweenNotes = 100, waveType = "square") {
        let currentTime = 0;
        sequence.forEach((note, index) => {
            const noteDuration = parseInt(note.match(/\d+/)?.[0] ?? 0) || duration;
            if (!note.includes("P")) {
                //highlight element
                const chordElement = this.element[0].querySelector(`.chord-container[data-index="${index}"]`);
                setTimeout(() => {
                    playChord(note, noteDuration, waveType);
                    chordElement?.animate([{ filter: "brightness(1)" }, { filter: "brightness(2)" }, { filter: "brightness(1)" }], {
                        duration: noteDuration,
                        iterations: 1,
                    });
                }, currentTime);
            }
            currentTime += noteDuration + pauseBetweenNotes;
        });
    }
}

//audio handling

let audioCTX;

function getAudioContext() {
    const ctxClass = window.audioContext || window.AudioContext || window.AudioContext || window.webkitAudioContext;
    if (!audioCTX) {
        audioCTX = new ctxClass();
    }
    return audioCTX;
}

function playTone(frequency, duration, waveType = "square") {
    const maxVolume = game.settings.get("core", "globalInterfaceVolume");
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const delayNode = ctx.createDelay();
    osc.type = waveType;
    osc.frequency.value = frequency;
    osc.connect(gainNode);
    gainNode.connect(delayNode);
    gainNode.connect(ctx.destination);

    const attackTime = 0.2;
    const releaseTime = 0.2;
    const sustainLevel = 0.5 * maxVolume;

    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(1 * maxVolume, now + attackTime);
    gainNode.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + releaseTime);
    gainNode.gain.linearRampToValueAtTime(0, now + duration / 1000);
    delayNode.delayTime.value = 0.03;

    osc.start();
    osc.stop(now + duration / 1000);
}

function cleanNoteString(note) {
    note = note.replace(/\d+/g, "");
    note = note.replace(/\+|-/g, "");
    return note;
}

function getMIDIValue(note) {
    let octave = 0;
    if (note.includes("+")) {
        octave += note.match(/\+/g).length;
    }
    if (note.includes("-")) {
        octave -= note.match(/-/g).length;
    }
    note = note.replace(/\+|-/g, "");
    note = note.replace(/\d+/g, "");
    return majorChords[note] + 12 * octave;
}

function playChord(chord, duration, waveType = "square") {
    chord = chord.replace(/\d+/g, "");

    let octave = 0;
    if (chord.includes("+")) {
        octave = chord.match(/\+/g).length;
    }
    if (chord.includes("-")) {
        octave -= chord.match(/-/g).length;
    }
    chord = chord.replace(/\+|-/g, "");
    const chordFrequencies = majorChordFrequencies(majorChords[chord] + 12 * octave);
    chordFrequencies.forEach((frequency) => playTone(frequency, duration, waveType));
}

function noteToFrequency(note) {
    const A4Frequency = 440; // A4 note frequency in Hz
    const semitoneRatio = Math.pow(2, 1 / 12); // The ratio of a semitone in frequency
    const distanceFromA4 = note - 69; // 69 is MIDI note number for A4
    const frequency = A4Frequency * Math.pow(semitoneRatio, distanceFromA4);
    return frequency;
}

function majorChordFrequencies(rootNote) {
    const chordNotes = [rootNote, rootNote + 4, rootNote + 7]; // Major chord intervals
    const chordFrequencies = chordNotes.map((note) => noteToFrequency(note));
    return chordFrequencies;
}

const majorChords = {
    C: 60,
    "C#": 61,
    D: 62,
    "D#": 63,
    E: 64,
    F: 65,
    "F#": 66,
    G: 67,
    "G#": 68,
    A: 69,
    "A#": 70,
    B: 71,
};

const NOTES = Object.keys(majorChords);
