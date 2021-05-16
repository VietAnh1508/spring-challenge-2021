class Cell {
    constructor(index, richness, neighbors) {
        this.index = index;
        this.richness = richness;
        this.neighbors = neighbors;
    }
}

class Tree {
    constructor(cellIndex, size, isMine, isDormant) {
        this.cellIndex = cellIndex;
        this.size = size;
        this.isMine = isMine;
        this.isDormant = isDormant;
    }
}

const WAIT = 'WAIT';
const SEED = 'SEED';
const GROW = 'GROW';
const COMPLETE = 'COMPLETE';
class Action {
    constructor(type, targetCellIdx, sourceCellIdx) {
        this.type = type;
        this.targetCellIdx = targetCellIdx;
        this.sourceCellIdx = sourceCellIdx;
    }

    static parse(line) {
        const parts = line.split(' ');
        if (parts[0] === WAIT) {
            return new Action(WAIT);
        }
        if (parts[0] === SEED) {
            return new Action(SEED, parseInt(parts[2]), parseInt(parts[1]));
        }
        return new Action(parts[0], parseInt(parts[1]));
    }

    toString() {
        if (this.type === WAIT) {
            return WAIT;
        }
        if (this.type === SEED) {
            return `${SEED} ${this.sourceCellIdx} ${this.targetCellIdx}`;
        }
        return `${this.type} ${this.targetCellIdx}`;
    }
}

const TREE_BASE_COST = [0, 1, 3, 7];
class Game {
    constructor() {
        this.round = 0;
        this.nutrients = 0;
        this.cells = [];
        this.possibleActions = [];
        this.trees = [];
        this.mySun = 0;
        this.myScore = 0;
        this.opponentsSun = 0;
        this.opponentScore = 0;
        this.opponentIsWaiting = 0;
    }

    getNextAction() {
        let largeTrees = this.getMyTreesBySize(3);
        let mediumTrees = this.getMyTreesBySize(2);
        let smallTrees = this.getMyTreesBySize(1);

        const endGameAction = this.getActionForEndGame(largeTrees);
        if (endGameAction) {
            return endGameAction;
        }

        if (mediumTrees.length === 0 && largeTrees.length === 0) {
            if (smallTrees.length > 0) {
                const smallTree =
                    this.findTreeOnHighestRichnessCell(smallTrees);
                let growCost = this.getGrowthCost(smallTree);
                if (growCost <= this.mySun && !smallTree.isDormant) {
                    return new Action(GROW, smallTree.cellIndex);
                } else {
                    return new Action(WAIT);
                }
            } else {
                let seeds = this.getMyTreesBySize(0);
                if (seeds.length > 0) {
                    let seed = this.findTreeOnHighestRichnessCell(seeds);
                    let growCost = this.getGrowthCost(seed);
                    if (growCost <= this.mySun && !seed.isDormant) {
                        return new Action(GROW, seed.cellIndex);
                    }
                }
            }

            return new Action(WAIT);
        }

        const growTreeAction = this.getGrowTreeAction(smallTrees);
        if (growTreeAction) {
            return growTreeAction;
        }

        // find next cell to seed from medium or large trees
        // if not enough sun or there are no medium trees -> wait
        let allSeeds = this.trees.filter(
            (tree) => tree.isMine && tree.size === 0
        );
        if (allSeeds.length === 0) {
            const seedAction = this.getSeedAction(largeTrees, mediumTrees);
            if (seedAction) {
                return seedAction;
            }
        }

        if (largeTrees.length > 3) {
            let largeTree = this.findTreeOnHighestRichnessCell(largeTrees);
            if (this.mySun >= 4) {
                return new Action(COMPLETE, largeTree.cellIndex);
            }
            return new Action(WAIT);
        } else {
            const action = this.getGrowTreeActionForTreesNotCoveredByShadow();
            if (action) {
                return action;
            }

            let selectedMediumTree =
                this.findTreeOnHighestRichnessCell(mediumTrees);
            if (selectedMediumTree) {
                if (this.mySun < this.getGrowthCost(selectedMediumTree)) {
                    return new Action(WAIT);
                }
                return new Action(GROW, selectedMediumTree.cellIndex);
            }
        }

        // complete?
        // -> no best cells to seed
        let toCompleteTree = this.findTreeOnHighestRichnessCell(largeTrees);
        return new Action(COMPLETE, toCompleteTree.cellIndex);
    }

