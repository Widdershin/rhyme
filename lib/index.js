"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var run_1 = require("@cycle/run");
var dom_1 = require("@cycle/dom");
var time_1 = require("@cycle/time");
var keycode = require("keycode");
function characterFor(tile) {
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
function stateToArray(state) {
    var array = Array(state.height).fill(0).map(function (_, row) { return Array(state.width).fill(0).map(function (__, column) {
    }); });
    return array;
}
function view(state) {
    return dom_1.div('.game', [
        dom_1.pre('.floor', stateToArray(state).map(function (row) {
            return dom_1.div('.row', row.map(function (tile) { return dom_1.div('.tile', characterFor(tile)); }));
        }))
    ]);
}
var player = {
    type: 'player',
    health: 100,
    time: 100
};
function loadMap(map) {
    var entities = new Map();
    var groundTiles = new Map();
    var wallTiles = new Map();
    function parseChar(character, row, column) {
        var coordinate = { row: row, column: column };
        if (character === '@') {
            entities.set(coordinate, player);
        }
        if (character === '#') {
            wallTiles.set(coordinate, { type: 'wall' });
        }
        if (character === '.') {
            groundTiles.set(coordinate, { type: 'ground' });
        }
    }
    var rows = map.split('\n');
    rows.forEach(function (line, row) {
        return line.split('').forEach(function (char, column) { return parseChar(char, row, column); });
    });
    return {
        width: 10,
        height: rows.length,
        entities: entities,
        groundTiles: groundTiles,
        wallTiles: wallTiles
    };
}
var map = "\n\n\n    ########\n    #......############\n    #..@..............#\n    #......##########.#\n    ########        #.#\n                    ###\n";
function updateState(state, key) {
    var input = {
        left: key === 'h',
        down: key === 'j',
        up: key === 'k',
        right: key === 'l'
    };
    return __assign({}, state);
}
function main(sources) {
    var initialState = __assign({}, loadMap(map));
    var keydown$ = sources.DOM
        .select('body')
        .events('keydown')
        .map(function (event) { return keycode(event.keyCode); });
    var state$ = keydown$.fold(function (state, key) { return updateState(state, key); }, initialState);
    return {
        DOM: state$.map(view)
    };
}
var drivers = {
    DOM: dom_1.makeDOMDriver(document.body),
    Time: time_1.timeDriver
};
run_1.run(main, drivers);
