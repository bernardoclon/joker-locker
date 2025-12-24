export function generateSudokuPuzzle(difficulty = 0.5, grid = 9) {
    
    //normalize difficulty
    const grid9removeRange = [9, 72];
    const grid4removeRange = [4, 12];
    if (grid === 9) {
        difficulty = Math.floor(difficulty * (grid9removeRange[1] - grid9removeRange[0])) + grid9removeRange[0];
    } else if (grid === 4) {
        difficulty = Math.floor(difficulty * (grid4removeRange[1] - grid4removeRange[0])) + grid4removeRange[0];
    }

    return grid === 9 ? generateSudokuPuzzle9(difficulty) : generateSudokuPuzzle4(difficulty);
}

export function isSolved(sudoku, gridType = 9) {
    return gridType === 9 ? isSolved9(sudoku) : isSolved4(sudoku);
}












export function generateSudokuPuzzle9(difficulty = 40) {
    function isValid(grid, row, col, num) {
        for (let i = 0; i < 9; i++) {
            if (grid[row][i] === num) return false;
            if (grid[i][col] === num) return false;
        }
        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (grid[startRow + i][startCol + j] === num) return false;
            }
        }
        return true;
    }

    function solveSudoku(grid) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (grid[row][col] === 0) {
                    for (let num = 1; num <= 9; num++) {
                        if (isValid(grid, row, col, num)) {
                            grid[row][col] = num;
                            if (solveSudoku(grid)) return true;
                            grid[row][col] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    const grid = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => 0));
    solveSudoku(grid);
    let removedCount = 0;
    while (removedCount < difficulty) {
        const row = Math.floor(Math.random() * 9);
        const col = Math.floor(Math.random() * 9);
        if (grid[row][col] !== 0) {
            const temp = grid[row][col];
            grid[row][col] = 0;
            const tempGrid = JSON.parse(JSON.stringify(grid));
            const uniqueSolution = solveSudoku(tempGrid);
            if (uniqueSolution) {
                removedCount++;
            } else {
                grid[row][col] = temp;
            }
        }
    }
    return grid;
}

export function isSolved9(grid) {
    function isValidRow(row) {
        const set = new Set();
        for (let i = 0; i < 9; i++) {
            if (set.has(grid[row][i])) return false;
            if (grid[row][i] !== 0) set.add(grid[row][i]);
        }
        return true;
    }

    function isValidCol(col) {
        const set = new Set();
        for (let i = 0; i < 9; i++) {
            if (set.has(grid[i][col])) return false;
            if (grid[i][col] !== 0) set.add(grid[i][col]);
        }
        return true;
    }

    function isValidSubgrid(startRow, startCol) {
        const set = new Set();
        for (let i = startRow; i < startRow + 3; i++) {
            for (let j = startCol; j < startCol + 3; j++) {
                if (set.has(grid[i][j])) return false;
                if (grid[i][j] !== 0) set.add(grid[i][j]);
            }
        }
        return true;
    }

    for (let i = 0; i < 9; i++) {
        if (!isValidRow(i) || !isValidCol(i)) return false;
    }

    for (let i = 0; i < 9; i += 3) {
        for (let j = 0; j < 9; j += 3) {
            if (!isValidSubgrid(i, j)) return false;
        }
    }

    return true;
}

export function generateSudokuPuzzle4(difficulty = 10) {
    function isValid(grid, row, col, num) {
        for (let i = 0; i < 4; i++) {
            if (grid[row][i] === num || grid[i][col] === num) return false;
        }
        const startRow = Math.floor(row / 2) * 2;
        const startCol = Math.floor(col / 2) * 2;
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                if (grid[startRow + i][startCol + j] === num) return false;
            }
        }
        return true;
    }

    function solveSudoku(grid) {
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (grid[row][col] === 0) {
                    for (let num = 1; num <= 4; num++) {
                        if (isValid(grid, row, col, num)) {
                            grid[row][col] = num;
                            if (solveSudoku(grid)) return true;
                            grid[row][col] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    const grid = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 0));
    solveSudoku(grid);
    let removedCount = 0;
    while (removedCount < difficulty) {
        const row = Math.floor(Math.random() * 4);
        const col = Math.floor(Math.random() * 4);
        if (grid[row][col] !== 0) {
            const temp = grid[row][col];
            grid[row][col] = 0;
            const tempGrid = JSON.parse(JSON.stringify(grid));
            const uniqueSolution = solveSudoku(tempGrid);
            if (uniqueSolution) {
                removedCount++;
            } else {
                grid[row][col] = temp;
            }
        }
    }
    return grid;
}

export function isSolved4(grid) {
    function isValidRow(row) {
        const set = new Set();
        for (let i = 0; i < 4; i++) {
            if (set.has(grid[row][i])) return false;
            if (grid[row][i] !== 0) set.add(grid[row][i]);
        }
        return true;
    }

    function isValidCol(col) {
        const set = new Set();
        for (let i = 0; i < 4; i++) {
            if (set.has(grid[i][col])) return false;
            if (grid[i][col] !== 0) set.add(grid[i][col]);
        }
        return true;
    }

    function isValidSubgrid(startRow, startCol) {
        const set = new Set();
        for (let i = startRow; i < startRow + 2; i++) {
            for (let j = startCol; j < startCol + 2; j++) {
                if (set.has(grid[i][j])) return false;
                if (grid[i][j] !== 0) set.add(grid[i][j]);
            }
        }
        return true;
    }

    for (let i = 0; i < 4; i++) {
        if (!isValidRow(i) || !isValidCol(i)) return false;
    }

    for (let i = 0; i < 4; i += 2) {
        for (let j = 0; j < 4; j += 2) {
            if (!isValidSubgrid(i, j)) return false;
        }
    }

    return true;
}