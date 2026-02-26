import { TILE_SIZE, TILE_TYPES } from './map.js';

export class Pawn {
    constructor(name, x, y) {
        this.name = name;
        this.x = x; // Grid X
        this.y = y; // Grid Y
        this.pixelX = x * TILE_SIZE;
        this.pixelY = y * TILE_SIZE;
        this.targetX = x;
        this.targetY = y;
        this.health = 100;
        this.hunger = 0;
        this.speed = 2; // Pixels per frame
        this.isSelected = false;
        this.symbol = '🧑';
    }

    update(gameMap) {
        // Simple movement towards target
        const targetPixelX = this.targetX * TILE_SIZE;
        const targetPixelY = this.targetY * TILE_SIZE;

        if (this.pixelX < targetPixelX) {
            this.pixelX = Math.min(this.pixelX + this.speed, targetPixelX);
        } else if (this.pixelX > targetPixelX) {
            this.pixelX = Math.max(this.pixelX - this.speed, targetPixelX);
        }

        if (this.pixelY < targetPixelY) {
            this.pixelY = Math.min(this.pixelY + this.speed, targetPixelY);
        } else if (this.pixelY > targetPixelY) {
            this.pixelY = Math.max(this.pixelY - this.speed, targetPixelY);
        }

        // Update grid position when reaching target
        if (this.pixelX === targetPixelX && this.pixelY === targetPixelY) {
            this.x = this.targetX;
            this.y = this.targetY;
        }

        // Increment hunger
        this.hunger = Math.min(this.hunger + 0.01, 100);
    }

    setTarget(x, y, gameMap) {
        // Basic check: can't move into walls or stones
        const tile = gameMap.getTile(x, y);
        if (tile !== TILE_TYPES.WALL && tile !== TILE_TYPES.STONE && tile !== TILE_TYPES.TREE) {
            this.targetX = x;
            this.targetY = y;
        }
    }

    draw(ctx) {
        // Draw selection highlight
        if (this.isSelected) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.pixelX, this.pixelY, TILE_SIZE, TILE_SIZE);
        }

        // Draw pawn emoji
        ctx.font = `${TILE_SIZE * 0.8}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            this.symbol,
            this.pixelX + TILE_SIZE / 2,
            this.pixelY + TILE_SIZE / 2
        );

        // Draw name
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.pixelX + TILE_SIZE / 2, this.pixelY - 5);
    }
}