    getActionForEndGame(largeTrees) {
        if (this.mySun >= 4 && this.day >= 20 && largeTrees.length > 0) {
            const tree = this.findTreeOnHighestRichnessCell(largeTrees);
            return new Action(COMPLETE, tree.cellIndex);
        }

        return null;
    }

    getGrowTreeAction(smallTrees) {
        // grow trees in center to quickly expand
        let treesInCenter = this.findNotLargeTreesInCenter();
        if (treesInCenter.length > 0) {
            let growCost = this.getGrowthCost(treesInCenter[0]);
            if (this.mySun < growCost) {
                return new Action(WAIT);
            } else {
                return new Action(GROW, treesInCenter[0].cellIndex);
            }
        } else {
            let seeds = this.getMyTreesBySize(0);
            if (seeds.length > 0) {
                let seed = this.findTreeOnHighestRichnessCell(seeds);
                let growCost = this.getGrowthCost(seed);
                if (growCost <= this.mySun && !seed.isDormant) {
                    return new Action(GROW, seed.cellIndex);
                } else {
                    return new Action(WAIT);
                }
            } else {
                if (smallTrees.length > 0) {
                    let smallTree =
                        this.findTreeOnHighestRichnessCell(smallTrees);
                    let growCost = this.getGrowthCost(smallTree);
                    if (growCost <= this.mySun && !smallTree.isDormant) {
                        return new Action(GROW, smallTree.cellIndex);
                    } else {
                        return new Action(WAIT);
                    }
                }
            }
        }
        return null;
    }

    getGrowTreeActionForTreesNotCoveredByShadow() {
        const nextSunDir = (this.day + 1) % 6;
        const cellsCoveredByShadow = this.getShadowCells(nextSunDir);

        const myTreesNotCoverByShadow = this.trees.filter(
            (tree) =>
                tree.isMine &&
                !tree.isDormant &&
                tree.size < 3 &&
                !cellsCoveredByShadow.has(tree.cellIndex)
        );
        if (myTreesNotCoverByShadow.length === 0) {
            return null;
        }

        myTreesNotCoverByShadow.sort((a, b) => {
            if (b.size > a.size) return 1;
            if (a.size < b.size) return -1;

            const richnessA = this.findCellByIndex(a.cellIndex).richness;
            const richnessB = this.findCellByIndex(b.cellIndex).richness;
            return richnessB - richnessA;
        });

        for (let tree of myTreesNotCoverByShadow) {
            let growCost = this.getGrowthCost(tree);
            if (this.mySun < growCost) {
                continue;
            } else {
                return new Action(GROW, tree.cellIndex);
            }
        }

        return new Action(WAIT);
    }

    getShadowCells(sunDirection) {
        let cells = new Set();

        for (let tree of this.trees) {
            if (tree.size === 0) {
                continue;
            }

            const curCell = this.findCellByIndex(tree.cellIndex);
            const neigh1 = curCell.neighbors[sunDirection];
            // get neighbor with distance = 1
            if (neigh1 !== -1) {
                cells.add(neigh1);

                const cellNeigh1 = this.findCellByIndex(neigh1);
                if (cellNeigh1.neighbors[sunDirection] !== -1) {
                    // get neighbor with distance = 2
                    if (tree.size >= 2) {
                        cells.add(cellNeigh1.neighbors[sunDirection]);
                    }

                    // get neighbor with distance = 3
                    if (tree.size === 3) {
                        const cellNeigh2 = this.findCellByIndex(
                            cellNeigh1.neighbors[sunDirection]
                        );
                        if (cellNeigh2[sunDirection] !== -1) {
                            cells.add(cellNeigh2[sunDirection]);
                        }
                    }
                }
            }
        }

        return cells;
    }

    getSeedAction(largeTrees, mediumTrees) {
        let cellFromMedium = this.findNextCellToSeedFrom(mediumTrees);
        if (cellFromMedium !== null) {
            if (this.mySun < this.getSeedCost()) {
                return new Action(WAIT);
            }
            return new Action(
                SEED,
                cellFromMedium.target,
                cellFromMedium.source
            );
        }

        let cellFromLarge = this.findNextCellToSeedFrom(largeTrees);
        if (cellFromLarge !== null) {
            if (this.mySun < this.getSeedCost()) {
                return new Action(WAIT);
            }
            return new Action(SEED, cellFromLarge.target, cellFromLarge.source);
        }

        return null;
    }

