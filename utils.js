import { MAP_WIDTH, MAP_HEIGHT } from './constants.js';
import { map, pawns, buildings, particles } from './game.js';

// --- 查找逻辑 (AI) ---

export function findBlueprintNeedsMaterial(pawn) {
    for(const b of buildings) {
        if (b.isBlueprint) {
            if (b.needsMaterial('wood')) return { building: b, matType: 'wood' };
            if (b.needsMaterial('stone')) return { building: b, matType: 'stone' };
        }
    }
    return null;
}

export function findBlueprintReadyToBuild(pawn) {
    for(const b of buildings) {
        if (b.isReadyToBuild()) return b;
    }
    return null;
}

export function findNearestJob(pawn) {
    let nearest = null; let minDist = Infinity;
    for (let x = 0; x < MAP_WIDTH; x++) {
        for (let y = 0; y < MAP_HEIGHT; y++) {
            const t = map[x][y];
            if (t.designation) {
                const isTaken = pawns.some(p => p !== pawn && p.job && p.job.tile === t);
                if (isTaken) continue;
                const dist = Math.hypot(pawn.x - x, pawn.y - y);
                if (dist < minDist) { minDist = dist; nearest = t; }
            }
        }
    }
    return nearest;
}

export function findNearestHaulable(pawn) {
    let nearest = null; let minDist = Infinity;
    for (let x = 0; x < MAP_WIDTH; x++) {
        for (let y = 0; y < MAP_HEIGHT; y++) {
            const t = map[x][y];
            if (t.items.length > 0) {
                 const isTaken = pawns.some(p => p !== pawn && p.job && p.job.type === 'HAUL' && p.job.tile === t);
                 if (isTaken) continue;
                 const dist = Math.hypot(pawn.x - x, pawn.y - y);
                 if (dist < minDist) { minDist = dist; nearest = t; }
            }
        }
    }
    return nearest;
}

export function findNearestItem(pawn, type) {
    let nearest = null; let minDist = Infinity;
    for (let x = 0; x < MAP_WIDTH; x++) {
        for (let y = 0; y < MAP_HEIGHT; y++) {
            const t = map[x][y];
            if (t.items.some(i => i.type === type)) {
                 const dist = Math.hypot(pawn.x - x, pawn.y - y);
                 if (dist < minDist) { minDist = dist; nearest = t; }
            }
        }
    }
    return nearest;
}

export function findNearestObject(pawn, type) {
    let nearest = null; let minDist = Infinity;
    for (let x = 0; x < MAP_WIDTH; x++) {
        for (let y = 0; y < MAP_HEIGHT; y++) {
            const t = map[x][y];
            if (t.object === type) {
                const dist = Math.hypot(pawn.x - x, pawn.y - y);
                if (dist < minDist) { minDist = dist; nearest = t; }
            }
        }
    }
    return nearest;
}

export function findNearestBuilding(px, py, types) {
    let nearest = null; let minDist = Infinity;
    for(const b of buildings) {
        if (!b.isBlueprint && types.includes(b.type)) {
            const dist = Math.hypot(px - b.x, py - b.y);
            if(dist < minDist) { minDist = dist; nearest = b; }
        }
    }
    return nearest;
}

export function showFloatingText(x, y, text, color) {
    particles.push({ x: x, y: y, text: text, color: color, life: 60, offset: 0 });
}
