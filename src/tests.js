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
// Reset map to grass for predictable testing
for(let y=0; y<10; y++) {
    for(let x=0; x<10; x++) {
        map.setTile(x, y, TILE_TYPES.GRASS);
    }
}

assert(map.getTile(0, 0) === TILE_TYPES.GRASS, "Initial tile should be grass");
map.setTile(1, 1, TILE_TYPES.WALL);
assert(map.getTile(1, 1) === TILE_TYPES.WALL, "Tile should be wall after setting");
assert(map.getTile(10, 10) === null, "Out of bounds should return null");

map.setTile(2, 2, TILE_TYPES.TREE);
assert(map.getTile(2, 2) === TILE_TYPES.TREE, "Tile should be tree after setting");
map.setTile(3, 3, TILE_TYPES.STONE);
assert(map.getTile(3, 3) === TILE_TYPES.STONE, "Tile should be stone after setting");

console.log("Map tests passed!");

// Test Pawn
const pawn = new Pawn("TestPawn", 0, 0);
assert(pawn.x === 0 && pawn.y === 0, "Initial position should be 0,0");

// Try moving to a valid tile
pawn.setTarget(5, 5, map);
assert(pawn.targetX === 5 && pawn.targetY === 5, "Target should be 5,5");

// Try moving to a wall (1,1 is a wall)
pawn.setTarget(1, 1, map);
assert(pawn.targetX === 5 && pawn.targetY === 5, "Target should NOT change when targeting a wall");

// Try moving to a tree (2,2 is a tree)
pawn.setTarget(2, 2, map);
assert(pawn.targetX === 5 && pawn.targetY === 5, "Target should NOT change when targeting a tree");

// Try moving to a stone (3,3 is a stone)
pawn.setTarget(3, 3, map);
assert(pawn.targetX === 5 && pawn.targetY === 5, "Target should NOT change when targeting a stone");

console.log("Pawn tests passed!");
console.log("All tests passed successfully!");
