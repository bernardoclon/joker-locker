export const LOCK_DEFAULTS = {
    "number-lock": {
        code: "1234"
    },
    "password-lock": {
        password: "password"
    },
    "item-lock": {
        item: "Item Requerido",
        itemImage: "icons/svg/item-bag.svg",
        deleteItems: false
    },
    "switches-lock": {
        switchesSolution: "01010",
        showSwitches: true
    },
    "cryptex-lock": {
        solution: "JOKER",
        cylinder: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        glyphs: ""
    },
    "celtic-lock": {
        solution: "FIRE",
        cylinder: "ᚠᚢᚦᚨᚱᚲᚺᚹᛏᛒᛖᛗᛚᛜᛟᛞ"
    },
    "chemical-balance-lock": {
        colorCount: 3,
        color1: "#ff0000", amount1: 5,
        color2: "#00ff00", amount2: 5,
        color3: "#0000ff", amount3: 5
    },
    "sudoku-lock": {
        difficulty: "easy",
        grid: 4
    },
    "image-wheel": {
        image: "icons/svg/mystery-man.svg",
        wheelCount: 3,
        angleStep: 45,
        fixed: 1
    },
    "mastermind-lock": {
        solution: "red,blue,green,yellow",
        pipOptions: "red,blue,green,yellow,purple,orange"
    },
    "fill-blanks-lock": {
        solution: "The quick brown fox",
        text: "The _____ brown ___",
        caseSensitive: false
    },
    "mosaic-lock": {
        mosaicImage: "icons/svg/mystery-man.svg",
        mosaicSize: 3
    },
    "sound-lock": {
        sequence: "C,D,E,F,G",
        chordDuration: 500,
        pauseBetweenNotes: 100
    },
    "fifteen-lock": {
        image: "icons/svg/mystery-man.svg",
        size: 3
    },
    "four-by-four-lock": {
        pawnImage: "icons/svg/mystery-man.svg",
        starImage: "icons/svg/sun.svg",
        gridSize: 4,
        noStars: false
    },
    "match-lock": {
        matchTable: "Sun|Moon\nFire|Water",
        secretWord: "BALANCE"
    },
    "pick-lock": {
        numPins: 3,
        feedbackRange: 10
    },
    "f-cerradura-2": {
        numPins: 3,
        tensionMin: 20,
        tensionMax: 80,
        feedbackRange: 10
    },
    "jingle-bells-lock": {
        sequence: "E,E,E",
        instrument: "bell"
    },
    "energy-circuit-lock": {
        gridSize: 5,
        timeLimit: 60
    }
};