    findNextCellToSeedFrom(trees) {
        let cellsCanBeSeed = [];

        for (let tree of trees) {
            const seedCost = this.getSeedCost();
            if (this.canSeedFrom(tree, seedCost)) {
                let possibleCells = this.findPossibleCellsToSeedFrom(tree);
                for (let cell of possibleCells) {
                    if (this.canSeedTo(cell)) {
                        cellsCanBeSeed.push({
                            source: tree.cellIndex,
                            target: cell,
                        });
                    }
                }
            }
        }

        if (cellsCanBeSeed.length === 0) {
            return null;
        }

        cellsCanBeSeed.sort((a, b) => {
            let richnessA = this.findCellByIndex(a.target).richness;
            let richnessB = this.findCellByIndex(b.target).richness;
            return richnessB - richnessA;
        });

        return cellsCanBeSeed[0];
    }

    findPossibleCellsToSeedFrom(tree) {
        let cellsCanBeSeed = [];

        const curCell = this.findCellByIndex(tree.cellIndex);
        cellsCanBeSeed.push(
            ...this.findNeighborCellsToSeedFromMediumTree(curCell, 0, 1, 5)
        );

        cellsCanBeSeed.push(
            ...this.findNeighborCellsToSeedFromMediumTree(curCell, 2, 3, 1)
        );

        cellsCanBeSeed.push(
            ...this.findNeighborCellsToSeedFromMediumTree(curCell, 4, 3, 5)
        );

        if (tree.size === 3) {
            // X-o
            if (curCell.neighbors[0] !== -1) {
                const cell0 = this.findCellByIndex(curCell.neighbors[0]);
                // X-o-o
                if (cell0.neighbors[0] !== -1) {
                    const neigh0Of0 = this.findCellByIndex(cell0.neighbors[0]);

                    // X-o-o-o
                    if (neigh0Of0.neighbors[0] !== -1) {
                        cellsCanBeSeed.push(neigh0Of0.neighbors[0]);
                    }

                    //       o
                    // X-o-o/
                    if (neigh0Of0.neighbors[1] !== -1) {
                        const neigh1Of0Of0 = this.findCellByIndex(
                            neigh0Of0.neighbors[1]
                        );
                        cellsCanBeSeed.push(neigh1Of0Of0.index);
                        //     o
                        //      \o
                        // X-o-o/
                        if (neigh1Of0Of0.neighbors[2] !== -1) {
                            cellsCanBeSeed.push(neigh1Of0Of0.neighbors[2]);
                        }
                    }

                    // X-o-o
                    //     \o
                    if (neigh0Of0.neighbors[5] !== -1) {
                        const neigh5Of0Of0 = this.findCellByIndex(
                            neigh0Of0.neighbors[5]
                        );
                        cellsCanBeSeed.push(neigh5Of0Of0.index);
                        // X-o-o
                        //      \o
                        //     o/
                        if (neigh5Of0Of0.neighbors[4] !== -1) {
                            cellsCanBeSeed.push(neigh5Of0Of0.neighbors[4]);
                        }
                    }
                }
            }

            //   o
            // X/
            if (curCell.neighbors[1] !== -1) {
                const cell1 = this.findCellByIndex(curCell.neighbors[1]);
                //    o
                //  o/
                // X/
                if (cell1.neighbors[1] !== -1) {
                    const negh1Of1 = this.findCellByIndex(cell1.neighbors[1]);
                    if (negh1Of1.neighbors[1] !== -1) {
                        cellsCanBeSeed.push(negh1Of1.neighbors[1]);
                    }
                }
            }

            // o
            //  \X
            if (curCell.neighbors[2] !== -1) {
                const cell2 = this.findCellByIndex(curCell.neighbors[2]);
                // o
                //  \o
                //   \X
                if (cell2.neighbors[2] !== -1) {
                    const neigh2Of2 = this.findCellByIndex(cell2.neighbors[2]);

                    // o
                    //  \o
                    //   \o
                    //    \X
                    if (neigh2Of2.neighbors[2] !== -1) {
                        cellsCanBeSeed.push(neigh2Of2.neighbors[2]);
                    }

                    //  /o
                    // o
                    //  \o
                    //   \X
                    if (neigh2Of2.neighbors[1] !== -1) {
                        const neigh1Of2Of2 = this.findCellByIndex(
                            neigh2Of2.neighbors[1]
                        );
                        cellsCanBeSeed.push(neigh1Of2Of2.index);
                        //  /o-o
                        // o
                        //  \o
                        //   \X
                        if (neigh1Of2Of2.neighbors[0] !== -1) {
                            cellsCanBeSeed.push(neigh1Of2Of2.neighbors[0]);
                        }
                    }

                    // o-o
                    //    \o
                    //     \X
                    if (neigh2Of2.neighbors[3] !== -1) {
                        const neigh3Of2Of2 = this.findCellByIndex(
                            neigh2Of2.neighbors[3]
                        );
                        cellsCanBeSeed.push(neigh3Of2Of2.index);
                        //   o-o
                        // o/   \o
                        //       \X
                        if (neigh3Of2Of2.neighbors[4] !== -1) {
                            cellsCanBeSeed.push(neigh3Of2Of2.neighbors[4]);
                        }
                    }
                }
            }

            // o-X
            if (curCell.neighbors[3] !== -1) {
                const cell3 = this.findCellByIndex(curCell.neighbors[3]);
                // o-o-X
                if (cell3.neighbors[3] !== -1) {
                    const cell3Of3 = this.findCellByIndex(cell3.neighbors[3]);
                    // o-o-o-X
                    if (cell3Of3.neighbors[3] !== -1) {
                        cellsCanBeSeed.push(cell3Of3.neighbors[3]);
                    }
                }
            }

            //   X
            // o/
            if (curCell.neighbors[4] !== -1) {
                const cell4 = this.findCellByIndex(curCell.neighbors[4]);
                //    X
                //  o/
                // o/
                if (cell4.neighbors[4] !== -1) {
                    const neigh4Of4 = this.findCellByIndex(cell4.neighbors[4]);

                    //     X
                    //   o/
                    //  o/
                    // o
                    if (neigh4Of4.neighbors[4] !== -1) {
                        cellsCanBeSeed.push(neigh4Of4.neighbors[4]);
                    }

                    //    X
                    //  o/
                    // o/
                    //  \o
                    if (neigh4Of4.neighbors[5] !== -1) {
                        const neigh5Of4Of4 = this.findCellByIndex(
                            neigh4Of4.neighbors[5]
                        );
                        cellsCanBeSeed.push(neigh5Of4Of4.index);
                        //    X
                        //  o/
                        // o/
                        //  \o-o
                        if (neigh5Of4Of4.neighbors[0] !== -1) {
                            cellsCanBeSeed.push(neigh5Of4Of4.neighbors[0]);
                        }
                    }

                    //      X
                    //    o/
                    // o-o/
                    if (neigh4Of4.neighbors[3] !== -1) {
                        const neigh3Of4Of4 = this.findCellByIndex(
                            neigh4Of4.neighbors[3]
                        );
                        cellsCanBeSeed.push(neigh3Of4Of4.index);
                        //        X
                        // o\   o/
                        //   o-o/
                        if (neigh3Of4Of4.neighbors[2] !== -1) {
                            cellsCanBeSeed.push(neigh3Of4Of4.neighbors[2]);
                        }
                    }
                }
            }

            if (curCell.neighbors[5] !== -1) {
                const cell5 = this.findCellByIndex(curCell.neighbors[5]);
                if (cell5.neighbors[5] !== -1) {
                    const cell5Of5 = this.findCellByIndex(cell5.neighbors[5]);
                    if (cell5Of5.neighbors[5] !== -1) {
                        cellsCanBeSeed.push(cell5Of5.neighbors[5]);
                    }
                }
            }
        }

        return cellsCanBeSeed;
    }

