import { MAP_WIDTH, MAP_HEIGHT, BUILDINGS } from './constants.js';
import { map, resources, dropItem } from './game.js';
import {
    findNearestBuilding,
    showFloatingText,
    findNearestItem,
    findNearestObject,
    findBlueprintNeedsMaterial,
    findBlueprintReadyToBuild,
    findNearestJob
} from './utils.js';
import { updateUI } from './ui.js';

// --- 类定义 ---

export class Tile {
    constructor(x, y, type) {
        this.x = x; this.y = y; this.type = type;
        this.buildingRef = null;
        this.object = null;
        this.designation = null;
        this.items = [];
        this.walkable = type !== 'water';
    }
}

export class Building {
    constructor(type, x, y, isBlueprint = false) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.type = type;
        this.x = x; this.y = y;
        this.data = BUILDINGS[type];
        this.isBlueprint = isBlueprint;
        this.progress = isBlueprint ? 0 : 100;
        this.needed = isBlueprint ? { ...this.data.cost } : {};
        this.delivered = { wood: 0, stone: 0 };
        this.items = [];
    }

    needsMaterial(type) {
        if (!this.isBlueprint) return false;
        return (this.delivered[type] || 0) < (this.needed[type] || 0);
    }

    addMaterial(type, amount) {
        if (!this.delivered[type]) this.delivered[type] = 0;
        this.delivered[type] += amount;
        return true;
    }

    isReadyToBuild() {
        if (!this.isBlueprint) return false;
        for (let key in this.needed) {
            if ((this.delivered[key] || 0) < this.needed[key]) return false;
        }
        return this.progress < 100;
    }
}

export class Pawn {
    constructor(x, y, name, id) {
        this.id = id;
        this.x = x; this.y = y;
        this.targetX = null; this.targetY = null;
        this.name = name;
        this.color = `hsl(${Math.random() * 360}, 60%, 50%)`;
        this.state = 'IDLE'; // IDLE, MOVING, WORKING, SLEEPING, PASSED_OUT
        this.job = null;
        this.hunger = 100;
        this.rest = 100; // 新增休息度
        this.carrying = null;
    }

    update() {
        // 自然消耗
        this.hunger -= 0.02;
        if (this.hunger < 0) this.hunger = 0;

        // 休息度消耗 (醒着的时候)
        if (this.state !== 'SLEEPING' && this.state !== 'PASSED_OUT') {
            this.rest -= 0.01; // 约每2秒降1点
        }

        // 昏厥检查
        if (this.rest <= 0 && this.state !== 'SLEEPING') {
            this.state = 'PASSED_OUT';
            this.job = null;
            this.targetX = null;
            this.targetY = null;
        }

        switch (this.state) {
            case 'IDLE':
                this.findJob();
                // 闲逛
                if (!this.job && Math.random() < 0.01) {
                    this.setDestination(this.x + (Math.random() * 4 - 2), this.y + (Math.random() * 4 - 2));
                }
                break;
            case 'MOVING':
                this.move();
                break;
            case 'WORKING':
                this.doWork();
                break;
            case 'SLEEPING':
                this.doSleep();
                break;
            case 'PASSED_OUT':
                this.doPassedOut();
                break;
        }
    }

