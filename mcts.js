/* AI part */
class Board {
    static IN_PROGRESS = -1;

    constructor(
        round,
        nutrients,
        cells,
        trees,
        mySun,
        myScore,
        opponentsSun,
        opponentScore,
        opponentIsWaiting
    ) {
        this.round = round;
        this.nutrients = nutrients;
        this.cells = cells;
        // this.possibleActions = [];
        this.trees = trees;
        this.mySun = mySun;
        this.myScore = myScore;
        this.opponentsSun = opponentsSun;
        this.opponentScore = opponentScore;
        this.opponentIsWaiting = opponentIsWaiting;
    }

    getMyPossibleActions() {
        let actions = [];

        actions.push(new Action(WAIT));

        const seedCost = this.getSeedCost();

        let myTrees = this.getMyTreesBySize();
        myTrees.forEach((tree) => {
            if (this.canSeedFrom(tree, seedCost)) {
                for (let targetIndex of this.getCellIndexesInRange(
                    tree.cellIndex,
                    tree.size
                )) {
                    if (this.canSeedTo(targetIndex)) {
                        actions.push(
                            new Action(SEED, targetIndex, tree.cellIndex)
                        );
                    }
                }
            }

            let growCost = this.getGrowthCost(tree);
            if (growCost <= this.mySun && !tree.isDormant) {
                if (tree.size === 3) {
                    actions.push(new Action(COMPLETE, tree.cellIndex));
                } else {
                    actions.push(new Action(GROW, tree.cellIndex));
                }
            }
        });

        return actions;
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
        const cell = this.cells.find((cell) => cell.index === targetIndex);
        const treeAtThisCell = this.trees.find(
            (tree) => tree.cellIndex === targetIndex
        );
        return cell.richness !== 0 && !treeAtThisCell;
    }

    getCellIndexesInRange(center, range) {
        const centerCell = this.cells.find((cell) => cell.index === center);
        let cells = new Set();

        switch (range) {
            case 1:
                let neighbors = centerCell.neighbors.filter((v) => v >= 0);
                for (let item of neighbors) {
                    cells.add(item);
                }
                break;
            case 2:
                let neighborsOfCenter = centerCell.neighbors.filter(
                    (v) => v >= 0
                );
                for (let cellIndex of neighborsOfCenter) {
                    const cell = this.cells.find(
                        (cell) => cell.index === cellIndex
                    );
                    cells.add(cellIndex);
                    let neighbors = cell.neighbors.filter((v) => v >= 0);
                    for (let item of neighbors) {
                        cells.add(item);
                    }
                }
                break;
            case 3:
                let neighborsInRange1 = centerCell.neighbors.filter(
                    (v) => v >= 0
                );
                for (let cellIndex of neighborsInRange1) {
                    const cell = this.cells.find(
                        (cell) => cell.index === cellIndex
                    );
                    cells.add(cellIndex);

                    let neighborsInRange2 = cell.neighbors.filter(
                        (v) => v >= 0
                    );
                    for (let item of neighborsInRange2) {
                        cells.add(item);
                        const cell = this.cells.find(
                            (cell) => cell.index === item
                        );
                        let neighborInRange3 = cell.neighbors.filter(
                            (v) => v >= 0
                        );
                        for (let n of neighborInRange3) {
                            cells.add(n);
                        }
                    }
                }
                break;
        }

        return cells;
    }

    getCostFor(size) {
        const baseCost = TREE_BASE_COST[size];
        const sameTreeCount = this.trees.filter(
            (tree) => tree.size === size && tree.isMine
        ).length;
        return baseCost + sameTreeCount;
    }

    // getters and setters
    performMove(player, position) {
        // this.totalMoves++;
        // boardValues[position.getX()][position.getY()] = player;
    }

    /* Evaluate whether the game is won and return winner.
        If it is draw return 0 else return -1 */
    checkStatus() {
        if (this.myScore > this.opponentScore) return 1;
        if (this.myScore === this.opponentScore) return 0;
        return -1;
    }

    // getEmptyPositions() {
    //     const size = this.boardValues.length;
    //     let emptyPositions = [];
    //     for (let i = 0; i < size; i++) {
    //         for (let j = 0; j < size; j++) {
    //             if (boardValues[i][j] == 0)
    //                 emptyPositions.add(new Position(i, j));
    //         }
    //     }
    //     return emptyPositions;
    // }
}

class State {
    constructor(board, player, visitCount, winScore) {
        this.board = board;
        this.player = player;
        this.visitCount = visitCount;
        this.winScore = winScore;
    }

    incrementVisit() {
        this.visitCount++;
    }

    getAllPossibleStates() {}

    randomPlay() {}
}

class Node {
    constructor(state, parent, children) {
        this.state = state;
        this.parent = parent;
        this.children = children;
    }
}

class GameTree {
    constructor(root) {
        this.root = root;
    }
}

