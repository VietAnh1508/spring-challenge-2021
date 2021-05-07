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
    let myTrees = this.trees.filter((tree) => tree.isMine);

    if (this.possibleActions.length === 1) {
      return this.possibleActions[0];
    }

    const action = this.possibleActions.filter(
      (action) =>
        action.type === COMPLETE &&
        action.targetCellIdx === myTrees[0].cellIndex
    );

    return action;
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
    new Cell(index, richness, [neigh0, neigh1, neigh2, neigh3, neigh4, neigh5])
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