    findJob() {
        // 0. 疲劳检查 (最高优先级)
        if (this.rest < 5) {
            // 寻找帐篷或基地
            const bed = findNearestBuilding(this.x, this.y, ['tent', 'base_camp']);
            if (bed) {
                this.job = { type: 'SLEEP', targetBuilding: bed };
                this.calculatePath(bed.x, bed.y);
                return;
            } else {
                // 没有床，在原地睡觉
                this.job = { type: 'SLEEP_GROUND' };
                this.state = 'SLEEPING';
                showFloatingText(this.x, this.y, "Sleeping on ground", "#60a5fa");
                return;
            }
        }

        // 1. 吃饭
        if (this.hunger < 30) {
            const foodTile = findNearestItem(this, 'food');
            if (foodTile) {
                this.job = { type: 'EAT_ITEM', tile: foodTile };
                this.calculatePath(foodTile.x, foodTile.y);
                return;
            }
            const bushTile = findNearestObject(this, 'berry');
            if (bushTile) {
                this.job = { type: 'EAT_BUSH', tile: bushTile };
                this.calculatePath(bushTile.x, bushTile.y);
                return;
            }
        }

        // 2. 建造逻辑
        const blueprintNeedsMat = findBlueprintNeedsMaterial(this);
        if (blueprintNeedsMat) {
            const matType = blueprintNeedsMat.matType;
            const bp = blueprintNeedsMat.building;
            // 寻找地上的材料
            const matTile = findNearestItem(this, matType);
            if (matTile) {
                 this.job = { type: 'HAUL_BUILD', targetBuilding: bp, tile: matTile, matType: matType };
                 this.calculatePath(matTile.x, matTile.y);
                 return;
            }
        }

        const blueprintReady = findBlueprintReadyToBuild(this);
        if (blueprintReady) {
            this.job = { type: 'CONSTRUCT', targetBuilding: blueprintReady };
            this.calculatePath(blueprintReady.x, blueprintReady.y);
            return;
        }

        // 3. 搬运 (暂时删除，因为没有仓库。资源直接留在地上)

        // 4. 工作
        const jobTile = findNearestJob(this);
        if (jobTile) {
            this.job = { type: jobTile.designation, tile: jobTile };
            this.calculatePath(jobTile.x, jobTile.y);
        }
    }

    setDestination(tx, ty) {
        tx = Math.max(0, Math.min(MAP_WIDTH - 1, Math.round(tx)));
        ty = Math.max(0, Math.min(MAP_HEIGHT - 1, Math.round(ty)));
        if (map[tx][ty].walkable && !map[tx][ty].buildingRef) {
             this.calculatePath(tx, ty);
        }
    }

    calculatePath(tx, ty) {
        this.targetX = tx;
        this.targetY = ty;
        this.state = 'MOVING';
    }

    move() {
        if (this.targetX === null) return;
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = 0.08;

        if (dist < speed) {
            this.x = this.targetX;
            this.y = this.targetY;

            // 睡眠任务特殊处理
            if (this.job && this.job.type === 'SLEEP') {
                // 稍微走进建筑中心一点
                this.x = this.job.targetBuilding.x + 0.5;
                this.y = this.job.targetBuilding.y + 0.5;
                this.state = 'SLEEPING';
                showFloatingText(this.x, this.y, "Zzz...", "#60a5fa");
                return;
            }

            // 搬运任务 (分两阶段：1. 走到材料处并捡起 2. 走到建筑处)
            if (this.job && this.job.type === 'HAUL_BUILD') {
                if (!this.carrying) {
                    // 到达材料所在格子
                    const tile = this.job.tile;
                    const itemIdx = tile.items.findIndex(i => i.type === this.job.matType);
                    if (itemIdx >= 0) {
                        const amount = Math.min(10, tile.items[itemIdx].amount);
                        tile.items[itemIdx].amount -= amount;
                        if (tile.items[itemIdx].amount <= 0) tile.items.splice(itemIdx, 1);

                        // 更新全局资源计数
                        resources[this.job.matType] -= amount;

                        this.carrying = { type: this.job.matType, amount: amount };
                        this.targetX = this.job.targetBuilding.x + 0.5;
                        this.targetY = this.job.targetBuilding.y + 0.5;
                        this.state = 'MOVING';
                        showFloatingText(this.x, this.y, "Picked up " + this.job.matType, "white");
                    } else {
                        this.job = null;
                        this.state = 'IDLE';
                    }
                } else {
                    this.state = 'WORKING';
                    this.workTimer = 0;
                }
                return;
            }

            if (this.job && this.job.type === 'HAUL' && !this.carrying) {
                if (this.job.tile.items.length > 0) {
                    this.carrying = this.job.tile.items.pop();
                    this.targetX = this.job.targetBuilding.x + 0.5;
                    this.targetY = this.job.targetBuilding.y + 0.5;
                    this.state = 'MOVING';
                } else {
                    this.job = null;
                    this.state = 'IDLE';
                }
                return;
            }

            if (this.job && this.job.type === 'CONSTRUCT') {
                 this.state = 'WORKING';
                 this.workTimer = 0;
                 return;
            }

            if (this.job && this.job.tile && Math.abs(this.x - this.targetX) < 0.5 && Math.abs(this.y - this.targetY) < 0.5) {
                this.state = 'WORKING';
                this.workTimer = 0;
            } else {
                this.state = 'IDLE';
            }
        } else {
            this.x += (dx / dist) * speed;
            this.y += (dy / dist) * speed;
        }
    }

