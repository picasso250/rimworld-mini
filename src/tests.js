import { GameMap, TILE_TYPES } from './map.js';
import { Pawn } from './pawn.js';

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

console.log("Running tests...");

// Test Map
const map = new GameMap(10, 10);
assert(map.getTile(0, 0) === TILE_TYPES.GRASS, "Initial tile should be grass");
map.setTile(1, 1, TILE_TYPES.WALL);
assert(map.getTile(1, 1) === TILE_TYPES.WALL, "Tile should be wall after setting");
assert(map.getTile(10, 10) === null, "Out of bounds should return null");
console.log("Map tests passed!");

// Test Pawn
const pawn = new Pawn("TestPawn", 0, 0);
assert(pawn.x === 0 && pawn.y === 0, "Initial position should be 0,0");

// Try moving to a valid tile
pawn.setTarget(2, 2, map);
assert(pawn.targetX === 2 && pawn.targetY === 2, "Target should be 2,2");

// Try moving to a wall (1,1 is a wall)
pawn.setTarget(1, 1, map);
assert(pawn.targetX === 2 && pawn.targetY === 2, "Target should NOT change when targeting a wall");

console.log("Pawn tests passed!");
console.log("All tests passed successfully!");
