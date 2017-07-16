import { run } from '@cycle/run';
import { makeDOMDriver, div, pre, DOMSource, VNode } from '@cycle/dom';
import { timeDriver, TimeSource } from '@cycle/time';
import * as keycode from 'keycode';
import { Stream } from 'xstream';

interface Sources {
  DOM: DOMSource;
  Time: TimeSource;
}

interface Sinks {
  DOM: Stream<VNode>;
}

type Floor = Array<Row>;
type Row = Array<Tile>;

interface Tile {
  ground: any;
  space: any;
}

interface Coordinate {
  row: number;
  column: number;
}

interface Wall {
  type: 'wall';
}

interface Ground {
  type: 'ground';
}

type Entity = Player;

interface Player {
  type: 'player';
  health: number;
  time: number;
}

interface State {
  width: number;
  height: number;
  playerPosition: Coordinate;

  wallTiles: Map<Coordinate, Wall>;
  groundTiles: Map<Coordinate, Ground>;
  entities: Map<Coordinate, Entity>;
}

type CoordinateCache = { [key: string]: Coordinate };
const coordinateCache: CoordinateCache = {};

function makeCoordinate(row: number, column: number): Coordinate {
  const key = `${row},${column}`;

  if (key in coordinateCache) {
    return coordinateCache[key];
  }

  const coordinate = Object.freeze({ row, column });

  return (coordinateCache[key] = coordinate);
}

function characterFor(tile: Tile): String {
  if (tile.space && tile.space.type === 'player') {
    return '@';
  }

  if (tile.space && tile.space.type === 'wall') {
    return '#';
  }

  if (tile.ground && tile.ground === 'ground') {
    return '.';
  }

  return ' ';
}

function stateToArray(state: State): Floor {
  const array = Array(state.height).fill(0).map((_, row) =>
    Array(state.width).fill(0).map((__, column) => {
      const coordinate = makeCoordinate(row, column);
      let ground: string | null = null;

      if (state.groundTiles.has(coordinate)) {
        ground = 'ground';
      }

      const wall = state.wallTiles.get(coordinate);
      const entity = state.entities.get(coordinate);

      const tile = {
        ground,

        space: entity || wall
      };

      return tile;
    })
  );

  return array;
}

function view(state: State) {
  return div('.game', [
    pre(
      '.floor',
      stateToArray(state).map(row =>
        div('.row', row.map(tile => div('.tile', characterFor(tile))))
      )
    )
  ]);
}

const player: Player = {
  type: 'player',
  health: 100,
  time: 100
};

function loadMap(map: string): State {
  const entities: Map<Coordinate, Entity> = new Map();
  const groundTiles: Map<Coordinate, Ground> = new Map();
  const wallTiles: Map<Coordinate, Wall> = new Map();
  let playerPosition = makeCoordinate(0, 0);

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

const map = `


    ########
    #......############
    #..@..............#
    #......##########.#
    ########        #.#
                    ###
`;

function movePlayer(state: State, motion: Coordinate): State {
  const playerState = state.entities.get(state.playerPosition) as Player;

  const newPosition = makeCoordinate(
    state.playerPosition.row + motion.row,
    state.playerPosition.column + motion.column
  );

  if (state.wallTiles.has(newPosition)) {
    return state;
  }

  state.entities.delete(state.playerPosition);
  state.entities.set(newPosition, playerState);
  state.playerPosition = newPosition;

  return state;
}

function updateState(state: State, key: String): State {
  const input = {
    left: key === 'h',
    down: key === 'j',
    up: key === 'k',
    right: key === 'l'
  };

  if (input.right) {
    movePlayer(state, makeCoordinate(0, 1))
  }

  if (input.left) {
    movePlayer(state, makeCoordinate(0, -1))
  }

  if (input.up) {
    movePlayer(state, makeCoordinate(-1, 0))
  }

  if (input.down) {
    movePlayer(state, makeCoordinate(1, 0))
  }

  return {
    ...state
  };
}

function main(sources: Sources): Sinks {
  const initialState: State = {
    ...loadMap(map)
  };

  const keydown$ = sources.DOM
    .select('body')
    .events('keydown')
    .map((event: KeyboardEvent) => keycode(event.keyCode));

  const state$ = keydown$.fold(
    (state, key) => updateState(state, key),
    initialState
  );

  return {
    DOM: state$.map(view)
  };
}

const drivers = {
  DOM: makeDOMDriver(document.body),
  Time: timeDriver
};

run(main, drivers);
