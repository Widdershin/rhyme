export type Floor = Array<Row>;
export type Row = Array<Tile>;

export interface Tile {
  ground: any;
  space: any;
}

export interface Coordinate {
  row: number;
  column: number;
}

export interface Wall {
  type: 'wall';
}

export interface Ground {
  type: 'ground';
}

export type Entity = Player;

export interface Player {
  type: 'player';
  health: number;
  time: number;
  lastDirection: Coordinate;
  motions: Coordinate[];
}

export interface State {
  width: number;
  height: number;
  playerPosition: Coordinate;

  wallTiles: Map<Coordinate, Wall>;
  groundTiles: Map<Coordinate, Ground>;
  entities: Map<Coordinate, Entity>;
}

export type CoordinateCache = { [key: string]: Coordinate };
const coordinateCache: CoordinateCache = {};

export function makeCoordinate(row: number, column: number): Coordinate {
  const key = `${row},${column}`;

  if (key in coordinateCache) {
    return coordinateCache[key];
  }

  const coordinate = Object.freeze({ row, column });

  return (coordinateCache[key] = coordinate);
}

function movePlayer(state: State, motion: Coordinate): State {
  const playerState = state.entities.get(state.playerPosition) as Player;

  const newPosition = makeCoordinate(
    state.playerPosition.row + motion.row,
    state.playerPosition.column + motion.column
  );

  if (state.wallTiles.has(newPosition)) {
    playerState.motions.push(makeCoordinate(0, 0));
    return state;
  }

  state.entities.delete(state.playerPosition);
  state.entities.set(newPosition, playerState);
  state.playerPosition = newPosition;
  playerState.motions.push(motion);

  return state;
}

export function updateState(state: State, key: string): State {
  const motion: KeyCoordinateMap = {
    h: makeCoordinate(0, -1),
    j: makeCoordinate(1, 0),
    k: makeCoordinate(-1, 0),
    l: makeCoordinate(0, 1)
  };

  movePlayer(state, motion[key] || makeCoordinate(0, 0));

  return {
    ...state
  };
}

type KeyCoordinateMap = { [key: string]: Coordinate };

function multiply(coordinate: Coordinate, scalar: number): Coordinate {
  return makeCoordinate(coordinate.row * scalar, coordinate.column * scalar);
}

export function reverseUpdate(state: State, key?: string): State {
  key; // will definitely use this later, just to please compiler
  const playerState = state.entities.get(state.playerPosition) as Player;

  const lastMotion = playerState.motions.pop() as Coordinate;
  movePlayer(state, multiply(lastMotion, -1));
  playerState.motions.pop();

  return {
    ...state
  };
}

export function loadMap(map: string): State {
  const entities: Map<Coordinate, Entity> = new Map();
  const groundTiles: Map<Coordinate, Ground> = new Map();
  const wallTiles: Map<Coordinate, Wall> = new Map();
  let playerPosition = makeCoordinate(0, 0);

  const player: Player = {
    type: 'player',
    health: 100,
    time: 100,
    motions: [],
    lastDirection: makeCoordinate(0, 0)
  };

  function parseChar(character: string, row: number, column: number): void {
    const coordinate = makeCoordinate(row, column);

    if (character === '@') {
      playerPosition = coordinate;
      entities.set(coordinate, player);
      groundTiles.set(coordinate, { type: 'ground' });
    }

    if (character === '#') {
      wallTiles.set(coordinate, { type: 'wall' });
    }

    if (character === '.') {
      groundTiles.set(coordinate, { type: 'ground' });
    }
  }

  const rows = map.split('\n');

  const width = Math.max(...rows.map(row => row.length));
  const height = rows.length;

  rows.forEach((line, row) =>
    line.split('').forEach((char, column) => parseChar(char, row, column))
  );

  return {
    width, // TODO
    height,
    playerPosition,

    entities,
    groundTiles,
    wallTiles
  };
}
