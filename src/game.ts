export type Log = (message: string) => void;

export type Floor = Array<Row>;
export type Row = Array<Tile>;

export interface Tile {
  ground: any;
  space: any;
  floor: any;
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

export type Entity = Player | Monster;

export type Monster = DireWolf;

export interface DireWolf extends BaseEntity {
  type: 'direWolf';
  health: number;
  motions: Coordinate[];
}

export interface BaseEntity {
  alive: boolean;
  timeHasBeenHarvested: boolean;
}

export interface Player extends BaseEntity {
  type: 'player';
  health: number;
  time: number;
  actions: Action[];
}

export type Action = Move | Damage;

export interface Move {
  type: 'move';
  motion: Coordinate;
}

export interface Damage {
  type: 'damage';
  entity: Entity;
  damage: number;
  position: Coordinate;
}

export interface State {
  width: number;
  height: number;
  playerPosition: Coordinate;

  wallTiles: Map<Coordinate, Wall>;
  groundTiles: Map<Coordinate, Ground>;
  entities: Map<Coordinate, Entity>;
  deadEntities: Map<Coordinate, Set<Entity>>;
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

function d(n: number): number {
  return 1 + Math.floor(Math.random() * n);
}

function add(a: Coordinate, b: Coordinate): Coordinate {
  return makeCoordinate(a.row + b.row, a.column + b.column);
}

function movePlayer(state: State, motion: Coordinate) {
  const playerState = state.entities.get(state.playerPosition) as Player;

  const newPosition = add(state.playerPosition, motion);

  state.entities.delete(state.playerPosition);
  state.entities.set(newPosition, playerState);
  state.playerPosition = newPosition;

  return state;
}

function deadify(state: State, entity: Entity, coordinate: Coordinate) {
  state.entities.delete(coordinate);
  let deadEntitiesAtCoordinate = state.deadEntities.get(coordinate);

  if (deadEntitiesAtCoordinate) {
    deadEntitiesAtCoordinate.add(entity);
  } else {
    deadEntitiesAtCoordinate = new Set();

    deadEntitiesAtCoordinate.add(entity);

    state.deadEntities.set(coordinate, deadEntitiesAtCoordinate);
  }
}

function undeadify (state: State, entity: Entity, coordinate: Coordinate) {
  const deadEntitiesAtCoordinate = state.deadEntities.get(coordinate) as Set<Entity>;
  deadEntitiesAtCoordinate.delete(entity);

  state.entities.set(coordinate, entity);
}

function updatePlayer(state: State, motion: Coordinate, log: Log): State {
  const playerState = state.entities.get(state.playerPosition) as Player;

  if (playerState.time > 0) {
    playerState.time -= 1;
  }

  const newPosition = add(state.playerPosition, motion);

  if (state.wallTiles.has(newPosition)) {
    playerState.actions.push({ type: 'move', motion: makeCoordinate(0, 0) });
    return state;
  }

  const entity = state.entities.get(newPosition);

  if (entity && entity.alive) {
    const damage = 5 + d(5);
    log(`Hit ${entity.type} for ${damage} damage`);
    entity.health -= damage; // TODO - damage?

    playerState.actions.push({ type: 'damage', entity, damage, position: newPosition});

    if (entity.health <= 0) {
      entity.alive = false;
      deadify(state, entity, newPosition);
      log(`You killed the ${entity.type}.`);
      if (!entity.timeHasBeenHarvested) {
        log(`You harvest 30 turns of time from the dying ${entity.type}`);
        playerState.time += 30;
        entity.timeHasBeenHarvested = true;
      }
    }
    return state;
  }

  movePlayer(state, motion);
  playerState.actions.push({ type: 'move', motion });

  return state;
}

export function updateState(state: State, key: string, log: Log): State {
  const motion: KeyCoordinateMap = {
    h: makeCoordinate(0, -1),
    j: makeCoordinate(1, 0),
    k: makeCoordinate(-1, 0),
    l: makeCoordinate(0, 1)
  };

  if (!motion[key]) {
    return state;
  }

  updatePlayer(state, motion[key] || makeCoordinate(0, 0), log);

  return {
    ...state
  };
}

type KeyCoordinateMap = { [key: string]: Coordinate };

function multiply(coordinate: Coordinate, scalar: number): Coordinate {
  return makeCoordinate(coordinate.row * scalar, coordinate.column * scalar);
}

export function reverseUpdate(state: State, key: string, log: Log): State {
  key; // will definitely use this later, just to please compiler
  log;
  const playerState = state.entities.get(state.playerPosition) as Player;

  playerState.time -= 1;

  if (playerState.actions.length) {
    const action = playerState.actions.pop() as Action;

    if (action.type === 'move') {
      movePlayer(state, multiply(action.motion, -1));
    } else if (action.type === 'damage') {
      action.entity.health += action.damage;

      if (action.entity.health > 0 && (action.entity.health - action.damage) <= 0) {
        log(`The ${action.entity.type} comes back from the dead in front of your eyes.`);
        action.entity.alive = true;
        undeadify(state, action.entity, action.position);
      }

      log(`The ${action.entity.type} heals ${action.damage} points as your wound is undone.`);
    }
  }

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
    actions: [],
    alive: true,
    timeHasBeenHarvested: false
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

    if (character === 'w') {
      entities.set(coordinate, {
        type: 'direWolf',
        health: 30,
        motions: [],
        alive: true,
        timeHasBeenHarvested: false
      });
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

    deadEntities: new Map(),
    entities,
    groundTiles,
    wallTiles
  };
}