    findNeighborCellsToSeedFromMediumTree(
        centerCell,
        neighbor,
        leftOfNeighbor,
        rightOfNeighbor
    ) {
        let cells = [];

        if (centerCell.neighbors[neighbor] !== -1) {
            const neighborCell = this.findCellByIndex(
                centerCell.neighbors[neighbor]
            );
            if (neighborCell.neighbors[leftOfNeighbor] !== -1) {
                cells.push(neighborCell.neighbors[leftOfNeighbor]);
            }

            if (neighborCell.neighbors[rightOfNeighbor] !== -1) {
                cells.push(neighborCell.neighbors[rightOfNeighbor]);
            }
        }

        return cells;
    }

    getSeedCost() {
        return this.getCostFor(0);
    }

    getGrowthCost(tree) {
        const targetSize = tree.size + 1;
        if (targetSize > 3) {
            return 4; // complete cost
        }
        return this.getCostFor(targetSize);
    }

    canSeedFrom(tree, seedCost) {
        return seedCost <= this.mySun && tree.size > 0 && !tree.isDormant;
    }

    canSeedTo(targetIndex) {
        const cell = this.findCellByIndex(targetIndex);
        let myTrees = this.getMyTreesBySize(-1);
        for (let neighbor of cell.neighbors) {
            if (myTrees.find((tree) => tree.cellIndex === neighbor)) {
                return false;
            }
        }

        const treeAtThisCell = this.trees.find(
            (tree) => tree.cellIndex === targetIndex
        );

        return cell.richness !== 0 && !treeAtThisCell;
    }

