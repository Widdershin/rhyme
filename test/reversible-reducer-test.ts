import * as assert from 'assert';
import * as jsc from 'jsverify';
import {
  makeCoordinate,
  loadMap,
  updateState,
  reverseUpdate,
  State,
  Floor,
  Tile
} from '../src/game';

const options = ['h', 'j', 'k', 'l'];

const arbitrary = jsc.array((jsc as any).oneof(options.map(jsc.constant)));

const map = `
########
#......#
#...@..#
#......#
########
`;

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

function floorToString(floor: Floor): string {
  return floor.map(row => row.map(characterFor).join('')).join('\n');
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
describe('updateState', () => {
  jsc.property('reversible', arbitrary, input => {
    let replay = '';

    const state = loadMap(map);

    let states: string[] = [floorToString(stateToArray(state))];

    function captureStateUpdate(acc: State, val: string) {
      const newState = updateState(acc, val);

      replay += `forward with input (${val})\n${floorToString(
        stateToArray(newState)
      )}`;
      states.push(floorToString(stateToArray(newState)));

      return newState;
    }

    replay += `input: ${input}\n`;
    replay += `starting state\n${floorToString(stateToArray(state))}`;

    let currentState = input.reduce(captureStateUpdate, state);

    states.pop();

    while (states.length > 0) {
      const currentInput: string = input.pop() as string;

      const reversedState = reverseUpdate(currentState as State, currentInput);

      const stringToCheck = states.pop();

      const currentStateAsString = floorToString(
        stateToArray(reversedState as State)
      );

      replay += `reversing input (${currentInput}) \n${floorToString(
        stateToArray(reversedState)
      )}`;

      const equal = currentStateAsString === stringToCheck;

      replay += `equal: ${equal}\n`;

      if (!equal) {
        replay += `Expected:\n${stringToCheck}`;
        replay += `Actual:\n${currentStateAsString}`;
      }

      assert(equal, replay);
    }

    return true;
  });
});
