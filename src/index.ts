import { run } from '@cycle/run';
import { makeDOMDriver, div, pre, DOMSource, VNode } from '@cycle/dom';
import { timeDriver, TimeSource } from '@cycle/time';
import * as keycode from 'keycode';
import { Stream } from 'xstream';

import {
  State,
  Tile,
  Floor,
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

function classesFor(tile: Tile) {
  return {
    [(tile.space && tile.space.type) || tile.ground]: true
  };
}

function view(state: State) {
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
    )
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
          #...................#
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
  const initialState: State = {
    ...loadMap(map)
  };

  const keydown$ = sources.DOM
    .select('body')
    .events('keydown')
    .map((event: KeyboardEvent) => keycode(event.keyCode));

  const state$ = keydown$.fold((state, key) => {
    if (key === 'r') {
      return reverseUpdate(state);
    }

    return updateState(state, key);
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
