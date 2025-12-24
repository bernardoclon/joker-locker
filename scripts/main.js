import { initConfig } from "./config.js";
import { registerSettings } from "./settings.js";
import { Socket } from "./lib/socket.js";
import { LOCK_DEFAULTS } from "./defaults.js";
import { BasePuzzleLock } from "./app/BasePuzzleLock.js";
import { NumberLock } from "./app/NumberLock.js";
import { PasswordLock } from "./app/PasswordLock.js";
import { ItemLock } from "./app/ItemLock.js";
import { SwitchesLock } from "./app/SwitchesLock.js";
import { CryptexLock } from "./app/CryptexLock.js";
import { SudokuLock } from "./app/SudokuLock.js";
import { ImageWheel } from "./app/ImageWheel.js";
import { MastermindLock } from "./app/MastermindLock.js";
import { FillBlanksLock } from "./app/FillBlanksLock.js";
import { MosaicLock } from "./app/MosaicLock.js";
import { SoundLock } from "./app/SoundLock.js";
import { FifteenLock } from "./app/FifteenLock.js";
import { FourByFourLock } from "./app/FourByFourLock.js";
import { MatchLock } from "./app/MatchLock.js";
import { PickLock } from "./app/picklocker.js";
import { FCerradura2 } from "./app/OPicklock.js";
import { CelticLock } from "./app/CelticLock.js";
import { JingleBells} from "./app/JingleBells.js";  
import { EnergyCircuitLock } from "./app/energy-circuit-lock.js";
import { ChemicalBalanceLock } from "./app/ChemicalBalanceLock.js";

export const MODULE_ID = "joker-locker";

export const LOCKS = {};

const LOCK_CLS = [NumberLock, PasswordLock, ItemLock, SwitchesLock, CryptexLock, SudokuLock, ImageWheel, MastermindLock, FillBlanksLock, MosaicLock, SoundLock, FifteenLock, FourByFourLock, MatchLock, PickLock, FCerradura2, CelticLock, JingleBells, EnergyCircuitLock, ChemicalBalanceLock];

export function registerLock(lockType, lockClass) {
    LOCKS[lockType] = lockClass;
}

export async function unlock(uuid) {
    uuid = uuid.uuid ?? uuid;
    //check for gm
    const document = await fromUuid(uuid);
    if (!game.users.find((u) => u.isGM && u.active) && !document.isOwner) return ui.notifications.error(game.i18n.localize(`${MODULE_ID}.notifications.noGM`));
    //check lock type
    const lockType = document.getFlag(MODULE_ID, "general.lockType") ?? "none";

    if (LOCK_DEFAULTS[lockType]) {
        const currentData = document.getFlag(MODULE_ID, lockType);
        if (foundry.utils.isEmpty(currentData)) {
            await document.setFlag(MODULE_ID, lockType, LOCK_DEFAULTS[lockType]);
        }
    }

    const lockClass = LOCKS[lockType];
    if (!lockClass) return ui.notifications.error(game.i18n.localize(`${MODULE_ID}.notifications.noLock`));
    //check if it's already unlocked
    const unlocked = document.getFlag(MODULE_ID, "general.unlocked");
    if (unlocked) return ui.notifications.error(game.i18n.localize(`${MODULE_ID}.notifications.alreadyUnlocked`));
    const app = new lockClass(document);
    app.render(true);
    return app;
}

export function isDocumentLocked(document) {
    if (!document.getFlag) return false;
    const lockType = document.getFlag(MODULE_ID, "general.lockType") ?? "none";
    if (lockType === "none") return false;
    const isLocked = !document.getFlag(MODULE_ID, "general.unlocked");
    return isLocked;
}

export function hasLock(uuid) {
    const document = fromUuidSync(uuid);
    const lockType = document.getFlag(MODULE_ID, "general.lockType") ?? "none";
    return lockType !== "none";
}

export function getContentLink(docOrUuid) {
    const document = docOrUuid.uuid ? docOrUuid : fromUuidSync(docOrUuid);
    const label = document.getFlag(MODULE_ID, "general.label") || document.name || document.constructor.name;
    return `@PUZZLELOCK[${document.uuid}]{${label}}`;
}

Hooks.on("setup", () => {
    Socket.register(
        "routeUpdate",
        async (data) => {
            const document = await fromUuid(data.uuid);
            if (document) {
                document.update(data.data);
            }
        },
        { response: true },
    );

    Socket.register(
        "runUnlockMacro",
        async (data) => {
            const object = await fromUuid(data.uuid);
            const unlockMacro = object.getFlag(MODULE_ID, "general.unlockMacro");
            if (!unlockMacro) return;
            const user = game.users.get(data.user);
            const asyncFunction = new Function("object", "user", unlockMacro);
            return await asyncFunction(object, user);
        },
        { response: true },
    );

    Socket.register(
        "deleteItems",
        async (data) => {
            const itemsUUIDs = data.uuids;
            for (let uuid of itemsUUIDs) {
                const item = await fromUuid(uuid);
                await item.delete();
            }
        },
        { response: true },
    );

    Socket.register("playSound", async (data) => {
        const src = data.sound;
        const uuid = data.uuid;
        if (CONFIG.PuzzleLocks.activeLock?.document.uuid !== uuid) return;
        foundry.audio.AudioHelper.play({ src, volume: 0.8, autoplay: true, loop: false }, false);
    });

    CONFIG.TextEditor.enrichers.push({
        id: MODULE_ID,
        pattern: /@PUZZLELOCK\[(.*?)\]{(.*?)\}/g,
        enricher: async (match, content) => {
            const uuid = match[1];
            const label = match[2];
            const link = document.createElement("a");
            link.classList.add("puzzle-lock-link");
            link.dataset.uuid = uuid;
            const doc = await fromUuid(uuid);
            const isUnlocked = doc.getFlag(MODULE_ID, "general.unlocked");
            link.innerHTML = `<i class="fa-solid fa-puzzle"></i> ${label} ${isUnlocked ? `<i class="fa-solid fa-unlock"></i>` : `<i class="fa-solid fa-lock"></i>`}`;
            return link;
        },
    });
    document.addEventListener("click", async (event) => {
        const puzzleLockLink = event.target.closest(".puzzle-lock-link");
        if (puzzleLockLink) {
            const uuid = puzzleLockLink.dataset.uuid;
            const doc = await fromUuid(uuid);
            const unlocked = doc.getFlag(MODULE_ID, "general.unlocked");
            if (unlocked) {
                doc.sheet.render(true);
            } else {
                unlock(uuid);
            }
        }
    });
});

Hooks.on("init", () => {
    CONFIG.PuzzleLocks = {
        LOCKS,
        registerLock,
        unlock,
        hasLock,
        getContentLink,
        isLocked: (docOrUuid) => {
            const document = docOrUuid.uuid ? docOrUuid : fromUuidSync(docOrUuid);
            return isDocumentLocked(document);
        },
        toggleLockedState: (docOrUuid, locked) => {
            const document = docOrUuid.uuid ? fromUuidSync(docOrUuid) : docOrUuid;
            return document.setFlag(MODULE_ID, "general.unlocked", !locked);
        },
        BasePuzzleLock,
    };
    LOCK_CLS.sort((a, b) => a.APP_NAME.localeCompare(b.APP_NAME)).forEach((lock) => {
        registerLock(lock.APP_ID, lock);
    });

    initConfig();
    registerSettings();
});
