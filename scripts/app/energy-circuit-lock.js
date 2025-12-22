import { MODULE_ID } from "../main.js";
import { BasePuzzleLock } from "./BasePuzzleLock.js";
import { Socket } from "../lib/socket.js";

export class EnergyCircuitLock extends BasePuzzleLock {
    static get APP_ID() {
        return "energy-circuit-lock";
    }

    static get APP_NAME() {
        return game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.name`);
    }

    static get formConfiguration() {
        return {
            title: `${MODULE_ID}.${this.APP_ID}.name`,
            type: this.APP_ID,
            inputs: [
                {
                    name: "gridSize",
                    type: "number",
                    label: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.gridSize.label`),
                    notes: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.gridSize.notes`),
                    value: 5,
                    min: 5,
                    max: 25,
                    step: 1
                },
                {
                    name: "timeLimit",
                    type: "number",
                    label: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.timeLimit.label`),
                    notes: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.timeLimit.notes`),
                    value: 60,
                    min: 30,
                    max: 300,
                    step: 5
                }
            ]
        };
    }

    static get defaultState() {
        return {
            grid: [],
            startTime: null,
            gameOver: false,
            savedGridSize: 5,
            savedTimeLimit: 60,
            accumulatedTime: 0
        };
    }

    get defaultPrimaryColor() {
        return "#00e5ff";
    }

    async getData() {
        const data = await super.getData();

        // Calcular tiempo restante
        const timeLimit = parseInt(data.timeLimit) || 60;
        let timeLeft = timeLimit;
        
        const accumulated = data.accumulatedTime || 0;
        const currentSession = data.startTime ? (Date.now() - data.startTime) : 0;
        const elapsed = (accumulated + currentSession) / 1000;
        timeLeft = Math.max(0, Math.ceil(timeLimit - elapsed));
        
        data.timeLeft = timeLeft;
        data.gridSize = parseInt(data.gridSize) || 5;

        // Verificar si está resuelto para mostrar botón de reinicio
        if (data.grid && data.grid.length > 0) {
            const sink = data.grid.find(n => n.type === 'sink');
            if (sink && sink.powered) {
                data.isSolved = true;
            }
        }
        
        return data;
    }

    async _loadState() {
        const state = await super._loadState();
        
        // Si hay grid, calcular la energía para la visualización
        if (state.grid && state.grid.length > 0) {
            const size = Math.sqrt(state.grid.length);
            this._calculatePower(state.grid, size);
        }
        
        return state;
    }

    async activateListeners(html) {
        super.activateListeners(html);
        html = html[0] ?? html;

        // Check attempts to hide reset button
        let attempts = this.document.getFlag(MODULE_ID, `${this.APP_ID}.attempts`);
        if (attempts === undefined || attempts === null) {
            attempts = this.document.getFlag(MODULE_ID, "general.attempts");
        }
        attempts = attempts ?? -1;
        if (attempts === 0) {
            const restartBtn = html.querySelector('.restart-puzzle');
            if (restartBtn) restartBtn.style.display = 'none';
        }
        
        const state = await this._loadState();
        const config = this.document.getFlag(MODULE_ID, this.constructor.APP_ID) || {};
        const gridSize = parseInt(config.gridSize) || 5;
        const timeLimit = parseInt(config.timeLimit) || 60;

        // Inicializar puzzle si está vacío o si la configuración ha cambiado
        if (!state.grid || state.grid.length === 0 || state.savedGridSize !== gridSize || state.savedTimeLimit !== timeLimit) {
            if (game.user.isGM || !state.startTime) {
                await this.resetPuzzle();
                return;
            }
        }

        // Verificar si el juego terminó para bloquear interacción
        if (state.gameOver) {
            this._timerExpired = true;
        } else {
            this._timerExpired = false;
            
            // Check if solved
            let isSolved = false;
            if (state.grid && state.grid.length > 0) {
                const sink = state.grid.find(n => n.type === 'sink');
                if (sink && sink.powered) isSolved = true;
            }

            // Iniciar Timer solo si no ha terminado
            if (state.startTime) {
                this._startTimer(html);
            } else if (state.accumulatedTime > 0 && !isSolved) {
                await this._updateState({ startTime: Date.now() });
                return;
            }
        }

        // Listeners de interacción
        html.querySelectorAll('.node').forEach(node => {
            node.addEventListener('click', async (e) => {
                e.preventDefault();
                if (this._timerExpired) return;
                
                // Verificar estado actual por seguridad
                const currentState = await this._loadState();
                if (currentState.gameOver) {
                    this._timerExpired = true;
                    return;
                }

                const index = parseInt(node.dataset.index);
                await this.rotateNode(index);
            });
        });

        // Botón de reinicio
        html.querySelector('.restart-puzzle')?.addEventListener('click', async (e) => {
            e.preventDefault();
            await this.resetPuzzle();
        });
    }

    _startTimer(html) {
        if (this.timerInterval) clearInterval(this.timerInterval);
        
        const timerDisplay = html.querySelector('#circuit-timer span');
        const config = this.document.getFlag(MODULE_ID, this.constructor.APP_ID) || {};
        const timeLimit = parseInt(config.timeLimit) || 60;
        
        this.timerInterval = setInterval(async () => {
            // Leer estado actual para asegurar sincronización
            const state = await this._loadState();

            // Si ya terminó el juego (por otra instancia o recarga), detener timer
            if (state.gameOver) {
                clearInterval(this.timerInterval);
                this._timerExpired = true;
                return;
            }

            // Verificar si ya está resuelto para detener el timer
            if (state.grid && state.grid.length > 0) {
                const sink = state.grid.find(n => n.type === 'sink');
                if (sink && sink.powered) {
                    clearInterval(this.timerInterval);
                    return;
                }
            }

            const accumulated = state.accumulatedTime || 0;
            const currentSession = state.startTime ? (Date.now() - state.startTime) : 0;
            const elapsed = (accumulated + currentSession) / 1000;
            const timeLeft = Math.max(0, Math.ceil(timeLimit - elapsed));
            
            if (timerDisplay) timerDisplay.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(this.timerInterval);
                this._timerExpired = true;
                // Si se acaba el tiempo y no estaba resuelto, fallar y reiniciar
                if (!await this.isUnlocked()) {
                    await this._handleTimeout();
                }
            }
        }, 1000);
    }

    async _handleTimeout() {
        // Registrar intento fallido (consume intentos y notifica)
        await this._onUnlockAttempt();
        const state = await this._loadState();
        const accumulated = (state.accumulatedTime || 0) + (state.startTime ? Date.now() - state.startTime : 0);
        // Marcar como Game Over en lugar de reiniciar automáticamente
        await this._updateState({
            gameOver: true,
            startTime: null,
            accumulatedTime: accumulated
        });
    }

    async resetPuzzle() {
        const config = this.document.getFlag(MODULE_ID, this.constructor.APP_ID) || {};
        const size = parseInt(config.gridSize) || 5;
        const timeLimit = parseInt(config.timeLimit) || 60;
        const newGrid = this._generateGrid(size);
        
        await this._updateState({
            grid: newGrid,
            startTime: null,
            gameOver: false,
            savedGridSize: size,
            savedTimeLimit: timeLimit,
            accumulatedTime: 0
        });
        
        this._timerExpired = false;
        // No iniciar timer hasta el primer movimiento
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
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

    async rotateNode(index) {
        const state = await this._loadState();
        const grid = state.grid;
        if (!grid || !grid[index]) return;
        
        // Impedir rotación de nodos Source y Sink
        if (grid[index].type === 'source' || grid[index].type === 'sink') return;

        // Rotar 90 grados
        grid[index].rotation = (grid[index].rotation + 90) % 360;
        
        // Recalcular estado de energía para verificar si se resolvió
        const size = Math.sqrt(grid.length);
        this._calculatePower(grid, size);
        
        const sink = grid.find(n => n.type === 'sink');
        const isSolved = sink && sink.powered;

        const updates = { grid };
        
        if (isSolved) {
            if (state.startTime) {
                const accumulated = (state.accumulatedTime || 0) + (Date.now() - state.startTime);
                updates.startTime = null;
                updates.accumulatedTime = accumulated;
            }
        } else if (!state.startTime) {
            updates.startTime = Date.now();
        }
        
        // Actualizar estado (esto disparará _loadState y _calculatePower en el re-render)
        await this._updateState(updates);
        
        // Reproducir sonido (opcional, si BasePuzzleLock tiene método)
        this.playInteractionSound();
    }

    async isUnlocked() {
        const state = await this._loadState();
        if (!state.grid || state.grid.length === 0) return false;
        
        // Recalcular poder para asegurar estado actual
        const size = Math.sqrt(state.grid.length);
        this._calculatePower(state.grid, size);
        
        // Buscar nodo final (Sink) y ver si tiene energía
        const sink = state.grid.find(n => n.type === 'sink');
        return sink && sink.powered;
    }

    async close(options) {
        if (this.timerInterval) clearInterval(this.timerInterval);
        
        const state = await this._loadState();
        if (state.startTime && !state.gameOver) {
            const accumulated = (state.accumulatedTime || 0) + (Date.now() - state.startTime);
            await this._updateState({
                startTime: null,
                accumulatedTime: accumulated
            });
        }
        return super.close(options);
    }

    // --- Lógica del Puzzle (Generación y BFS) ---

    _generateGrid(size) {
        let grid = Array(size * size).fill(null).map((_, i) => ({
            row: Math.floor(i / size),
            col: i % size,
            type: 'empty',
            rotation: 0,
            connections: 0,
            powered: false
        }));

        const startNode = { r: 0, c: 0 };
        const endNode = { r: size - 1, c: size - 1 };

        // 1. Generar camino válido (Random Walk)
        let current = { ...startNode };
        let path = [current];
        let visited = new Set([`${current.r},${current.c}`]);

        while (current.r !== endNode.r || current.c !== endNode.c) {
            let moves = [];
            if (current.r < endNode.r) moves.push({ r: current.r + 1, c: current.c });
            if (current.r > endNode.r) moves.push({ r: current.r - 1, c: current.c });
            if (current.c < endNode.c) moves.push({ r: current.r, c: current.c + 1 });
            if (current.c > endNode.c) moves.push({ r: current.r, c: current.c - 1 });
            
            // Añadir aleatoriedad
            if (Math.random() > 0.3) {
                const neighbors = [
                    { r: current.r + 1, c: current.c }, { r: current.r - 1, c: current.c },
                    { r: current.r, c: current.c + 1 }, { r: current.r, c: current.c - 1 }
                ];
                moves.push(...neighbors);
            }

            moves = moves.filter(m => 
                m.r >= 0 && m.r < size && 
                m.c >= 0 && m.c < size && 
                !visited.has(`${m.r},${m.c}`)
            );

            if (moves.length === 0) return this._generateGrid(size); // Reiniciar si se atasca

            current = moves[Math.floor(Math.random() * moves.length)];
            visited.add(`${current.r},${current.c}`);
            path.push(current);
        }

        // 2. Asignar piezas al camino
        for (let i = 0; i < path.length; i++) {
            const node = path[i];
            const prev = i > 0 ? path[i - 1] : null;
            const next = i < path.length - 1 ? path[i + 1] : null;
            const index = node.r * size + node.c;

            if (!prev) {
                grid[index].type = 'source';
                // Orientar fuente
                if (next.r > node.r) grid[index].rotation = 0;
                else if (next.r < node.r) grid[index].rotation = 180;
                else if (next.c > node.c) grid[index].rotation = 270;
                else grid[index].rotation = 90;
            } else if (!next) {
                grid[index].type = 'sink';
                // Orientar sumidero
                if (prev.r < node.r) grid[index].rotation = 0;
                else if (prev.r > node.r) grid[index].rotation = 180;
                else if (prev.c < node.c) grid[index].rotation = 270;
                else grid[index].rotation = 90;
            } else {
                const d1 = { r: prev.r - node.r, c: prev.c - node.c };
                const d2 = { r: next.r - node.r, c: next.c - node.c };
                const isStraight = (d1.r === -d2.r && d1.c === -d2.c);
                
                if (isStraight) {
                    grid[index].type = 'straight';
                    grid[index].rotation = (d1.r !== 0) ? 0 : 90;
                } else {
                    grid[index].type = 'corner';
                    let mask = 0;
                    if (d1.r === -1 || d2.r === -1) mask |= 1; // Top
                    if (d1.c === 1 || d2.c === 1) mask |= 2;   // Right
                    if (d1.r === 1 || d2.r === 1) mask |= 4;   // Bottom
                    if (d1.c === -1 || d2.c === -1) mask |= 8; // Left
                    
                    if (mask === 3) grid[index].rotation = 0;
                    else if (mask === 6) grid[index].rotation = 90;
                    else if (mask === 12) grid[index].rotation = 180;
                    else if (mask === 9) grid[index].rotation = 270;
                }
            }
        }

        // 3. Rellenar vacíos
        // Aumentar dificultad con más piezas complejas
        const pieceTypes = ['corner', 'straight'];
        grid.forEach(cell => {
            if (cell.type === 'empty') {
                cell.type = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
                cell.rotation = Math.floor(Math.random() * 4) * 90;
            }
        });

        // 4. Barajar rotaciones (excepto Source/Sink para asegurar que sea resoluble y fijo)
        grid.forEach(cell => {
            if (cell.type !== 'source' && cell.type !== 'sink') {
                cell.rotation = Math.floor(Math.random() * 4) * 90;
            }
        });

        return grid;
    }

    _calculatePower(grid, size) {
        // Definición de piezas y conexiones (T, R, B, L)
        const PIECES = {
            'straight': 5,  // 0101
            'corner': 3,    // 0011
            'tshape': 7,    // 0111
            'cross': 15,    // 1111
            'source': 4,    // 0100 (Salida Sur por defecto)
            'sink': 1       // 0001 (Entrada Norte por defecto)
        };

        // Resetear
        grid.forEach(c => {
            c.powered = false;
            // Calcular máscara actual basada en rotación
            const baseMask = PIECES[c.type] || 0;
            const rotSteps = (c.rotation / 90) % 4;
            c.connections = ((baseMask << rotSteps) | (baseMask >> (4 - rotSteps))) & 15;
        });

        // BFS desde Source
        const sourceNode = grid.find(n => n.type === 'source');
        if (!sourceNode) return;

        const queue = [sourceNode];
        sourceNode.powered = true;
        const visited = new Set([`${sourceNode.row},${sourceNode.col}`]);

        while (queue.length > 0) {
            const curr = queue.shift();
            const { row: r, col: c } = curr;

            const neighbors = [
                { r: r - 1, c: c, dir: 1, opp: 4 }, // Top
                { r: r, c: c + 1, dir: 2, opp: 8 }, // Right
                { r: r + 1, c: c, dir: 4, opp: 1 }, // Bottom
                { r: r, c: c - 1, dir: 8, opp: 2 }  // Left
            ];

            for (const n of neighbors) {
                if (n.r >= 0 && n.r < size && n.c >= 0 && n.c < size) {
                    const nIdx = n.r * size + n.c;
                    const nCell = grid[nIdx];

                    // Verificar conexión mutua
                    if ((curr.connections & n.dir) && (nCell.connections & n.opp)) {
                        const key = `${n.r},${n.c}`;
                        if (!visited.has(key)) {
                            nCell.powered = true;
                            visited.add(key);
                            queue.push(nCell);
                        }
                    }
                }
            }
        }
    }
}