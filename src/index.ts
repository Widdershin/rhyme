import { run } from '@cycle/run';
import { makeDOMDriver, div, pre, DOMSource, VNode } from '@cycle/dom';
import { timeDriver, TimeSource } from '@cycle/time';
import * as keycode from 'keycode';
import { Stream } from 'xstream';

import {
  State,
  Tile,
  Floor,
  Player,
  Coordinate,
  makeCoordinate,
  updateState,
  loadMap,
  reverseUpdate,
  calculateVisibleTiles,
  makeCoordinates
} from './game';

interface Sources {
  DOM: DOMSource;
  Time: TimeSource;
}

interface Sinks {
  DOM: Stream<VNode>;
}

interface ClientState {
  gameState: State;
  log: string[];
  visibleTiles: Set<Coordinate>;
  seenTiles: Set<Coordinate>;
  coordinates: Coordinate[][];
}

function characterFor(tile: Tile): String {
  if (tile.space && tile.space.type === 'player') {
    return '@';
  }

  if (tile.space && tile.space.type === 'direWolf') {
    return 'w';
  }

  if (tile.floor.size > 0) {
    return 'w';
  }

  if (tile.space && tile.space.type === 'wall') {
    return '#';
  }

  if (tile.ground && tile.ground === 'ground') {
    return '.';
  }

  return ' ';
}

interface Chunk<T> {
  item: T;
  count: number;
}

function chunk<T>(array: T[]): Chunk<T>[] {
  const result = [];
  let lastItem = null;
  let lastChunk = undefined;

  for (let item of array) {
    if (item === lastItem) {
      (lastChunk as Chunk<T>).count += 1;
    }

    if (item !== lastItem) {
      lastChunk = { count: 1, item };
      result.push(lastChunk);
    }

    lastItem = item;
  }

  return result;
}

function stateToArray(coordinates: Coordinate[][], state: State): Floor {
 return coordinates.map(row =>
   row.map(coordinate => {
    let ground: string | null = null;

    if (state.groundTiles.has(coordinate)) {
      ground = 'ground';
    }

    const wall = state.wallTiles.get(coordinate);
    const entity = state.entities.get(coordinate);
    const deadEntities = state.deadEntities.get(coordinate);

    const tile = {
      ground,

      floor: deadEntities || new Set(),

      space: entity || wall
    };

    return tile;
   })
 );
}

function classesFor(tile: Tile, coordinate: Coordinate, state: ClientState) {
  return {
    [(tile.space && tile.space.type) || tile.ground]: true,
    visible: state.visibleTiles.has(coordinate),
    seen: state.seenTiles.has(coordinate)
  };
}

function renderStats(state: State) {
  const playerState = state.entities.get(state.playerPosition) as Player;

  const stats = [
    `Health: ${playerState.health}`,
    `Time: ${playerState.time} turn(s)`
  ].join('\n');

  return pre('.stats-inner', stats);
}

function view(clientState: ClientState) {
  const state = clientState.gameState;

  return div('.game', [
    pre(
      '.floor',
      stateToArray(clientState.coordinates, state).map((row, rowIndex) =>
        div(
          '.row',
          row.map((tile, columnIndex) =>
            div(
              '.tile',
              {
                class: classesFor(
                  tile,
                  makeCoordinate(rowIndex, columnIndex),
                  clientState
                )
              },
              characterFor(tile)
            )
          )
        )
      )
    ),
    div('.ui', [
      div('.stats', renderStats(state)),
      div(
        '.log',
        chunk(clientState.log)
          .slice(-6)
          .map(chunk =>
            div(
              '.message',
              `${chunk.item}` + (chunk.count > 1 ? ` x${chunk.count}` : ``)
            )
          )
      )
    ])
  ]);
}

const map = `

    ########
    #......############
    #..@..............#
    #......##########.#
    ########        #.#
                    #.#
                    #.#
                    #.#
                    #.#
          ###########.#########
          #...................#
          #...................#
          #..........w........#
          #...................#           #####
          #...................#############...#
          #...................................#
          #...................#############...#
          #...................#           #####
          #...................#
          #...................#
          #####################

`;

function main(sources: Sources): Sinks {
  const gameState = loadMap(map);
  const coordinates = makeCoordinates(gameState);

  const initialState: ClientState = {
    gameState,
    log: [],
    visibleTiles: calculateVisibleTiles(coordinates, gameState),
    seenTiles: new Set(),
    coordinates
  };


  const keydown$ = sources.DOM
    .select('body')
    .events('keydown')
    .map((event: KeyboardEvent) => keycode(event.keyCode));

  const state$ = keydown$.fold((state, key) => {
    const gameStateReducer = key === 'r' ? reverseUpdate : updateState;

    const playerState = state.gameState.entities.get(
      state.gameState.playerPosition
    ) as Player;

    if (key === 'r' && playerState.time === 0) {
      state.log.push(
        `You cannot rewind with no time stored, you must go forward.`
      );

      return state;
    }

    const logger = (message: string) => state.log.push(message);
    const gameState = gameStateReducer(state.gameState, key, logger);
    const visibleTiles = calculateVisibleTiles(state.coordinates, gameState);

    return {
      ...state,

      gameState,

      visibleTiles,

      seenTiles: new Set([...state.seenTiles, ...visibleTiles])
    };
  }, initialState);

  return {
    DOM: state$.map(view)
  };
}

const drivers = {
  DOM: makeDOMDriver(document.body),
  Time: timeDriver
};

run(main, drivers);
