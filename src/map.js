export const TILE_TYPES = {
    GRASS: 0,
    WALL: 1,
    FLOOR: 2,
    TREE: 3,
    STONE: 4,
    BERRY_BUSH: 5,
};

export const TILE_SIZE = 32;

export class GameMap {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.tiles = [];

        for (let y = 0; y < height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < width; x++) {
                // Randomly place some trees and stones
                const rand = Math.random();
                if (rand < 0.05) {
                    this.tiles[y][x] = TILE_TYPES.TREE;
                } else if (rand < 0.08) {
                    this.tiles[y][x] = TILE_TYPES.STONE;
                } else if (rand < 0.1) {
                    this.tiles[y][x] = TILE_TYPES.BERRY_BUSH;
                } else {
                    this.tiles[y][x] = TILE_TYPES.GRASS;
                }
            }
        }
    }

    setTile(x, y, type) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.tiles[y][x] = type;
        }
    }

    getTile(x, y) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.tiles[y][x];
        }
        return null;
    }

    draw(ctx) {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.tiles[y][x];

                // Draw background (always grass or floor)
                ctx.fillStyle = (tile === TILE_TYPES.FLOOR) ? '#a0522d' : '#567d46';
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

                // Draw grid lines
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
                ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

                // Draw emoji for certain tiles
                const symbol = this.getTileSymbol(tile);
                if (symbol) {
                    ctx.font = `${TILE_SIZE * 0.8}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(
                        symbol,
                        x * TILE_SIZE + TILE_SIZE / 2,
                        y * TILE_SIZE + TILE_SIZE / 2
                    );
                } else if (tile === TILE_TYPES.WALL) {
                    ctx.fillStyle = '#7a7a7a';
                    ctx.fillRect(x * TILE_SIZE + 2, y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                }
            }
        }
    }

    getTileSymbol(type) {
        switch (type) {
            case TILE_TYPES.TREE: return '🌳';
            case TILE_TYPES.STONE: return '🪨';
            case TILE_TYPES.BERRY_BUSH: return '🫐';
            default: return null;
        }
    }
}
