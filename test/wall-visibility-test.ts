import * as assert from 'assert';
import {
  loadMap,
  makeCoordinates,
  makeCoordinate,
  Coordinate,
  calculateVisibleTiles
} from '../src/game';

function onlyVisibleTiles(str: string, visibleTiles: Set<Coordinate>): string {
  return str
    .split('\n')
    .map((line, row) =>
      line
        .split('')
        .map(
          (char, column) =>
            visibleTiles.has(makeCoordinate(row, column)) ? char : ' '
        )
        .join('')
    )
    .join('\n');
}

function trimWhitespace(str: string): string {
  return str.split('\n').map(line => line.trim()).join('\n').trim();
}

describe.only('calculateVisibleTiles', () => {
  const examples = [
    {
      map: `
        #####   ####
        #.@.#   #..#
        #...#   ####
        #####
      `,

      visible: `
        #####
        #.@.#
        #...#
        #####
      `
    },

    {
      map: `
    ########
    #......############
    #..@..............#
    #......##########.#
    ########        #.#
                    #.#
                    #.#
                    #.#
      `,

      visible: `
    ########
    #......############
    #..@..............#
    #......##########.#
    ########
      `
    }
  ];

  examples.forEach((example, index) => {
    it(`returns a set of coordinates visible to the player (example #${index})`, () => {
      const { map, visible } = example;

      const state = loadMap(map);

      const coordinates = makeCoordinates(state);
      const actual = calculateVisibleTiles(coordinates, state);

      assert.equal(
        trimWhitespace(onlyVisibleTiles(map, actual)),
        trimWhitespace(visible),
        `\nExpected:\n ${visible}\nGot:\n${onlyVisibleTiles(map, actual)}`
      );
    });
  });
});
