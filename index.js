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
        if (this.possibleActions.length === 1) {
            // WAIT
            return this.possibleActions[0];
        }

        let action;

        let largeTrees = this.getMyTreesBySize(3);
        if (
            this.mySun >= 4 &&
            (largeTrees.length > 3 || (this.day >= 20 && largeTrees.length > 0))
        ) {
            const tree = this.findTreeOnHighestRichnessCell(largeTrees);
            action = this.getActionForCurrentTree(tree, COMPLETE);

            if (action.length !== 0) {
                return action;
            }
        }

        // there is no large tree, looking for medium trees to grow
        let mediumTrees = this.getMyTreesBySize(2);
        if (mediumTrees.length === 0 || this.mySun < largeTrees.length + 7) {
            // no medium trees or not enough suns, grow small trees to medium
            let smallTrees = this.getMyTreesBySize(1);
            if (
                smallTrees.length === 0 ||
                this.mySun < mediumTrees.length + 3
            ) {
                // no small trees or not enough suns, grow seeds to small tree
                let seeds = this.getMyTreesBySize(0);
                if (seeds.length === 0 || this.mySun < smallTrees.length + 1) {
                    // no seed or not enough suns -> seed more
                    // find tree or cell to seed, if not available -> WAIT
                    // find a tree which stands next to a better soil cell
                    action = this.getMostRichnessAction(SEED);
                    // find tree that can seed to one of these cells
                    // action = this.possibleActions[this.possibleActions.length - 1];
                } else {
                    // grow seed
                    const seed = this.findTreeOnHighestRichnessCell(seeds);
                    action = this.getActionForCurrentTree(seed, GROW);

                    if (action.length === 0) {
                        action = this.possibleActions[
                            this.possibleActions.length - 1
                        ];
                    }
                }
            } else {
                const tree = this.findTreeOnHighestRichnessCell(smallTrees);
                action = this.getActionForCurrentTree(tree, GROW);
                if (action.length === 0) {
                    action = this.possibleActions[
                        this.possibleActions.length - 1
                    ];
                }
            }
        } else {
            const tree = this.findTreeOnHighestRichnessCell(mediumTrees);
            action = this.getActionForCurrentTree(tree, GROW);
            if (action.length === 0) {
                action = this.possibleActions[this.possibleActions.length - 1];
            }
        }
        // } else {
        //     // TODO: refactor
        //     if (this.mySun >= 4 && !largeTrees[0].isDormant && (largeTrees.length > 3 || this.day >= 20)) {
        //         action = this.getActionForCurrentTree(largeTrees[0], COMPLETE);
        //     } else {
        //         action = this.getMostRichnessAction(GROW);
        //         if (action.length === 0) {
        //             action = this.getMostRichnessAction(SEED);
        //         }
        //     }
        // }

        return action;
    }

    getMyTreesBySize(size) {
        return this.trees.filter(
            (tree) => tree.isMine && tree.size === size && !tree.isDormant
        );
    }

    getMostRichnessAction(actionType) {
        let actions = this.possibleActions.filter(
            (action) => action.type === actionType
        );

        if (actions.length === 0) {
            return [];
        }

        if (actions.length === 1) {
            return actions[0];
        }

        actions.sort((a, b) => {
            let rA = this.cells.find((cell) => cell.index === a.targetCellIdx)
                .richness;
            let rB = this.cells.find((cell) => cell.index === b.targetCellIdx)
                .richness;
            return rA - rB;
        });

        return actions[actions.length - 1];
    }

    findTreeOnHighestRichnessCell(trees) {
        trees.sort((a, b) => {
            let richnessA = this.cells.find(
                (cell) => cell.index === a.cellIndex
            ).richness;
            let richnessB = this.cells.find(
                (cell) => cell.index === b.cellIndex
            ).richness;
            return richnessA - richnessB;
        });

        return trees[trees.length - 1];
    }

    getActionForCurrentTree(tree, actionType) {
        return this.possibleActions.filter(
            (action) =>
                action.type === actionType &&
                action.targetCellIdx === tree.cellIndex
        );
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
