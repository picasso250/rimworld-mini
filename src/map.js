export const TILE_TYPES = {
    GRASS: 0,
    WALL: 1,
    FLOOR: 2,
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
                this.tiles[y][x] = TILE_TYPES.GRASS;
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
                ctx.fillStyle = this.getTileColor(tile);
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

                // Draw grid lines
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
                ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    getTileColor(type) {
        switch (type) {
            case TILE_TYPES.GRASS: return '#567d46';
            case TILE_TYPES.WALL: return '#7a7a7a';
            case TILE_TYPES.FLOOR: return '#a0522d';
            default: return '#000';
        }
    }
}
