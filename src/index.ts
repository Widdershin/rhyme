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
  makeCoordinate,
  updateState,
  loadMap,
  reverseUpdate
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
  log: Array<string>;
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
      const deadEntities = state.deadEntities.get(coordinate);

      const tile = {
        ground,

        floor: deadEntities || new Set(),

        space: entity || wall
      };

      return tile;
    })
  );

  return array;
}

function classesFor(tile: Tile) {
  return {
    [(tile.space && tile.space.type) || tile.ground]: true
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
      stateToArray(state).map(row =>
        div(
          '.row',
          row.map(tile =>
            div('.tile', { class: classesFor(tile) }, characterFor(tile))
          )
        )
      )
    ),
    div('.ui', [
      div('.stats', renderStats(state)),
      div(
        '.log',
        chunk(clientState.log).slice(-6).map(chunk =>
          div(
            '.message',
            `${chunk.item}` + ((chunk.count > 1) ? ` x${chunk.count}` : ``)
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
  const initialState: ClientState = {
    gameState: loadMap(map),
    log: []
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

    return {
      ...state,

      gameState: gameStateReducer(state.gameState, key, logger)
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