// Upper Confidence Bound
class UTC {
    static utcValue(totalVisit, nodeWinScore, nodeVisit) {
        if (nodeVisit === 0) {
            return Infinity;
        }

        return (
            nodeWinScore / nodeVisit +
            1.41 * Math.sqrt(Math.log(totalVisit) / nodeVisit)
        );
    }

    static findBestNodeWithUTC(node) {
        const parentVisit = node.state.visitCount;

        let nodeMax = null;
        let maxUTCValue = -Infinity;

        for (let node of node.children) {
            const utcValue = this.utcValue(
                parentVisit,
                node.state.winScore,
                node.state.visitCount
            );
            if (maxUTCValue < utcValue) {
                nodeMax = node;
                maxUTCValue = utcValue;
            }
        }

        return nodeMax;

        /*
        int parentVisit = node.getState().getVisitCount();
        return Collections.max(
          node.getChildArray(),
          Comparator.comparing(c -> uctValue(parentVisit, 
            c.getState().getWinScore(), c.getState().getVisitCount())));
        */
    }
}

const WIN_SCORE = 10;
const TREE_BASE_COST = [0, 1, 3, 7];
class MonteCarloTreeSearch {
    constructor(opponent) {
        this.opponent = opponent;
    }

    findNextMove(board, player) {
        this.opponent = 3 - player;
        let gameTree = new GameTree();
        let rootNode = gameTree.root;
        rootNode.state.board = board;
        rootNode.state.player = this.opponent;

        const endTime = 10;
        while (new Date().getTime() < endTime) {
            // TODO: change this
            let promisingNode = this.selectPromisingNode(rootNode);
            if (promisingNode.state.board.checkStatus() == Board.IN_PROGRESS) {
                this.expandNode(promisingNode);
            }

            let nodeToExplore = promisingNode;
            if (promisingNode.children.length > 0) {
                nodeToExplore = promisingNode.getRandomChildNode();
            }

            let playoutResult = this.simulateRandomPlayout(nodeToExplore);
            this.backPropogation(nodeToExplore, playoutResult);
        }

        const winnerNode = rootNode.getChildWithMaxScore();
        tree.root = winnerNode;
        return winnerNode.state.board;
    }

    selectPromisingNode(rootNode) {
        let node = rootNode;
        while (node.children.length !== 0) {
            node = UTC.findBestNodeWithUTC(node);
        }
        return node;
    }

    expandNode(node) {
        let possibleStates = node.state.getAllPossibleStates();
        for (let state of possibleStates) {
            let newNode = new Node(state);
            newNode.parent = node;
            newNode.state.player = node.state.opponent;

            node.children.push(newNode);
        }
    }

    simulateRandomPlayout(node) {
        let tempNode = new Node(node);
        let tempState = tempNode.getState();
        let boardStatus = tempState.getBoard().checkStatus();

        if (boardStatus === this.opponent) {
            tempNode.getParent().getState().setWinScore(-Infinity);
            return boardStatus;
        }

        while (boardStatus === Board.IN_PROGRESS) {
            tempState.togglePlayer();
            tempState.randomPlay();
            boardStatus = tempState.getBoard().checkStatus();
        }
        return boardStatus;
    }

    backPropogation(nodeToExplore, player) {
        let tempNode = nodeToExplore;
        while (tempNode != null) {
            tempNode.state.incrementVisit();
            if (tempNode.state.player === player) {
                tempNode.state.addScore(WIN_SCORE);
            }
            tempNode = tempNode.parent;
        }
    }
}

/* Game part */
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

    getNextActionWithAI() {
        const board = new Board(
            this.round,
            this.nutrients,
            this.cells,
            this.trees,
            this.mySun,
            this.myScore,
            this.opponentsSun,
            this.opponentScore,
            this.opponentIsWaiting
        );

        return new MonteCarloTreeSearch().findNextMove(board);
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
                        action =
                            this.possibleActions[
                                this.possibleActions.length - 1
                            ];
                    }
                }
            } else {
                const tree = this.findTreeOnHighestRichnessCell(smallTrees);
                action = this.getActionForCurrentTree(tree, GROW);
                if (action.length === 0) {
                    action =
                        this.possibleActions[this.possibleActions.length - 1];
                }
            }
        } else {
            const tree = this.findTreeOnHighestRichnessCell(mediumTrees);
            action = this.getActionForCurrentTree(tree, GROW);
            if (action.length === 0) {
                action = this.possibleActions[this.possibleActions.length - 1];
            }
        }

        return action;
    }

    getMyTreesBySize(size) {
        if (size) {
            return this.trees.filter(
                (tree) => tree.isMine && tree.size === size && !tree.isDormant
            );
        } else {
            return this.trees.filter((tree) => tree.isMine);
        }
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
            let rA = this.cells.find(
                (cell) => cell.index === a.targetCellIdx
            ).richness;
            let rB = this.cells.find(
                (cell) => cell.index === b.targetCellIdx
            ).richness;
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