    getCostFor(size) {
        const baseCost = TREE_BASE_COST[size];
        const sameTreeCount = this.trees.filter(
            (tree) => tree.size === size && tree.isMine
        ).length;
        return baseCost + sameTreeCount;
    }

    getMyTreesBySize(size) {
        if (size > -1) {
            return this.trees.filter(
                (tree) => tree.isMine && tree.size === size && !tree.isDormant
            );
        } else {
            return this.trees.filter((tree) => tree.isMine);
        }
    }

    findNotLargeTreesInCenter() {
        let centerCells = this.cells
            .filter((cell) => cell.richness === 3)
            .map((cell) => cell.index);
        let treesInCenter = this.trees.filter(
            (tree) =>
                tree.isMine &&
                !tree.isDormant &&
                centerCells.includes(tree.cellIndex) &&
                tree.size < 3
        );

        if (treesInCenter.length === 0) {
            return [];
        } else {
            return treesInCenter.sort((a, b) => b.size - a.size);
        }
    }

    findTreeOnHighestRichnessCell(trees) {
        trees.sort((a, b) => {
            let richnessA = this.findCellByIndex(a.cellIndex).richness;
            let richnessB = this.findCellByIndex(b.cellIndex).richness;
            return richnessA - richnessB;
        });

        return trees[trees.length - 1];
    }

    findCellByIndex(index) {
        return this.cells.find((cell) => cell.index === index);
    }
}

const game = new Game();

const numberOfCells = parseInt(readline()); // 37
for (let i = 0; i < numberOfCells; i++) {
    var inputs = readline().split(' ');
    const index = parseInt(inputs[0]); // 0 is the center cell, the next cells spiral outwards
    const richness = parseInt(inputs[1]); // 0 if the cell is unusable, 1-3 for usable cells
    const neigh0 = parseInt(inputs[2]); // the index of the neighbouring cell for each direction
    const neigh1 = parseInt(inputs[3]);
    const neigh2 = parseInt(inputs[4]);
    const neigh3 = parseInt(inputs[5]);
    const neigh4 = parseInt(inputs[6]);
    const neigh5 = parseInt(inputs[7]);
    game.cells.push(
        new Cell(index, richness, [
            neigh0,
            neigh1,
            neigh2,
            neigh3,
            neigh4,
            neigh5,
        ])
    );
}

// game loop
while (true) {
    game.day = parseInt(readline()); // the game lasts 24 days: 0-23
    game.nutrients = parseInt(readline()); // the base score you gain from the next COMPLETE action
    var inputs = readline().split(' ');
    game.mySun = parseInt(inputs[0]); // your sun points
    game.myScore = parseInt(inputs[1]); // your current score
    var inputs = readline().split(' ');
    game.opponentSun = parseInt(inputs[0]); // opponent's sun points
    game.opponentScore = parseInt(inputs[1]); // opponent's score
    game.opponentIsWaiting = inputs[2] !== '0'; // whether your opponent is asleep until the next day

    game.trees = [];
    const numberOfTrees = parseInt(readline()); // the current amount of trees
    for (let i = 0; i < numberOfTrees; i++) {
        var inputs = readline().split(' ');
        const cellIndex = parseInt(inputs[0]); // location of this tree
        const size = parseInt(inputs[1]); // size of this tree: 0-3
        const isMine = inputs[2] !== '0'; // 1 if this is your tree
        const isDormant = inputs[3] !== '0'; // 1 if this tree is dormant
        game.trees.push(new Tree(cellIndex, size, isMine, isDormant));
    }

    game.possibleActions = [];
    const numberOfPossibleActions = parseInt(readline()); // all legal actions
    for (let i = 0; i < numberOfPossibleActions; i++) {
        const possibleAction = readline(); // try printing something from here to start with
        game.possibleActions.push(Action.parse(possibleAction));
    }

    // GROW cellIdx | SEED sourceIdx targetIdx | COMPLETE cellIdx | WAIT <message>
    const action = game.getNextAction();
    console.log(action.toString());
}
