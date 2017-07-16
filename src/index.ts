import { run } from '@cycle/run';
import { makeDOMDriver, div, pre, DOMSource, VNode } from '@cycle/dom';
import { timeDriver, TimeSource } from '@cycle/time';
import xs, { Stream } from 'xstream';

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

interface State {
  floor: Floor;
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

function view(state: State) {
  return div('.game', [
    pre(
      '.floor',
      state.floor.map(row =>
        div('.row', row.map(tile => div('.tile', characterFor(tile))))
      )
    )
  ]);
}

const player = {
  type: 'player',
  health: 100,
  time: 100
};

const wall = {
  type: 'wall'
};

function loadMap(map: string): Floor {
  function parseChar(character: string): Tile {
    if (character === '@') {
      return { ground: 'ground', space: player };
    }

    if (character === '#') {
      return { ground: 'ground', space: wall };
    }

    if (character === '.') {
      return { ground: 'ground', space: null };
    }

    return { ground: null, space: null };
  }

  return map.split('\n').map(line => line.split('').map(parseChar));
}

const map = `


    ########
    #......############
    #..@..............#
    #......##########.#
    ########        #.#
                    ###
`;

function main(sources: Sources): Sinks {
  console.log(sources);

  const initialState: State = {
    floor: loadMap(map)
  };


  const state$ = xs.of(initialState);

  return {
    DOM: state$.map(view)
  };
}

const drivers = {
  DOM: makeDOMDriver(document.body),
  Time: timeDriver
};

run(main, drivers);