    doWork() {
        if (!this.job) { this.state = 'IDLE'; return; }
        this.workTimer++;

        let workDuration = 60;
        if (this.job.type === 'HAUL' || this.job.type === 'HAUL_BUILD') workDuration = 20;

        if (this.workTimer >= workDuration) {
            this.completeJob();
        }
    }

    doSleep() {
        // 在床上/帐篷里，恢复快；在地上恢复慢一些
        let recovery = 0.4;
        if (this.job && this.job.type === 'SLEEP_GROUND') {
            recovery = 0.15; // 比床上慢，但比昏厥快
        }
        this.rest += recovery;
        if (Math.random() < 0.05) showFloatingText(this.x, this.y, "Zzz", "#60a5fa");

        if (this.rest >= 100) {
            this.rest = 100;
            this.state = 'IDLE';
            this.job = null;
            showFloatingText(this.x, this.y, "Refreshed!", "#22c55e");
        }
    }

    doPassedOut() {
        // 倒在野外，恢复慢
        this.rest += 0.05;
        if (Math.random() < 0.02) showFloatingText(this.x, this.y, "...", "gray");

        if (this.rest >= 30) {
            // 稍微恢复一点就会醒来，但仍然很累
            this.state = 'IDLE';
            showFloatingText(this.x, this.y, "Ugh...", "gray");
        }
    }

    completeJob() {
        if (this.job.type === 'HAUL_BUILD') {
            const bp = this.job.targetBuilding;
            if (bp.isBlueprint && this.carrying) {
                bp.addMaterial(this.carrying.type, this.carrying.amount);
                showFloatingText(this.x, this.y, `Add ${this.carrying.amount} ${this.carrying.type}`, "#3b82f6");
            }
            this.carrying = null;
        }
        else if (this.job.type === 'CONSTRUCT') {
            const bp = this.job.targetBuilding;
            if (bp.isBlueprint) {
                bp.progress += 20;
                showFloatingText(this.x, this.y, `${bp.progress}%`, "#10b981");
                if (bp.progress >= 100) {
                    bp.isBlueprint = false;
                    bp.progress = 100;
                    for(let i=0; i<bp.data.w; i++) {
                        for(let j=0; j<bp.data.h; j++) { map[bp.x+i][bp.y+j].walkable = false; }
                    }
                }
            }
        }
        else if (this.job.type === 'HAUL' && this.carrying) {
            // 虽然禁用了 HAUL 任务，但保留逻辑以防万一
            dropItem(Math.round(this.x), Math.round(this.y), this.carrying.type, this.carrying.amount);
            this.carrying = null;
        }
        else if (this.job.type === 'EAT_BUSH') {
             this.hunger = 100;
             dropItem(this.job.tile.x, this.job.tile.y, 'food', 5);
             this.job.tile.object = null;
        }
        else if (this.job.type === 'EAT_ITEM') {
            const foodIdx = this.job.tile.items.findIndex(i => i.type === 'food');
            if (foodIdx >= 0) {
                const amountConsumed = Math.min(5, this.job.tile.items[foodIdx].amount);
                this.job.tile.items[foodIdx].amount -= amountConsumed;
                if (this.job.tile.items[foodIdx].amount <= 0) this.job.tile.items.splice(foodIdx, 1);

                // 更新全局资源计数
                resources.food -= amountConsumed;
                this.hunger = 100;
                showFloatingText(this.x, this.y, "Ate food", "#22c55e");
            }
        }
        else if (this.job.type === 'chop') {
            this.job.tile.object = null; this.job.tile.designation = null;
            dropItem(this.job.tile.x, this.job.tile.y, 'wood', 15);
        }
        else if (this.job.type === 'mine') {
            this.job.tile.object = null; this.job.tile.designation = null; this.job.tile.walkable = true;
            dropItem(this.job.tile.x, this.job.tile.y, 'stone', 8);
        }
        else if (this.job.type === 'harvest') {
            this.job.tile.object = null; this.job.tile.designation = null;
            dropItem(this.job.tile.x, this.job.tile.y, 'food', 12);
        }

        this.job = null;
        this.state = 'IDLE';
        updateUI();
    }
}
