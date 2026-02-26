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
        // Basic check: can't move into walls
        if (gameMap.getTile(x, y) !== TILE_TYPES.WALL) {
            this.targetX = x;
            this.targetY = y;
        }
    }

    draw(ctx) {
        // Draw pawn
        ctx.fillStyle = this.isSelected ? '#ffff00' : '#ffffff';
        ctx.beginPath();
        ctx.arc(
            this.pixelX + TILE_SIZE / 2,
            this.pixelY + TILE_SIZE / 2,
            TILE_SIZE * 0.4,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Draw name
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.pixelX + TILE_SIZE / 2, this.pixelY - 5);
    }
}
