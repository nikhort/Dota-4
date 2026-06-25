// game.js
// --- СИСТЕМА СИНТЕЗА АУДИО (БЕЗ ФАЙЛОВ) ---
class AudioManager {
    constructor() { this.ctx = null; } 
    init() { if (!this.ctx) { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } }
    play(type) {
        this.init();
        if (!this.ctx || this.ctx.state === 'suspended') return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain); gain.connect(this.ctx.destination);
        const now = this.ctx.currentTime;

        if (type === 'attack') {
            osc.type = 'triangle'; osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);
            gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        } else if (type === 'buy') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(520, now);
            osc.frequency.setValueAtTime(780, now + 0.08);
            gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now); osc.stop(now + 0.2);
        } else if (type === 'creep_death') {
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(120, now);
            osc.frequency.linearRampToValueAtTime(30, now + 0.1);
            gain.gain.setValueAtTime(0.08, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        } else if (type === 'tower_break') {
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(80, now);
            osc.frequency.linearRampToValueAtTime(20, now + 0.5);
            gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now); osc.stop(now + 0.5);
        } else if (type === 'ability') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);
            gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            osc.start(now); osc.stop(now + 0.25);
        } else if (type === 'victory') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(523, now);
            osc.frequency.setValueAtTime(659, now + 0.15); osc.frequency.setValueAtTime(783, now + 0.3);
            gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
            osc.start(now); osc.stop(now + 0.6);
        } else if (type === 'defeat') {
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(180, now);
            osc.frequency.setValueAtTime(130, now + 0.2);
            gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
            osc.start(now); osc.stop(now + 0.6);
        }
    }
}

// --- НАСТРОЙКА КАНВАСА И ОКРУЖЕНИЯ ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const audio = new AudioManager();

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

window.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ----------------------------------------------
// КАРТА С ТРЁМЯ ЛИНИЯМИ (Dota 2 стиль)
// ----------------------------------------------
class GameMap {
    constructor() {
        this.width = 8000;
        this.height = 6000;
        // Базы
        this.radiantBase = { x: 500, y: 5500 };
        this.direBase = { x: 7500, y: 1000 };
        // Waypoints для каждой линии (от Radiant к Dire)
        this.waypoints = {
            top: [
                { x: this.radiantBase.x, y: this.radiantBase.y },
                { x: this.radiantBase.x, y: 1000 },
                { x: this.direBase.x, y: 1000 }
            ],
            mid: [
                { x: this.radiantBase.x, y: this.radiantBase.y },
                { x: this.direBase.x, y: this.direBase.y }
            ],
            bottom: [
                { x: this.radiantBase.x, y: this.radiantBase.y },
                { x: 7500, y: this.radiantBase.y },
                { x: this.direBase.x, y: this.direBase.y }
            ]
        };
        // Обратные маршруты для Dire
        this.waypointsReverse = {
            top: [
                { x: this.direBase.x, y: 1000 },
                { x: this.radiantBase.x, y: 1000 },
                { x: this.radiantBase.x, y: this.radiantBase.y }
            ],
            mid: [
                { x: this.direBase.x, y: this.direBase.y },
                { x: this.radiantBase.x, y: this.radiantBase.y }
            ],
            bottom: [
                { x: this.direBase.x, y: this.direBase.y },
                { x: 7500, y: this.radiantBase.y },
                { x: this.radiantBase.x, y: this.radiantBase.y }
            ]
        };

        this.treeImg = new Image();
        this.treeImg.src = 'images/tree.png';
        this.decorations = [];
        this.generateDecorations();
    }

    generateDecorations() {
        // Добавим деревья вдоль линий
        const lanes = ['top', 'mid', 'bottom'];
        for (let lane of lanes) {
            const wps = this.waypoints[lane];
            // Проходим по отрезкам между waypoints
            for (let i = 0; i < wps.length - 1; i++) {
                const from = wps[i];
                const to = wps[i+1];
                const steps = 20;
                for (let j = 0; j < steps; j++) {
                    const t = j / steps;
                    const x = from.x + (to.x - from.x) * t;
                    const y = from.y + (to.y - from.y) * t;
                    if (Math.random() < 0.15) {
                        const offsetX = (Math.random() - 0.5) * 120;
                        const offsetY = (Math.random() - 0.5) * 120;
                        this.decorations.push({
                            x: x + offsetX,
                            y: y + offsetY,
                            type: 'tree',
                            size: 60 + Math.random() * 60
                        });
                    }
                }
            }
        }
        // Деревья в базах
        for (let i = 0; i < 30; i++) {
            this.decorations.push({
                x: 200 + Math.random() * 400,
                y: 5300 + Math.random() * 400,
                type: 'tree',
                size: 80 + Math.random() * 80
            });
            this.decorations.push({
                x: 7400 + Math.random() * 400,
                y: 800 + Math.random() * 400,
                type: 'tree',
                size: 80 + Math.random() * 80
            });
        }
    }

    drawDecoration(ctx, deco, camera) {
        const img = this.treeImg;
        const size = deco.size || 160;
        const sx = deco.x - camera.x - size/2;
        const sy = deco.y - camera.y - size;

        if (img && img.complete && img.naturalWidth) {
            ctx.drawImage(img, sx, sy, size, size);
        } else {
            ctx.save();
            ctx.fillStyle = '#2b6b2f';
            ctx.beginPath();
            ctx.ellipse(deco.x - camera.x, deco.y - camera.y - size*0.2, size*0.5, size*0.75, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#6d3f1e';
            ctx.fillRect(deco.x - camera.x - size*0.05, deco.y - camera.y - size*0.16, size*0.1, size*0.25);
            ctx.restore();
        }
    }

    draw(ctx, camera) {
        // Фон
        ctx.fillStyle = '#1e2d1a';
        ctx.fillRect(-camera.x, -camera.y, this.width, this.height);

        // Рисуем дорожки линий
        const laneColors = ['#3a5a3a', '#4a6a4a', '#3a5a3a'];
        const lanes = ['top', 'mid', 'bottom'];
        for (let idx = 0; idx < lanes.length; idx++) {
            const wps = this.waypoints[lanes[idx]];
            ctx.strokeStyle = laneColors[idx];
            ctx.lineWidth = 30;
            ctx.beginPath();
            ctx.moveTo(wps[0].x - camera.x, wps[0].y - camera.y);
            for (let i = 1; i < wps.length; i++) {
                ctx.lineTo(wps[i].x - camera.x, wps[i].y - camera.y);
            }
            ctx.stroke();
            ctx.strokeStyle = '#6a8a6a';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(wps[0].x - camera.x, wps[0].y - camera.y);
            for (let i = 1; i < wps.length; i++) {
                ctx.lineTo(wps[i].x - camera.x, wps[i].y - camera.y);
            }
            ctx.stroke();
        }

        // Базы (квадраты)
        ctx.fillStyle = '#2a4a2a';
        ctx.fillRect(200 - camera.x, 5300 - camera.y, 600, 400);
        ctx.fillStyle = '#4a2a2a';
        ctx.fillRect(7200 - camera.x, 800 - camera.y, 600, 400);

        // Деревья
        for (let deco of this.decorations) {
            this.drawDecoration(ctx, deco, camera);
        }

        // Границы карты
        ctx.strokeStyle = '#2d4a2d';
        ctx.lineWidth = 4;
        ctx.strokeRect(-camera.x, -camera.y, this.width, this.height);
    }
}

// ----------------------------------------------
// КАМЕРА
// ----------------------------------------------
class Camera {
    constructor(map) { this.x = 0; this.y = 0; this.map = map; }
    update(tx, ty) {
        this.x = tx - canvas.width / 2;
        this.y = ty - canvas.height / 2;
        if (this.x < 0) this.x = 0;
        if (this.y < 0) this.y = 0;
        if (this.x > this.map.width - canvas.width) this.x = this.map.width - canvas.width;
        if (this.y > this.map.height - canvas.height) this.y = this.map.height - canvas.height;
    }
}

// ----------------------------------------------
// СПОСОБНОСТИ И ИНВЕНТАРЬ
// ----------------------------------------------
class Ability {
    constructor(name, type, cooldown, cost, desc = "") {
        this.name = name; this.type = type; this.maxCooldown = cooldown;
        this.currentCooldown = 0; this.manaCost = cost; this.description = desc;
    }
    update(dt) {
        if (this.currentCooldown > 0) {
            this.currentCooldown -= dt;
            if (this.currentCooldown < 0) this.currentCooldown = 0;
        }
    }
    trigger(caster) {
        if (this.type === 'passive' || this.currentCooldown > 0 || caster.mp < this.manaCost) return false;
        caster.mp -= this.manaCost;
        this.currentCooldown = this.maxCooldown;
        audio.play('ability'); 
        return true;
    }
}

class Item {
    constructor(id, name, cost, stats) { this.id = id; this.name = name; this.cost = cost; this.stats = stats; }
}

class Inventory {
    constructor(owner) { this.owner = owner; this.slots = new Array(6).fill(null); }
    get items() { return this.slots.filter(Boolean); }
    addItem(item) {
        for (let i = 0; i < 6; i++) {
            if (this.slots[i] === null) {
                this.slots[i] = item;
                this.applyItemStats(item, 1);
                this.combineVanguardPairs();
                this.combineHeart();
                return true;
            }
        } 
        return false; 
    }
    combineVanguardPairs() {
        let ringSlot = this.slots.findIndex(i => i && i.id === 'ringhealth');
        let vitalitySlot = this.slots.findIndex(i => i && i.id === 'vitality');

        if (ringSlot !== -1 && vitalitySlot !== -1) {
            const combineSlot = Math.min(ringSlot, vitalitySlot);
            const removeSlot = Math.max(ringSlot, vitalitySlot);

            this.removeItemAt(removeSlot);
            this.removeItemAt(combineSlot);

            const vanguard = new Item('vanguard', 'Vanguard', 0, {
                hp: 250,
                hpRegen: 4.5,
                damageBlock: true
            });
            this.slots[combineSlot] = vanguard;
            this.applyItemStats(vanguard, 1);
            if (game && game.uiManager) {
                game.uiManager.addFloatingText(this.owner.x, this.owner.y - 30, 'VANGUARD!', '#ffd700');
            }
        }
    }
    combineHeart() {
        let ringIndex = this.slots.findIndex(i => i && i.id === 'ringtarrasque');
        let reaverIndex = this.slots.findIndex(i => i && i.id === 'reaver');
        if (ringIndex !== -1 && reaverIndex !== -1) {
            const combineSlot = Math.min(ringIndex, reaverIndex);
            const removeSlot = Math.max(ringIndex, reaverIndex);
            this.removeItemAt(removeSlot);
            this.removeItemAt(combineSlot);
            const heart = new Item('heart', 'Heart of Tarrasque', 0, {
                hp: 25,
                hpRegen: 12
            });
            this.slots[combineSlot] = heart;
            this.applyItemStats(heart, 1);
            if (game && game.uiManager) {
                game.uiManager.addFloatingText(this.owner.x, this.owner.y - 30, 'HEART OF TARRASQUE!', '#00ff00');
            }
        }
    }
    applyItemStats(item, factor = 1) {
        if (item.stats.speedBonus) this.owner.speed *= factor === 1 ? (1 + item.stats.speedBonus) : 1 / (1 + item.stats.speedBonus);
        if (item.stats.damageBonus) this.owner.damage += item.stats.damageBonus * factor;
        if (item.stats.damage) this.owner.damage += item.stats.damage * factor;
        if (item.stats.hpBonus) { this.owner.maxHp += item.stats.hpBonus * factor; this.owner.hp += item.stats.hpBonus * factor; }
        if (item.stats.hp) { this.owner.maxHp += item.stats.hp * factor; this.owner.hp += item.stats.hp * factor; }
        if (item.stats.mana) { this.owner.maxMp += item.stats.mana * factor; this.owner.mp += item.stats.mana * factor; }
        if (item.stats.manaRegen) this.owner.inventoryManaRegen = (this.owner.inventoryManaRegen || 0) + item.stats.manaRegen * factor;
        if (item.stats.manaRegenBonus) this.owner.inventoryManaRegen = (this.owner.inventoryManaRegen || 0) + item.stats.manaRegenBonus * factor;
        if (item.stats.hpRegen) this.owner.inventoryHpRegen = (this.owner.inventoryHpRegen || 0) + item.stats.hpRegen * factor;
        if (item.stats.armorBonus) this.owner.armor = (this.owner.armor || 0) + item.stats.armorBonus * factor;
    }
    removeItemAt(index) {
        const item = this.slots[index];
        if (!item) return;
        this.applyItemStats(item, -1);
        this.slots[index] = null;
    }
}

// ----------------------------------------------
// БАЗОВЫЙ КЛАСС СУЩНОСТИ
// ----------------------------------------------
class Entity {
    constructor(x, y, team, radius, hp, damage, speed) {
        this.x = x; this.y = y; this.team = team; this.radius = radius;
        this.maxHp = hp; this.hp = hp; this.damage = damage; this.speed = speed;
        this.targetX = x; this.targetY = y; this.baseSpeed = speed;
        this.attackTarget = null; this.attackCooldown = 0; this.attackSpeed = 1.2;
        this.attackRange = 100; this.isDead = false; this.facing = 1; this.slowTimer = 0;
        this.headshotSlowTimer = 0;
        this.hitEffectTimer = 0;
        this.silenceTimer = 0;
        this.lifeBreakSlowTimer = 0;
        this.magicResistance = 0;
        this.burningSpears = [];
        this.nasalGooEffects = [];
        this.quillStacks = [];
        // Для движения по маршруту
        this.waypoints = null;
        this.currentWaypointIndex = 0;
        this.isMovingToWaypoint = false;
        // Защита от зависания
        this._stuckCheckTimer = 0;
        this._lastPos = { x: this.x, y: this.y };
        this._stuckTime = 0;
        // Для Counterspell
        this.counterspellActive = false;
        this.counterspellTimer = 0;
    }

    // Проверка, можно ли атаковать эту цель
    isAttackable() {
        return !this.isDead;
    }

    takeDamage(amount, attacker, isFb = false, damageType = 'physical') {
        if (this.isDead) return;
        // Запрет атаки своих
        if (attacker && attacker.team === this.team) return;

        // Башенный агро: если герой атакует героя под башней
        if (attacker instanceof Hero && this instanceof Hero && attacker.team !== this.team) {
            const towers = game.towers.filter(t => t.team === this.team && !t.isDead);
            for (let t of towers) {
                const dist = Math.hypot(t.x - attacker.x, t.y - attacker.y);
                if (dist <= t.attackRange) {
                    t.addAggro(attacker);
                }
            }
        }

        if (damageType !== 'magic' && this.inventory) {
            let vanguard = this.inventory.items.find(i => i.id === 'vanguard');
            if (vanguard) {
                let blockChance = 0.6;
                if (Math.random() < blockChance) {
                    let blockAmount = this instanceof Bristleback ? 50 : 25;
                    amount = Math.max(0, amount - blockAmount);
                    game.uiManager.addFloatingText(this.x, this.y - 25, 'BLOCK', '#bbbbbb');
                }
            }
        }

        if (damageType === 'magic') {
            amount *= Math.max(0, 1 - (this.magicResistance || 0));
        } else {
            let armorDebuff = 0;
            if (this.nasalGooEffects && this.nasalGooEffects.length > 0) {
                armorDebuff = this.nasalGooEffects.reduce((sum, effect) => sum + effect.armor, 0);
            }
            let armorValue = (this.armor || 0) + (this.armorBonusAura || 0) - armorDebuff;
            armorValue = Math.max(armorValue, -50);
            let reduction = armorValue >= 0 ? armorValue / (armorValue + 100) : armorValue * 0.01;
            amount = Math.max(1, amount * (1 - reduction));
        }

        this.hp -= amount;
        game.uiManager.addFloatingText(this.x, this.y - 20, Math.floor(amount), damageType === 'magic' ? '#cc00ff' : '#ff4400');
        if (this.hp <= 0) { this.hp = 0; this.isDead = true; this.onDeath(attacker); }
    }

    updateBuffs(dt) {
        if (this.silenceTimer > 0) this.silenceTimer -= dt;
        if (this.lifeBreakSlowTimer > 0) this.lifeBreakSlowTimer -= dt;
        if (this.counterspellTimer > 0) {
            this.counterspellTimer -= dt;
            if (this.counterspellTimer <= 0) {
                this.counterspellActive = false;
                this.counterspellTimer = 0;
            }
        }

        if (this.burningSpears && this.burningSpears.length > 0) {
            for (let i = this.burningSpears.length - 1; i >= 0; i--) {
                let stack = this.burningSpears[i];
                stack.duration -= dt;
                stack.tickTimer += dt;
                if (stack.tickTimer >= 1.0) {
                    stack.tickTimer -= 1.0;
                    this.takeDamage(12, stack.attacker, false, 'magic');
                }
                if (stack.duration <= 0) this.burningSpears.splice(i, 1);
            }
        }
    }

    onDeath(attacker) {}
    moveTo(x, y) { this.targetX = x; this.targetY = y; this.isMovingToWaypoint = false; }
    setMoveTarget(x, y) { this.moveTo(x, y); }

    setWaypoints(waypoints) {
        this.waypoints = waypoints;
        this.currentWaypointIndex = 0;
        this.isMovingToWaypoint = true;
        if (waypoints && waypoints.length > 0) {
            this.targetX = waypoints[0].x;
            this.targetY = waypoints[0].y;
        }
    }

    updateMovement(dt) {
        if (this.headshotSlowTimer > 0) this.headshotSlowTimer -= dt;
        if (this.hitEffectTimer > 0) this.hitEffectTimer -= dt;

        if (this.nasalGooEffects && this.nasalGooEffects.length > 0) {
            let totalSlow = 0;
            this.nasalGooEffects = this.nasalGooEffects.filter(effect => {
                effect.remaining -= dt;
                if (effect.remaining > 0) {
                    totalSlow += effect.slow;
                    return true;
                }
                return false;
            });
            this.slowTimer = this.slowTimer;
            this._nasalGooSlow = Math.min(0.65, totalSlow);
        } else {
            this._nasalGooSlow = 0;
        }

        if (this.quillStacks && this.quillStacks.length > 0) {
            this.quillStacks = this.quillStacks.filter(stack => {
                stack.remaining -= dt;
                return stack.remaining > 0;
            });
        }

        let currentSlow = 1.0;
        if (this.slowTimer > 0) { this.slowTimer -= dt; currentSlow *= 0.5; }
        if (this.headshotSlowTimer > 0) currentSlow *= 0.6;
        if (this.lifeBreakSlowTimer > 0) currentSlow *= 0.4;
        if (this._nasalGooSlow) currentSlow *= Math.max(0.1, 1 - this._nasalGooSlow);

        if (window.game && game.shrapnelZones) {
            for (let zone of game.shrapnelZones) {
                if (zone.team !== this.team && Math.hypot(this.x - zone.x, this.y - zone.y) <= zone.radius) {
                    if (!(this instanceof Tower) && !(this instanceof Ancient)) {
                        currentSlow *= 0.75;
                    }
                }
            }
        }

        if (this instanceof Sniper && this.aimTimer > 0) {
            currentSlow *= 0.35; 
        }

        let globalSpeed = window.game ? game.globalSpeedMultiplier : 0.8;
        this.speed = this.baseSpeed * currentSlow * globalSpeed;

        if (this.attackTarget && !this.attackTarget.isDead && this.attackTarget.isAttackable()) {
            this.targetX = this.attackTarget.x;
            this.targetY = this.attackTarget.y;
        } else if (this.isMovingToWaypoint && this.waypoints && this.waypoints.length > 0) {
            const wp = this.waypoints[this.currentWaypointIndex];
            if (Math.hypot(this.x - wp.x, this.y - wp.y) < 20) {
                this.currentWaypointIndex++;
                if (this.currentWaypointIndex >= this.waypoints.length) {
                    this.isMovingToWaypoint = false;
                } else {
                    this.targetX = this.waypoints[this.currentWaypointIndex].x;
                    this.targetY = this.waypoints[this.currentWaypointIndex].y;
                }
            }
        }

        let dx = this.targetX - this.x;
        let dy = this.targetY - this.y;
        let dist = Math.hypot(dx, dy);

        let stopRange = this.attackTarget ? this.attackRange * 0.85 : 2;

        if (dist > stopRange) {
            this.facing = dx >= 0 ? 1 : -1;
            let step = this.speed * dt;

            if (step >= (dist - stopRange)) {
                if (!this.attackTarget) {
                    this.x = this.targetX;
                    this.y = this.targetY;
                } else {
                    this.x += (dx / dist) * (dist - stopRange);
                    this.y += (dy / dist) * (dist - stopRange);
                }
            } else {
                this.x += (dx / dist) * step;
                this.y += (dy / dist) * step;
            }
        } else if (!this.attackTarget) {
            // Остановились у цели или достигли waypoint
        }

        // Защита от зависания – проверяем, двигается ли сущность
        this._stuckCheckTimer += dt;
        if (this._stuckCheckTimer > 2.0) {
            this._stuckCheckTimer = 0;
            const dx2 = this.x - this._lastPos.x;
            const dy2 = this.y - this._lastPos.y;
            const dist2 = Math.hypot(dx2, dy2);
            if (dist2 < 5 && !this.isDead && !this.attackTarget && this.speed > 0.1) {
                this._stuckTime += 2.0;
                if (this._stuckTime > 5.0) {
                    // Принудительно пересчитать цель: если есть waypoints, перейти к следующему
                    if (this.waypoints && this.waypoints.length > 0) {
                        this.currentWaypointIndex = Math.min(this.currentWaypointIndex + 1, this.waypoints.length - 1);
                        this.targetX = this.waypoints[this.currentWaypointIndex].x;
                        this.targetY = this.waypoints[this.currentWaypointIndex].y;
                    }
                    this._stuckTime = 0;
                }
            } else {
                this._stuckTime = 0;
            }
            this._lastPos.x = this.x;
            this._lastPos.y = this.y;
        }
    }

    drawHealthBar(ctx, camera) {
        let sx = this.x - camera.x; let sy = this.y - camera.y - this.radius - 10;
        let w = this.radius * 2.4; let h = 5;
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(sx - w/2, sy, w, h);
        ctx.fillStyle = this.team === 'radiant' ? '#33ff33' : '#ff3333';
        ctx.fillRect(sx - w/2, sy, (this.hp / this.maxHp) * w, h);
    }

    drawShadow(ctx, camera) {
        let sx = this.x - camera.x; let sy = this.y - camera.y + this.radius - 2;
        ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath();
        ctx.ellipse(sx, sy, this.radius * 1.1, this.radius * 0.35, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.restore();
    }
}

// ----------------------------------------------
// ГЕРОИ
// ----------------------------------------------
class Hero extends Entity {
    constructor(x, y, team, name) {
        super(x, y, team, 22, 600, 54, 275);
        this.name = name; this.level = 1; this.xp = 0; this.maxXp = 100;
        this.mp = 300; this.maxMp = 300; this.gold = 5000; 
        this.inventory = new Inventory(this); this.abilities = [];
        this.hpRegenBase = 2.0; this.mpRegenBase = 1.5; this.invulnerable = false;
        this.inventoryHpRegen = 0; this.inventoryManaRegen = 0;
        this.isHealingAtFountain = false;
        this.radianceTimer = 0; // для ауры Radiance
    }
    getHpRegen() {
        let regen = this.hpRegenBase + (this.inventoryHpRegen || 0);
        // Пассивка Heart of Tarrasque: Behemoth's Blood
        if (this.inventory) {
            const heart = this.inventory.items.find(item => item.id === 'heart');
            if (heart) {
                const missing = this.maxHp - this.hp;
                regen += missing * 0.060;
            }
        }
        return regen;
    }
    getMpRegen() {
        return this.mpRegenBase + (this.mpRegenAura || 0) + (this.inventoryManaRegen || 0);
    }
    onDeath(attacker) {
        audio.play('defeat');

        if (attacker instanceof Hero) {
            attacker.gold += 300;

            if (attacker === game.playerHero) {
                game.uiManager.addFloatingText(
                    this.x,
                    this.y - 30,
                    "+300 🪙 HERO KILL",
                    "#ffd700"
                );
            }
        }

        setTimeout(() => {
            this.isDead = false; this.hp = this.maxHp; this.mp = this.maxMp;
            if (this.team === 'radiant') {
                this.x = 500; this.y = 5500;
            } else {
                this.x = 7500; this.y = 1000;
            }
            this.targetX = this.x; this.targetY = this.y; this.attackTarget = null;
            if (this instanceof Sniper) {
                this.shrapnelCharges = 2;
                this.shrapnelChargeRegenTimer = 0;
                this.aimTimer = 0;
                this.assChannel = 0;
                this.assTarget = null; 
            }
        }, 5000);
    }
    addXp(amount) {
        if (this.level >= 10) return;
        this.xp += amount;
        if (this.xp >= this.maxXp) {
            this.xp -= this.maxXp; this.level++; this.maxXp = 100 + this.level * 50;
            this.maxHp += 80; this.hp += 80;
            if (this.maxMp > 0) { this.maxMp += 40; this.mp += 40; }
            this.damage += 5;

            if (this.hpRegenBase === undefined) this.hpRegenBase = 2.0;
            if (this.mpRegenBase === undefined) this.mpRegenBase = 1.5;
            this.hpRegenBase += 0.5;
            if (this.maxMp > 0) this.mpRegenBase += 0.25;

            game.uiManager.addFloatingText(this.x, this.y - 35, "LEVEL UP", '#ffd700');
        }
    }
    update(dt) {
        if (this.isDead) return;
        this.updateBuffs(dt);
        if (this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + this.getHpRegen() * dt);
        if (this.maxMp > 0 && this.mp < this.maxMp) this.mp = Math.min(this.maxMp, this.mp + this.getMpRegen() * dt);
        this.updateMovement(dt);
        
        let rate = 1.0;
        if (this.headshotSlowTimer > 0) rate *= 0.5;
        if (this.lifeBreakSlowTimer > 0) rate *= 0.4;
        if (this.attackCooldown > 0) this.attackCooldown -= dt * rate;

        if (this.attackTarget && this.attackTarget.isAttackable()) {
            if (this.attackTarget.isDead) { this.attackTarget = null; return; }
            let d = Math.hypot(this.attackTarget.x - this.x, this.attackTarget.y - this.y);
            if (d <= this.attackRange && this.attackCooldown <= 0) { this.performAttack(); }
        } else {
            this.attackTarget = null;
        }
        for (let ab of this.abilities) ab.update(dt);
        
        if (this.hasVladmir) {
            const allies = this.team === 'radiant' ? game.radiantEntities() : game.direEntities();
            for (let unit of allies) {
                const dist = Math.hypot(unit.x - this.x, unit.y - this.y);
                if (dist <= 1200) {
                    unit.vladmirAura = true;
                    unit.damageMultiplier = 1.18; 
                    unit.armorBonusAura = 2;
                    unit.mpRegenAura = 1;
                } else {
                    unit.vladmirAura = false;
                    unit.damageMultiplier = 1;
                    unit.armorBonusAura = 0;
                    unit.mpRegenAura = 0;
                }
            }
        }
        if (this.hasLinkens && this.linkensCooldown > 0) {
            this.linkensCooldown = Math.max(0, this.linkensCooldown - dt);
        }

        // --- Radiance Aura ---
        if (this.inventory) {
            const radianceItem = this.inventory.items.find(item => item.id === 'radiance');
            if (radianceItem) {
                const radius = 500;
                this.radianceTimer += dt;
                if (this.radianceTimer >= 1.0) {
                    this.radianceTimer -= 1.0;
                    const enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
                    for (let e of enemies) {
                        if (e.isDead) continue;
                        const d = Math.hypot(e.x - this.x, e.y - this.y);
                        if (d <= radius) {
                            e.takeDamage(20, this, false, 'magic');
                            if (game) game.effects.push({ type: 'radiance_burn', x: e.x, y: e.y, life: 0.1 });
                        }
                    }
                }
            }
        }
    }
    
    blockSpell(caster) {
        if (this.hasLinkens && (!this.linkensCooldown || this.linkensCooldown <= 0)) {
            this.linkensCooldown = 14.0;
            if (game && game.effects) game.effects.push({ type: 'linkens', x: this.x, y: this.y, life: 0.6 });
            audio.play('ability');
            if (game && game.uiManager) game.uiManager.addFloatingText(this.x, this.y - 30, 'SPELL BLOCKED', '#66ccff');
            return true;
        }
        return false;
    }
    performAttack() {
        // Проверка промаха от Radiance у цели
        if (this.attackTarget && this.attackTarget.inventory) {
            const radianceItem = this.attackTarget.inventory.items.find(item => item.id === 'radiance');
            if (radianceItem) {
                const d = Math.hypot(this.x - this.attackTarget.x, this.y - this.attackTarget.y);
                if (d <= 500) {
                    if (Math.random() < 0.05) {
                        game.uiManager.addFloatingText(this.x, this.y - 20, "MISS", '#ff6666');
                        return; // промах, атака не происходит
                    }
                }
            }
        }

        this.attackCooldown = this.attackSpeed; audio.play('attack');
        let finalDamage = this.damage;
        if (this.vladmirAura) finalDamage *= 1.18;

        let critChance = 0;
        let critMultiplier = 1;
        for (let item of this.inventory.items) {
            if (item.stats?.critChance) critChance = Math.max(critChance, item.stats.critChance);
            if (item.stats?.critMultiplier) critMultiplier = Math.max(critMultiplier, item.stats.critMultiplier);
        }

        let proj = new Projectile(this.x, this.y, this.attackTarget, finalDamage, this.team, this);
        if (Math.random() < critChance) {
            proj.isCrit = true;
            proj.damage = Math.max(1, proj.damage * critMultiplier);
        }
        game.projectiles.push(proj);
    }
    draw(ctx, camera) {
        if (this.isDead) return;
        this.drawShadow(ctx, camera);
        let sx = this.x - camera.x; let sy = this.y - camera.y;
        let bob = Math.sin(performance.now() * 0.01) * 2.5;

        ctx.save(); ctx.translate(sx, sy + bob);
        ctx.fillStyle = this.team === 'radiant' ? '#00bfff' : '#ff1493';
        ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
        ctx.fillText(this.name.substring(0, 4).toUpperCase(), 0, 4);
        ctx.restore();

        if (this.hitEffectTimer > 0) {
            ctx.save(); ctx.fillStyle = 'rgba(255, 68, 0, 0.6)';
            ctx.beginPath(); ctx.arc(sx, sy, this.radius * 1.4, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
        this.drawHealthBar(ctx, camera);
    }
}

class Morphling extends Hero {
    constructor(x, y, team) {
        super(x, y, team, 'Morphling');
        this.attackRange = 250; 
        this.baseStrength = 22;
        this.baseAgility = 24;
        this.minStatLimit = 5; 
        this.morphBaseHp = this.maxHp;
        this.morphBaseDamage = this.damage;

        this.abilities.push(new Ability('Waveform', 'active', 10, 90, 'Dash forward, dealing 150 damage to all enemies in the path.'));
        this.waveformTimer = 0; this.wdx = 0; this.wdy = 0; this.wHits = [];
        this.abilities.push(new Ability('Adaptive Strike', 'active', 12, 100, 'Launches a watery projectile that deals magic damage, stuns, and knocks back the enemy.'));
        this.abilities.push(new Ability('Shift (Agility)', 'active', 0, 0, 'Gradually moves Strength into Agility, increasing attack damage and speed while reducing health.'));
        this.isShiftingAgility = false;
        this.abilities.push(new Ability('Shift (Strength)', 'active', 0, 0, 'Gradually moves Agility into Strength, increasing health while reducing attack damage.'));
        this.isShiftingStrength = false;
        this.shiftTimer = 0;
    }

    useAbility(idx = 0) {
        if (this.isDead || this.silenceTimer > 0) return;

        if (idx === 0) {
            if (this.abilities[0].trigger(this)) {
                this.invulnerable = true; this.waveformTimer = 0.25; this.wHits = [];
                let ang = Math.atan2(this.targetY - this.y, this.targetX - this.x);
                if (this.attackTarget) ang = Math.atan2(this.attackTarget.y - this.y, this.attackTarget.x - this.x);
                this.wdx = Math.cos(ang) * 1200; this.wdy = Math.sin(ang) * 1200;
            }
        } else if (idx === 1) {
            let castRange = this.attackRange + 150; 
            let enemies = this.team === 'radiant' ? game.direEntities() : game.direEntities();
            let target = this.attackTarget || enemies.find(e => Math.hypot(e.x - this.x, e.y - this.y) <= castRange && !e.isDead);

            if (target && Math.hypot(target.x - this.x, target.y - this.y) <= castRange) {
                if (target && target.blockSpell && target.blockSpell(this)) return;
                if (this.abilities[1].trigger(this)) {
                    game.projectiles.push(new AdaptiveStrikeProjectile(this.x, this.y, target, this.team, this));
                }
            }
        } else if (idx === 2) {
            this.isShiftingAgility = !this.isShiftingAgility;
            if (this.isShiftingAgility) {
                this.isShiftingStrength = false;
                if (typeof audio !== 'undefined') audio.play('ability');
            }
        } else if (idx === 3) {
            this.isShiftingStrength = !this.isShiftingStrength;
            if (this.isShiftingStrength) {
                this.isShiftingAgility = false;
                if (typeof audio !== 'undefined') audio.play('ability');
            }
        }
    }

    update(dt) {
        if (this.waveformTimer > 0) {
            this.waveformTimer -= dt; this.x += this.wdx * dt; this.y += this.wdy * dt;
            this.x = Math.max(0, Math.min(8000, this.x)); this.y = Math.max(0, Math.min(6000, this.y));
            let enemies = this.team === 'radiant' ? game.direEntities() : game.direEntities();
            for (let e of enemies) {
                if (!this.wHits.includes(e) && Math.hypot(e.x - this.x, e.y - this.y) < 65) {
                    e.takeDamage(150, this); this.wHits.push(e);
                }
            }
            if (this.waveformTimer <= 0) { this.invulnerable = false; this.targetX = this.x; this.targetY = this.y; }
        } else {
            super.update(dt);

            if (!this.isDead && (this.isShiftingAgility || this.isShiftingStrength)) {
                this.shiftTimer += dt;
                if (this.shiftTimer >= 0.1) {
                    this.shiftTimer -= 0.1;
                    this.processAttributeShift();
                }
            }
        }
    }

    processAttributeShift() {
        if (this.isShiftingAgility && this.baseStrength > this.minStatLimit) {
            this.baseStrength--;
            this.baseAgility++;
            this.recalculateStats();
        } else if (this.isShiftingStrength && this.baseAgility > this.minStatLimit) {
            this.baseAgility--;
            this.baseStrength++;
            this.recalculateStats();
        }
    }

    recalculateStats() {
        let hpPercent = this.hp / this.maxHp;
        let oldMaxHp = this.maxHp;
        this.maxHp = this.morphBaseHp + (this.baseStrength - 22) * 20;
        this.hp = Math.max(1, this.maxHp * hpPercent);
        this.damage = this.morphBaseDamage + (this.baseAgility - 24);
        this.attackRange = 230 + (this.baseAgility - 24) * 5;

        let agilityBonus = (this.baseAgility - 24) * 0.01;
        this.attackSpeed = Math.max(
            0.3,
            1.2 / (1 + agilityBonus)
        );

        if (game.playerHero === this) {
            if (this.isShiftingAgility) {
                game.uiManager.addFloatingText(this.x, this.y - 30, "+AGI", "#00ffcc");
            } else if (this.isShiftingStrength) {
                game.uiManager.addFloatingText(this.x, this.y - 30, "+STR", "#ff3333");
            }
        }
    }

    draw(ctx, camera) {
        if (this.isDead) return;
        super.draw(ctx, camera);
        let sx = this.x - camera.x; let sy = this.y - camera.y;
        if (this.isShiftingAgility) {
            ctx.save();
            ctx.strokeStyle = '#00ffcc';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy, this.radius + 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        } else if (this.isShiftingStrength) {
            ctx.save();
            ctx.strokeStyle = '#ff3333';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy, this.radius + 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }
}

class AdaptiveStrikeProjectile {
    constructor(x, y, target, team, caster) {
        this.x = x; this.y = y; this.target = target; this.team = team; this.caster = caster;
        this.speed = 650; this.radius = 8; this.isDead = false;
    }
    update(dt) {
        if (this.isDead || this.target.isDead) { this.isDead = true; return; }

        let dx = this.target.x - this.x;
        let dy = this.target.y - this.y;
        let dist = Math.hypot(dx, dy);

        if (dist <= 15) {
            this.isDead = true;
            let dmg = 80 + (this.caster.baseAgility * 1.5);
            let stunDuration = 0.5 + (this.caster.baseStrength * 0.03);
            this.target.takeDamage(dmg, this.caster);
            this.target.stunned = true;
            this.target.stunTimer = Math.min(3.0, stunDuration);
            let pushAng = Math.atan2(dy, dx);
            let pushDist = 80;
            this.target.x += Math.cos(pushAng) * pushDist;
            this.target.y += Math.sin(pushAng) * pushDist;
            this.target.x = Math.max(0, Math.min(8000, this.target.x));
            this.target.y = Math.max(0, Math.min(6000, this.target.y));
            this.target.targetX = this.target.x; this.target.targetY = this.target.y;
        } else {
            this.x += (dx / dist) * this.speed * dt;
            this.y += (dy / dist) * this.speed * dt;
        }
    }
    draw(ctx, camera) {
        if (this.isDead) return;
        let sx = this.x - camera.x; let sy = this.y - camera.y;
        ctx.save();
        ctx.fillStyle = '#00bfff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Warlock extends Hero {
    constructor(x, y, team) {
        super(x, y, team, 'Warlock'); this.attackRange = 380;
        this.abilities.push(new Ability('Fatal Bonds', 'active', 20, 120, 'Links visible enemies for 18 seconds. 15% of damage taken is shared between linked targets.'));
        this.abilities.push(new Ability('Shadow Word', 'active', 15, 100, 'Heals allies or damages enemies in an area around the target every second.'));
        this.abilities.push(new Ability('Upheaval', 'active', 30, 100, 'Toggled ability. Slows enemies in a 575 radius and deals 10 damage per second for up to 10 seconds.'));
        this.abilities.push(new Ability('Chaotic Offering', 'active', 55, 200, 'Ultimate. Summons a golem (1500 HP, 20 sec) and stuns enemies in a 600 radius for 0.8 sec.'));
        
        this.fbLinks = [];
        this.activeShadowWords = [];
        this.isChannelingUpheaval = false;
        this.upheavalTimer = 0;
        this.upheavalX = 0;
        this.upheavalY = 0;
        this.upheavalAffected = [];
        this.ultCooldown = 0;
    }
    
    useAbility(idx) {
        if (this.isDead || this.silenceTimer > 0) return;
        
        if (this.isChannelingUpheaval && idx === 2) {
            this.isChannelingUpheaval = false;
            this.resetUpheavalSlows();
            return;
        }
        if (this._stunTime && this._stunTime > 0) return;

        let enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
        
        if (idx === 0) {
            if (this.abilities[0].trigger(this)) {
                let targets = enemies.filter(e => Math.hypot(e.x - this.x, e.y - this.y) <= 700).slice(0, 5);
                if (targets.length > 0) {
                    targets.forEach(t => {
                        if (!t._fbPatched) {
                            let origDamage = t.takeDamage;
                            t.takeDamage = function(amount, attacker, isFb = false, damageType = 'physical') {
                                origDamage.call(this, amount, attacker, isFb, damageType);
                                if (!isFb && !this.isDead && this._fbTimer > 0 && this._fbGroup) {
                                    let share = amount * 0.15;
                                    this._fbGroup.forEach(other => {
                                        if (other !== this && !other.isDead && other._fbTimer > 0) {
                                            other.takeDamage(share, attacker, true, damageType);
                                        }
                                    });
                                }
                            };
                            t._fbPatched = true;
                        }
                        t._fbTimer = 18.0;
                        t._fbGroup = targets;
                    });
                    this.fbLinks.push({ group: targets, timer: 18.0 });
                }
            }
        }
        else if (idx === 1) {
            let swTarget = this.attackTarget || this;
            if (swTarget && swTarget.blockSpell && swTarget.blockSpell(this)) return;
            if (this.abilities[1].trigger(this)) {
                this.activeShadowWords.push({ target: swTarget, timer: 10.0, tickTimer: 0 });
            }
        }
        else if (idx === 2) {
            if (this.abilities[2].trigger(this)) {
                this.isChannelingUpheaval = true;
                this.upheavalTimer = 10.0;
                this.upheavalX = this.attackTarget ? this.attackTarget.x : this.targetX;
                this.upheavalY = this.attackTarget ? this.attackTarget.y : this.targetY;
                this.targetX = this.x; 
                this.targetY = this.y;
                this.attackTarget = null;
            }
        }
        else if (idx === 3) {
            if (!this.abilities[3].trigger(this)) return;
            const cooldownDuration = 20;

            if (!this.ultCooldown || this.ultCooldown <= 0) {
                this.ultCooldown = cooldownDuration;

                if (typeof audioManager !== 'undefined') audioManager.play('buy');

                let potentialTargets = [];
                if (game.creeps) potentialTargets = potentialTargets.concat(game.creeps);
                if (game.towers) potentialTargets = potentialTargets.concat(game.towers);
                if (game.ancients) potentialTargets = potentialTargets.concat(game.ancients);
                if (game.playerHero) potentialTargets.push(game.playerHero);
                if (game.enemyHero) potentialTargets.push(game.enemyHero);

                let tx = this.attackTarget ? this.attackTarget.x : this.targetX;
                let ty = this.attackTarget ? this.attackTarget.y : this.targetY;

                potentialTargets.forEach(entity => {
                    if (entity && entity.hp > 0 && entity.team !== this.team) {
                        let dist = Math.hypot(entity.x - tx, entity.y - ty);
                        if (dist <= 600) {
                            entity.stunned = true;
                            entity.stunTimer = 0.8;
                        }
                    }
                });

                let golem = new WarlockGolem(tx, ty, this.team);
                game.creeps.push(golem);
            }
        }
    }

    update(dt) {
        if (this.isChannelingUpheaval) {
            this.targetX = this.x; 
            this.targetY = this.y;
            this.attackTarget = null;
        }

        if (this.ultCooldown > 0) {
            this.ultCooldown -= dt;
            if (this.ultCooldown < 0) this.ultCooldown = 0;
        }

        super.update(dt);
        
        if (this.isDead) {
            if (this.isChannelingUpheaval) {
                this.isChannelingUpheaval = false;
                this.resetUpheavalSlows();
            }
            return;
        }

        if (this.isChannelingUpheaval) {
            if (this._stunTime && this._stunTime > 0) {
                this.isChannelingUpheaval = false;
                this.resetUpheavalSlows();
            } else {
                this.upheavalTimer -= dt;
                if (this.upheavalTimer <= 0) {
                    this.isChannelingUpheaval = false;
                    this.resetUpheavalSlows();
                } else {
                    let enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
                    let currentSlowMult = Math.max(0.1, 1.0 - (10.0 - this.upheavalTimer) * 0.1);
                    
                    for (let i = this.upheavalAffected.length - 1; i >= 0; i--) {
                        let e = this.upheavalAffected[i];
                        if (Math.hypot(e.x - this.upheavalX, e.y - this.upheavalY) > 300 || e.isDead || !this.isChannelingUpheaval) {
                            if (e._origBaseSpeed !== undefined) {
                                e.baseSpeed = e._origBaseSpeed;
                                delete e._origBaseSpeed;
                            }
                            this.upheavalAffected.splice(i, 1);
                        }
                    }

                    enemies.forEach(e => {
                        if (Math.hypot(e.x - this.upheavalX, e.y - this.upheavalY) <= 300) {
                            if (e._origBaseSpeed === undefined) {
                                e._origBaseSpeed = e.baseSpeed;
                                this.upheavalAffected.push(e);
                            }
                            e.baseSpeed = e._origBaseSpeed * currentSlowMult;
                            
                            if (!e._upheavalTickTimer) e._upheavalTickTimer = 0;
                            e._upheavalTickTimer += dt;
                            if (e._upheavalTickTimer >= 1.0) {
                                e._upheavalTickTimer -= 1.0;
                                e.takeDamage(10, this);
                            }
                        }
                    });
                }
            }
        }

        for (let i = this.fbLinks.length - 1; i >= 0; i--) {
            this.fbLinks[i].timer -= dt;
            if (this.fbLinks[i].timer <= 0) {
                this.fbLinks[i].group.forEach(t => t._fbTimer = 0);
                this.fbLinks.splice(i, 1);
            }
        }

        for (let i = this.activeShadowWords.length - 1; i >= 0; i--) {
            let sw = this.activeShadowWords[i];
            sw.timer -= dt;
            sw.tickTimer += dt;
            if (sw.target.isDead) {
                this.activeShadowWords.splice(i, 1);
                continue;
            }
            if (sw.tickTimer >= 1.0) {
                sw.tickTimer -= 1.0;
                let isAllyTarget = (sw.target.team === this.team);
                let entities = isAllyTarget ? (this.team === 'radiant' ? game.radiantEntities() : game.direEntities()) 
                                            : (this.team === 'radiant' ? game.direEntities() : game.radiantEntities());
                
                entities.forEach(e => {
                    if (Math.hypot(e.x - sw.target.x, e.y - sw.target.y) <= 300) {
                        if (isAllyTarget) {
                            e.hp = Math.min(e.maxHp, e.hp + 45);
                            if (e === game.playerHero) game.uiManager.addFloatingText(e.x, e.y - 25, "+45", '#00ff66');
                        } else {
                            e.takeDamage(45, this);
                        }
                    }
                });
            }
            if (sw.timer <= 0) {
                this.activeShadowWords.splice(i, 1);
            }
        }
    }

    resetUpheavalSlows() {
        this.upheavalAffected.forEach(e => {
            if (e._origBaseSpeed !== undefined) {
                e.baseSpeed = e._origBaseSpeed;
                delete e._origBaseSpeed;
            }
        });
        this.upheavalAffected = [];
    }

    draw(ctx, camera) {
        if (this.isDead) return;

        if (this.isChannelingUpheaval) {
            let sx = this.upheavalX - camera.x; let sy = this.upheavalY - camera.y;
            ctx.save();
            ctx.fillStyle = 'rgba(75, 0, 130, 0.3)';
            ctx.strokeStyle = '#4b0082';
            ctx.beginPath(); ctx.arc(sx, sy, 250, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.restore();
        }

        ctx.save();
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        this.fbLinks.forEach(link => {
            let group = link.group.filter(t => !t.isDead);
            for (let i = 0; i < group.length; i++) {
                for (let j = i + 1; j < group.length; j++) {
                    ctx.beginPath();
                    ctx.moveTo(group[i].x - camera.x, group[i].y - camera.y);
                    ctx.lineTo(group[j].x - camera.x, group[j].y - camera.y);
                    ctx.stroke();
                }
            }
        });
        ctx.restore();

        this.activeShadowWords.forEach(sw => {
            let sx = sw.target.x - camera.x; let sy = sw.target.y - camera.y;
            ctx.save();
            ctx.strokeStyle = (sw.target.team === this.team) ? '#00ff66' : '#8a2be2';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 15]);
            ctx.beginPath(); ctx.arc(sx, sy, 300, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        });

        super.draw(ctx, camera);
    }
}

class Bristleback extends Hero {
    constructor(x, y, team) {
        super(x, y, team, 'Bristleback');
        this.maxHp = 800; this.hp = 800;
        this.damage = 58;
        this.baseSpeed = 260; this.speed = 260;
        this.attackRange = 120;

        this.abilities.push(new Ability('Viscous Nasal Goo', 'active', 2, 20, 'Fires goo at a target, slowing movement and reducing armor for 5 sec. Effects stack and refresh on each cast.'));
        this.abilities.push(new Ability('Quill Spray', 'active', 3, 25, 'Fires quills in a radius, damaging enemies. Additional damage scales with recent Quill hits.'));
        this.abilities.push(new Ability('Bristleback', 'passive', 0, 0, 'Reduces damage from attacks to the back and sides. Enough back damage triggers a Quill Spray.'));
        this.abilities.push(new Ability('Warpath', 'passive', 0, 0, 'Gains stacks when casting abilities, increasing damage and movement speed for a limited time.'));

        this.nasalGooEffects = [];
        this.backDamageAccumulator = 0;
        this.warpathStacks = [];
        this.warpathMaxStacks = 8;
        this.warpathDuration = 16.0;
        this.quillStackDuration = 5.0;
        this.quillRadius = 500;
        this.quillTriggerThreshold = 275;
        this.bristlebackDamageReduction = 0.24;
        this.quillSprayTimer = 0;
        this.quillSprayDuration = 0.25;
    }

    getAbilityRank() {
        return Math.min(3, Math.floor((this.level - 1) / 2));
    }

    getNasalGooValues() {
        const slowValues = [0.03, 0.06, 0.09, 0.12];
        const armorValues = [3, 6, 9, 12];
        const rank = this.getAbilityRank();
        return { slow: slowValues[rank], armor: armorValues[rank] };
    }

    getQuillDamageBonusPerStack() {
        return 8;
    }

    getWarpathDamageBonus() {
        return 12 * this.warpathStacks.length;
    }

    getWarpathSpeedMultiplier() {
        return 1 + 0.02 * this.warpathStacks.length;
    }

    addWarpathStack() {
        if (this.warpathStacks.length >= this.warpathMaxStacks) {
            this.warpathStacks.shift();
        }
        this.warpathStacks.push({ remaining: this.warpathDuration });
    }

    applyNasalGoo(target) {
        if (!target || target.isDead) return;
        const values = this.getNasalGooValues();
        if (!target.nasalGooEffects) target.nasalGooEffects = [];
        target.nasalGooEffects.forEach(effect => { effect.remaining = 5.0; });
        target.nasalGooEffects.push({ remaining: 5.0, slow: values.slow, armor: values.armor });
        game.uiManager.addFloatingText(target.x, target.y - 30, 'GOO', '#00ffff');
    }

    castQuillSpray(triggered = false) {
        const enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
        const baseDamage = 25;
        let hitAny = false;
        this.quillSprayTimer = this.quillSprayDuration;

        for (let e of enemies) {
            if (e.isDead) continue;
            if (Math.hypot(e.x - this.x, e.y - this.y) <= this.quillRadius) {
                const stackCount = (e.quillStacks || []).length;
                const damage = baseDamage + stackCount * this.getQuillDamageBonusPerStack();
                e.takeDamage(damage, this);
                if (!e.quillStacks) e.quillStacks = [];
                e.quillStacks = e.quillStacks.filter(stack => stack.remaining > 0);
                e.quillStacks.push({ remaining: this.quillStackDuration });
                if (!triggered) game.uiManager.addFloatingText(e.x, e.y - 25, `-${Math.floor(damage)}`, '#ffd700');
                hitAny = true;
            }
        }

        if (hitAny) audio.play('ability');
    }

    isAttackFromBackOrSide(attacker) {
        if (!attacker) return false;
        const dx = attacker.x - this.x;
        const dy = attacker.y - this.y;
        const angle = Math.atan2(dy, dx);
        const forwardAngle = this.facing === 1 ? 0 : Math.PI;
        let diff = Math.abs(((angle - forwardAngle + Math.PI) % (2 * Math.PI)) - Math.PI);
        return diff > Math.PI / 4;
    }

    useAbility(idx) {
        if (this.isDead || this.silenceTimer > 0) return;

        if (idx === 0) {
            const ab = this.abilities[0];
            let target = this.attackTarget;
            if (!target || target.team === this.team || target.isDead) {
                const enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
                target = enemies.find(e => Math.hypot(e.x - this.x, e.y - this.y) <= 500);
            }
            if (!target || target.isDead) return;
            if (ab.trigger(this)) {
                this.applyNasalGoo(target);
                this.addWarpathStack();
            }
        } else if (idx === 1) {
            const ab = this.abilities[1];
            if (ab.trigger(this)) {
                this.castQuillSpray();
                this.addWarpathStack();
            }
        }
    }

    update(dt) {
        if (this.warpathStacks.length > 0) {
            this.warpathStacks = this.warpathStacks.filter(stack => {
                stack.remaining -= dt;
                return stack.remaining > 0;
            });
        }
        if (this.quillSprayTimer > 0) {
            this.quillSprayTimer -= dt;
            if (this.quillSprayTimer < 0) this.quillSprayTimer = 0;
        }
        super.update(dt);
    }

    updateMovement(dt) {
        super.updateMovement(dt);
        this.speed *= this.getWarpathSpeedMultiplier();
    }

    performAttack() {
        this.attackCooldown = this.attackSpeed;
        audio.play('attack');
        let finalDamage = this.damage + this.getWarpathDamageBonus();
        if (this.vladmirAura) finalDamage *= 1.18;
        game.projectiles.push(new Projectile(this.x, this.y, this.attackTarget, finalDamage, this.team, this));
    }

    takeDamage(amount, attacker, isFb = false, damageType = 'physical') {
        if (this.isDead) return;
        let actualAmount = amount;

        if (attacker && attacker.team !== this.team && this.isAttackFromBackOrSide(attacker)) {
            actualAmount = actualAmount * (1 - this.bristlebackDamageReduction);
            this.backDamageAccumulator += actualAmount;
            if (this.backDamageAccumulator >= this.quillTriggerThreshold) {
                this.backDamageAccumulator -= this.quillTriggerThreshold;
                this.castQuillSpray(true);
            }
        }

        super.takeDamage(actualAmount, attacker, isFb, damageType);
    }

    draw(ctx, camera) {
        super.draw(ctx, camera);
        if (this.quillSprayTimer > 0 && !this.isDead) {
            let sx = this.x - camera.x; let sy = this.y - camera.y;
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(sx, sy, this.quillRadius / 8, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }
    }
}

class Sniper extends Hero {
    constructor(x, y, team) {
        super(x, y, team, 'Sniper'); 
        this.baseRange = 320; 
        this.attackRange = this.baseRange + 140; 
        
        this.abilities.push(new Ability('Shrapnel', 'active', 0, 50, 'Creates an area of explosive shrapnel. Deals 35 damage per second and slows enemies by 25%. Up to 2 charges.'));
        this.abilities.push(new Ability('Headshot', 'passive', 0, 0, 'Passive. 30% chance to deal +20 damage, knock back the enemy, and slow their movement and attack for 1.5 sec.'));
        this.abilities.push(new Ability('Take Aim', 'active', 15, 60, 'Passive: +140 attack range. Active: +150 range and 60% Headshot chance, but slows movement by 65% for 6 sec.'));
        this.abilities.push(new Ability('Assassinate', 'active', 18, 150, 'Ultimate. Channels for 1.5 sec and deals massive long-range damage.'));
        
        this.aimTimer = 0; 
        this.assTarget = null; 
        this.assChannel = 0;
        
        this.shrapnelCharges = 2;
        this.maxShrapnelCharges = 2;
        this.shrapnelChargeRegenTimer = 0;
        this.shrapnelChargeCooldown = 15;
    }
    useAbility(idx) {
        if (this.isDead || this.silenceTimer > 0) return;
        if (idx === 0) { 
            let ab = this.abilities[0];
            if (this.shrapnelCharges > 0 && this.mp >= ab.manaCost) {
                this.mp -= ab.manaCost;
                this.shrapnelCharges--;
                audio.play('ability');
                let tx = this.targetX;
                let ty = this.targetY;
                if (this.attackTarget) { tx = this.attackTarget.x; ty = this.attackTarget.y; }
                game.shrapnelZones.push(new ShrapnelZone(tx, ty, this.team, this));
            }
        }
        if (idx === 2) { 
            if (this.abilities[2].trigger(this)) {
                this.aimTimer = 6.0;
            }
        }
        if (idx === 3) { 
            let enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
            let t = this.attackTarget || enemies.find(e => Math.hypot(e.x - this.x, e.y - this.y) < 950);
            if (t && t.blockSpell && t.blockSpell(this)) return;
            if (t && this.abilities[3].trigger(this)) { this.assTarget = t; this.assChannel = 1.5; }
        }
    }
    update(dt) {
        if (this.shrapnelCharges < this.maxShrapnelCharges) {
            this.shrapnelChargeRegenTimer += dt;
            if (this.shrapnelChargeRegenTimer >= this.shrapnelChargeCooldown) {
                this.shrapnelCharges++;
                this.shrapnelChargeRegenTimer = 0;
            }
        }

        if (this.aimTimer > 0) { 
            this.aimTimer -= dt; 
            this.attackRange = this.baseRange + 140 + 150; 
        } else { 
            this.attackRange = this.baseRange + 140; 
        }

        super.update(dt);
        if (this.isDead) return;

        if (this.assChannel > 0) {
            this.targetX = this.x; this.targetY = this.y;
            if (!this.assTarget || this.assTarget.isDead) { this.assChannel = 0; this.assTarget = null; return; }
            this.assChannel -= dt;
            if (this.assChannel <= 0) {
                audio.play('ability');
                let proj = new Projectile(this.x, this.y, this.assTarget, 380, this.team, this);
                proj.speed = 1000; proj.isAss = true; game.projectiles.push(proj);
                this.assTarget = null;
            }
        }
    }
    performAttack() {
        if (this.assChannel > 0) return;
        this.attackCooldown = this.attackSpeed; audio.play('attack');
        
        let hsChance = this.aimTimer > 0 ? 0.60 : 0.30;
        let isHs = Math.random() < hsChance; 
        let dmg = this.damage;
        if (isHs) { dmg += 20; }
        
        let p = new Projectile(this.x, this.y, this.attackTarget, dmg, this.team, this);
        if (isHs) p.isHs = true;
        game.projectiles.push(p);
    }
    draw(ctx, camera) {
        super.draw(ctx, camera);
        if (this.isDead) return;
        let sx = this.x - camera.x; let sy = this.y - camera.y;
        if (this.aimTimer > 0) {
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)'; ctx.lineWidth = 3;
            ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.arc(sx, sy, this.radius + 12, 0, Math.PI*2); ctx.stroke();
            ctx.restore();
        }
        if (this.assChannel > 0 && this.assTarget) {
            ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 1.5; ctx.beginPath();
            ctx.moveTo(sx, sy); ctx.lineTo(this.assTarget.x - camera.x, this.assTarget.y - camera.y); ctx.stroke();
        }
    }
}

class Huskar extends Hero {
    constructor(x, y, team) {
        super(x, y, team, 'Huskar');
        this.maxHp = 700; this.hp = 700;
        this.maxMp = 0; this.mp = 0; this.mpRegenBase = 0;
        this.baseStrength = 40;
        this.attackRange = 400;
        this.burningSpearActive = false;
        this.lifeBreakTarget = null;

        this.abilities.push(new Ability('Inner Fire', 'active', 12, 0, 'Deals 100 magic damage, knocks back enemies and silences them for 3s. Costs 75 HP.'));
        this.abilities.push(new Ability('Burning Spear', 'active', 0, 0, 'Toggle. Attacks cost 2% max HP and deal 12 magic dmg/sec for 9s.'));
        this.abilities.push(new Ability("Berserker's Blood", 'passive', 0, 0, 'More Attack Speed, Magic Resist, and Regen based on missing HP.'));
        this.abilities.push(new Ability('Life Break', 'active', 14, 0, 'Leaps to target. Costs 35% current HP. Deals 32% target current HP as magic damage and slows 60% for 3s.'));
    }

    useAbility(idx) {
        if (this.isDead || this.silenceTimer > 0) return;

        if (idx === 0 && this.abilities[0].currentCooldown <= 0 && this.hp > 75) {
            this.hp -= 75;
            this.abilities[0].currentCooldown = this.abilities[0].maxCooldown;
            audio.play('ability');
            let enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
            for (let e of enemies) {
                let dx = e.x - this.x; let dy = e.y - this.y;
                let dist = Math.hypot(dx, dy);
                if (dist <= 250) {
                    e.takeDamage(100, this, false, 'magic');
                    e.silenceTimer = 3.0;
                    if (!(e instanceof Tower) && !(e instanceof Ancient)) {
                        let pushAngle = Math.atan2(dy, dx);
                        e.x += Math.cos(pushAngle) * 150;
                        e.y += Math.sin(pushAngle) * 150;
                    }
                }
            }
        }
        else if (idx === 1) {
            this.burningSpearActive = !this.burningSpearActive;
            let slot = document.getElementById('ability-1');
            if (this.burningSpearActive && slot) slot.classList.add('autocast-active');
            else if (slot) slot.classList.remove('autocast-active');
        }
        else if (idx === 3 && this.abilities[3].currentCooldown <= 0) {
            let enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
            let target = this.attackTarget || enemies.find(e => Math.hypot(e.x - this.x, e.y - this.y) <= 500);
            if (target && target.blockSpell && target.blockSpell(this)) return;
            if (target && Math.hypot(target.x - this.x, target.y - this.y) <= 500) {
                this.hp -= this.hp * 0.35;
                this.abilities[3].currentCooldown = this.abilities[3].maxCooldown;
                this.lifeBreakTarget = target;
                audio.play('ability');
            }
        }
    }

    update(dt) {
        if (this.isDead) return;

        let hpPct = this.hp / this.maxHp;
        let ratio = Math.max(0, Math.min(1, (1.0 - hpPct) / 0.9));
        this.magicResistance = 0.25 * ratio;
        let bonusAS = 170 * ratio;
        this.attackSpeed = 1.2 / (1 + (bonusAS / 100));
        this.hpRegenBase = 2.0 + (this.baseStrength * 0.55 * ratio);

        if (this.lifeBreakTarget) {
            if (this.lifeBreakTarget.isDead) {
                this.lifeBreakTarget = null;
            } else {
                let dx = this.lifeBreakTarget.x - this.x;
                let dy = this.lifeBreakTarget.y - this.y;
                let dist = Math.hypot(dx, dy);
                if (dist < 30) {
                    let dmg = this.lifeBreakTarget.hp * 0.32;
                    this.lifeBreakTarget.takeDamage(dmg, this, false, 'magic');
                    this.lifeBreakTarget.lifeBreakSlowTimer = 3.0;
                    this.lifeBreakTarget.hitEffectTimer = 0.2;
                    this.lifeBreakTarget = null;
                    this.targetX = this.x; this.targetY = this.y;
                } else {
                    this.x += (dx / dist) * 1200 * dt;
                    this.y += (dy / dist) * 1200 * dt;
                    this.targetX = this.x; this.targetY = this.y;
                }
            }
            for (let ab of this.abilities) ab.update(dt);
            return; 
        }

        super.update(dt);
        this.mp = 0; 
    }

    performAttack() {
        this.attackCooldown = this.attackSpeed; audio.play('attack');
        let finalDamage = this.damage;
        if (this.vladmirAura) finalDamage *= 1.18;

        let isBurning = this.burningSpearActive;
        if (isBurning) {
            let cost = this.maxHp * 0.02;
            if (this.hp > cost) {
                this.hp -= cost;
            } else {
                isBurning = false; 
            }
        }

        let proj = new Projectile(this.x, this.y, this.attackTarget, finalDamage, this.team, this);
        proj.isBurningSpear = isBurning;
        game.projectiles.push(proj);
    }
}

// ----------------------------------------------
// НОВЫЙ ГЕРОЙ: Anti-Mage
// ----------------------------------------------
class AntiMage extends Hero {
    constructor(x, y, team) {
        super(x, y, team, 'Anti-Mage');
        // Ближний бой, повышенные характеристики
        this.maxHp = 800;
        this.hp = 800;
        this.damage = 58;
        this.baseSpeed = 260;
        this.speed = 260;
        this.attackRange = 100; // ближний бой
        this.attackSpeed = 1.2;
        // Мана
        this.maxMp = 300;
        this.mp = 300;
        // Пассивное сопротивление магии от Counterspell
        this.magicResistance = 0.14;

        this.abilities = [
            new Ability('Mana Break', 'passive', 0, 0, 'Burns 25 mana per attack, dealing bonus physical damage equal to mana burned.'),
            new Ability('Blink', 'active', 7, 50, 'Teleports a short distance instantly.'),
            new Ability('Counterspell', 'active', 15, 50, 'Passive: +14% magic resistance. Active: creates a shield for 1.3s that reflects single-target spells.'),
            new Ability('Mana Void', 'active', 70, 150, 'Deals damage to target and nearby enemies based on missing mana. Stuns for 0.3s.')
        ];
    }

    // Переопределяем performAttack для Mana Break
    performAttack() {
        this.attackCooldown = this.attackSpeed;
        audio.play('attack');
        let finalDamage = this.damage;
        if (this.vladmirAura) finalDamage *= 1.18;

        let critChance = 0;
        let critMultiplier = 1;
        for (let item of this.inventory.items) {
            if (item.stats?.critChance) critChance = Math.max(critChance, item.stats.critChance);
            if (item.stats?.critMultiplier) critMultiplier = Math.max(critMultiplier, item.stats.critMultiplier);
        }

        // Создаём снаряд с пометкой manaBreak
        let proj = new Projectile(this.x, this.y, this.attackTarget, finalDamage, this.team, this);
        proj.isManaBreak = true; // специальный флаг для Anti-Mage
        if (Math.random() < critChance) {
            proj.isCrit = true;
            proj.damage = Math.max(1, proj.damage * critMultiplier);
        }
        game.projectiles.push(proj);
    }

    useAbility(idx) {
        if (this.isDead || this.silenceTimer > 0) return;

        if (idx === 1) { // Blink
            const ab = this.abilities[1];
            if (!ab.trigger(this)) return;
            // Перемещаем на 600 в направлении цели или в сторону мыши (упрощённо - к цели атаки или вперёд)
            let targetX = this.targetX;
            let targetY = this.targetY;
            if (this.attackTarget) {
                targetX = this.attackTarget.x;
                targetY = this.attackTarget.y;
            }
            let dx = targetX - this.x;
            let dy = targetY - this.y;
            let dist = Math.hypot(dx, dy);
            if (dist > 1) {
                let step = 600 / dist;
                let newX = this.x + dx * step;
                let newY = this.y + dy * step;
                // Ограничение картой
                newX = Math.max(0, Math.min(8000, newX));
                newY = Math.max(0, Math.min(6000, newY));
                this.x = newX;
                this.y = newY;
                // Обновляем цели движения
                this.targetX = newX;
                this.targetY = newY;
                // Визуальный эффект (можно добавить вспышку)
                if (game) {
                    game.effects.push({
                        type: 'blink',
                        x: this.x,
                        y: this.y,
                        life: 0.3,
                        radius: 40,
                        team: this.team
                    });
                }
            }
        } else if (idx === 2) { // Counterspell (активный)
            const ab = this.abilities[2];
            if (!ab.trigger(this)) return;
            this.counterspellActive = true;
            this.counterspellTimer = 1.3;
            // Визуальный эффект
            if (game) {
                game.effects.push({
                    type: 'counterspell_shield',
                    x: this.x,
                    y: this.y,
                    life: 1.3,
                    radius: this.radius * 1.5,
                    team: this.team
                });
            }
        } else if (idx === 3) { // Mana Void
            const ab = this.abilities[3];
            if (!ab.trigger(this)) return;
            // Находим цель
            let target = this.attackTarget;
            if (!target || target.isDead || target.team === this.team) {
                const enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
                target = enemies.find(e => Math.hypot(e.x - this.x, e.y - this.y) < 600);
            }
            if (!target || target.isDead) return;
            // Вычисляем недостающую ману (учитываем, что мана может быть 0)
            let missingMana = Math.max(0, (target.maxMp || 0) - (target.mp || 0));
            // Урон = недостающая мана * 1 (но для баланса можно ограничить)
            let damage = missingMana * 1;
            // Применяем урон к цели и всем врагам в радиусе 350
            const radius = 350;
            const enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
            for (let e of enemies) {
                if (e.isDead) continue;
                if (e === target || Math.hypot(e.x - target.x, e.y - target.y) <= radius) {
                    // Оглушаем цель (и только её?) - по описанию цель оглушается, остальные получают урон
                    if (e === target) {
                        e.stunned = true;
                        e.stunTimer = Math.max(e.stunTimer || 0, 0.3);
                    }
                    e.takeDamage(damage, this, false, 'magic');
                }
            }
            // Визуальный эффект взрыва
            if (game) {
                game.effects.push({
                    type: 'mana_void',
                    x: target.x,
                    y: target.y,
                    life: 0.6,
                    radius: radius,
                    team: this.team
                });
            }
        }
    }

    draw(ctx, camera) {
        super.draw(ctx, camera);
        if (this.isDead) return;
        // Если активен Counterspell, рисуем щит
        if (this.counterspellActive) {
            let sx = this.x - camera.x;
            let sy = this.y - camera.y;
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 200, 255, 0.6)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(sx, sy, this.radius * 1.6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }
}

// ----------------------------------------------
// ВСПОМОГАТЕЛЬНЫЕ КЛАССЫ
// ----------------------------------------------
class ShrapnelZone {
    constructor(x, y, team, caster) {
        this.x = x; this.y = y; this.team = team; this.caster = caster;
        this.radius = 160; this.duration = 6.0; this.damagePerSecond = 35;
        this.slowAmount = 0.25; this.tickTimer = 0;
    }
    update(dt) {
        this.duration -= dt; this.tickTimer += dt;
        if (this.tickTimer >= 1.0) {
            this.tickTimer -= 1.0;
            let enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
            for (let e of enemies) {
                if (!(e instanceof Tower) && !(e instanceof Ancient)) {
                    if (Math.hypot(e.x - this.x, e.y - this.y) <= this.radius) {
                        e.takeDamage(this.damagePerSecond, this.caster);
                    }
                }
            }
        }
        return this.duration <= 0;
    }
    draw(ctx, camera) {
        let sx = this.x - camera.x; let sy = this.y - camera.y;
        ctx.save();
        ctx.strokeStyle = 'rgba(218, 165, 32, 0.4)'; ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(218, 165, 32, 0.08)';
        ctx.beginPath(); ctx.arc(sx, sy, this.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        
        ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
        for (let i = 0; i < 4; i++) {
            let px = sx + (Math.random() - 0.5) * this.radius * 1.4;
            let py = sy + (Math.random() - 0.5) * this.radius * 1.4;
            if (Math.hypot(px - sx, py - sy) <= this.radius) {
                ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
            }
        }
        ctx.fillStyle = '#ffd700'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
        ctx.fillText(this.duration.toFixed(1) + 's', sx, sy - 4);
        ctx.restore();
    }
}

// Крип с поддержкой линии и waypoints
class Creep extends Entity {
    constructor(x, y, team, type, lane) {
        let hp = type === 'melee' ? 320 : 230;
        let dmg = type === 'melee' ? 19 : 22;
        let rng = type === 'melee' ? 45 : 280;
        super(x, y, team, 11, hp, dmg, 195);
        this.type = type;
        this.attackRange = rng;
        this.attackSpeed = 1.1;
        this.lane = lane;
        const map = game.map;
        const waypoints = (this.team === 'radiant') ? map.waypoints[lane] : map.waypointsReverse[lane];
        this.setWaypoints(waypoints);
        // Для отслеживания цели
        this._targetCheckTimer = 0;
    }

    takeDamage(amount, attacker, isFb = false, damageType = 'physical') {
        if (this.isDead) return;

        const actualAttacker = attacker && !(attacker instanceof Entity) && attacker.attacker instanceof Entity
            ? attacker.attacker
            : attacker;

        super.takeDamage(amount, attacker, isFb, damageType);
        if (this.isDead) return;

        if (actualAttacker instanceof Entity && actualAttacker !== this && actualAttacker.team !== this.team && !actualAttacker.isDead) {
            this.attackTarget = actualAttacker;
        }
    }

    isClicked(mouseX, mouseY) {
        const clickHitboxRadius = this.radius + 15;
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        return Math.hypot(dx, dy) <= clickHitboxRadius;
    }

    // Поиск цели по приоритету, только в пределах атаки
    findTarget() {
        const enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
        // Ищем врага в радиусе атаки (с небольшим запасом)
        const searchRadius = this.attackRange * 1.5;
        let best = null;
        let bestDist = Infinity;
        for (let e of enemies) {
            if (e.isDead) continue;
            if (!e.isAttackable()) continue;
            const d = Math.hypot(e.x - this.x, e.y - this.y);
            if (d <= searchRadius && d < bestDist) {
                // Приоритет: если враг в радиусе атаки, то он главный
                best = e;
                bestDist = d;
            }
        }
        return best; // вернёт врага, если есть в радиусе, иначе null
    }

    update(dt) {
        if (this.isDead) return;
        this.updateBuffs(dt);
        
        let rate = 1.0;
        if (this.headshotSlowTimer > 0) rate *= 0.5;
        if (this.lifeBreakSlowTimer > 0) rate *= 0.4;
        if (this.attackCooldown > 0) this.attackCooldown -= dt * rate;

        // Обновляем цель каждые 0.5 сек или если текущая цель мертва / недоступна
        this._targetCheckTimer += dt;
        if (this._targetCheckTimer > 0.5 || !this.attackTarget || !this.attackTarget.isAttackable() || this.attackTarget.team === this.team) {
            this._targetCheckTimer = 0;
            const newTarget = this.findTarget();
            if (newTarget) {
                this.attackTarget = newTarget;
            } else {
                this.attackTarget = null;
                // Если нет цели в радиусе, продолжаем движение по waypoints
                // Убедимся, что isMovingToWaypoint активно
                if (this.waypoints && this.waypoints.length > 0) {
                    this.isMovingToWaypoint = true;
                    if (this.currentWaypointIndex >= this.waypoints.length) {
                        this.currentWaypointIndex = this.waypoints.length - 1;
                    }
                    this.targetX = this.waypoints[this.currentWaypointIndex].x;
                    this.targetY = this.waypoints[this.currentWaypointIndex].y;
                }
            }
        }

        // Если есть цель и она в радиусе, атакуем
        if (this.attackTarget && this.attackTarget.isAttackable() && !this.attackTarget.isDead) {
            let d = Math.hypot(this.attackTarget.x - this.x, this.attackTarget.y - this.y);
            if (d <= this.attackRange && this.attackCooldown <= 0) {
                this.attackCooldown = this.attackSpeed;
                let finalDamage = this.damage;
                if (this.vladmirAura) finalDamage *= 1.18;
                if (this.type === 'melee') {
                    this.attackTarget.takeDamage(finalDamage, this);
                    if (this.vladmirAura) {
                        let lifesteal = finalDamage * 0.20;
                        if (this.attackTarget instanceof Creep) lifesteal *= 0.6;
                        this.hp = Math.min(this.maxHp, this.hp + lifesteal);
                    }
                } else {
                    game.projectiles.push(new Projectile(this.x, this.y, this.attackTarget, finalDamage, this.team, this));
                }
            }
        }

        // Движение (включая waypoints)
        this.updateMovement(dt);
    }

    onDeath(attacker) {
        audio.play('creep_death');
        if (!attacker) return;
        if (attacker instanceof Hero) {
            let b = this.type === 'melee' ? 42 : 58; attacker.gold += b;
            if (attacker === game.playerHero) {
                game.uiManager.addFloatingText(this.x, this.y - 15, `+${b} 🪙`, '#ffd700');
            }
        }
        // Раздаём опыт всем героям в радиусе
        const allHeroes = game.getAllHeroes();
        for (let h of allHeroes) {
            if (h.isDead) continue;
            if (Math.hypot(h.x - this.x, h.y - this.y) < 600) {
                h.addXp(40);
            }
        }
    }

    draw(ctx, camera) {
        this.drawShadow(ctx, camera);
        let sx = this.x - camera.x; let sy = this.y - camera.y;
        ctx.save(); ctx.fillStyle = this.team === 'radiant' ? '#7cfc00' : '#8b008b';
        ctx.beginPath(); ctx.arc(sx, sy, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        if (this.hitEffectTimer > 0) {
            ctx.save(); ctx.fillStyle = 'rgba(255, 68, 0, 0.6)';
            ctx.beginPath(); ctx.arc(sx, sy, this.radius * 1.4, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
        this.drawHealthBar(ctx, camera);
    }
}

class WarlockGolem extends Creep {
    constructor(x, y, team) {
        super(x, y, team, 'melee', 'mid');
        this.radius = 25;
        this.maxHp = 1200;
        this.hp = 1200;
        this.damage = 60;
        this.baseSpeed = 200;
        this.speed = 200;
        this.attackRange = 90;
        this.lifeTime = 20.0;
        this.waypoints = null;
        this.isMovingToWaypoint = false;
    }
    update(dt) {
        if (this.isDead) return;
        this.lifeTime -= dt;
        if (this.lifeTime <= 0) {
            this.hp = 0;
            this.isDead = true;
            return;
        }
        super.update(dt);
    }
    draw(ctx, camera) {
        if (this.isDead) return;
        this.drawShadow(ctx, camera);
        let sx = this.x - camera.x; let sy = this.y - camera.y;
        ctx.save(); ctx.fillStyle = '#8b0000';
        ctx.beginPath(); ctx.arc(sx, sy, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        
        if (this.hitEffectTimer > 0) {
            ctx.save(); ctx.fillStyle = 'rgba(255, 68, 0, 0.6)';
            ctx.beginPath(); ctx.arc(sx, sy, this.radius * 1.4, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
        this.drawHealthBar(ctx, camera);
    }
}

class Catapult extends Entity {
    constructor(x, y, team, lane) {
        super(x, y, team, 24, 700, 90, 70);
        this.attackRange = 350;
        this.attackCooldown = 0;
        this.attackSpeed = 2.5; 
        this.bounty = 80;
        this.lane = lane;
        const map = game.map;
        const waypoints = (this.team === 'radiant') ? map.waypoints[lane] : map.waypointsReverse[lane];
        this.setWaypoints(waypoints);
        this._targetCheckTimer = 0;
    }

    // Поиск цели аналогично крипу, только с радиусом атаки
    findTarget() {
        const enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
        const searchRadius = this.attackRange * 1.5;
        let best = null;
        let bestDist = Infinity;
        for (let e of enemies) {
            if (e.isDead) continue;
            if (!e.isAttackable()) continue;
            const d = Math.hypot(e.x - this.x, e.y - this.y);
            if (d <= searchRadius && d < bestDist) {
                best = e;
                bestDist = d;
            }
        }
        return best;
    }

    update(dt) {
        if (this.isDead) return;
        this.updateBuffs(dt);

        let rate = 1.0;
        if (this.headshotSlowTimer > 0) rate *= 0.5;
        if (this.lifeBreakSlowTimer > 0) rate *= 0.4;
        if (this.attackCooldown > 0) this.attackCooldown -= dt * rate;

        this._targetCheckTimer += dt;
        if (this._targetCheckTimer > 0.5 || !this.attackTarget || !this.attackTarget.isAttackable() || this.attackTarget.team === this.team) {
            this._targetCheckTimer = 0;
            const newTarget = this.findTarget();
            if (newTarget) {
                this.attackTarget = newTarget;
            } else {
                this.attackTarget = null;
                if (this.waypoints && this.waypoints.length > 0) {
                    this.isMovingToWaypoint = true;
                    if (this.currentWaypointIndex >= this.waypoints.length) {
                        this.currentWaypointIndex = this.waypoints.length - 1;
                    }
                    this.targetX = this.waypoints[this.currentWaypointIndex].x;
                    this.targetY = this.waypoints[this.currentWaypointIndex].y;
                }
            }
        }

        if (this.attackTarget && this.attackTarget.isAttackable() && !this.attackTarget.isDead) {
            let d = Math.hypot(this.attackTarget.x - this.x, this.attackTarget.y - this.y);
            if (d <= this.attackRange && this.attackCooldown <= 0) {
                this.performAttack();
            }
        }

        this.updateMovement(dt);
    }

    performAttack() {
        if (!this.attackTarget || this.attackTarget.isDead) return;
        let damage = this.damage;
        if (this.attackTarget instanceof Tower || this.attackTarget instanceof Ancient) {
            damage *= 2;
        }
        game.projectiles.push(new Projectile(this.x, this.y, this.attackTarget, damage, this.team, this));
        this.attackCooldown = this.attackSpeed;
    }

    draw(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        ctx.fillStyle = this.team === 'radiant' ? '#4caf50' : '#c62828';
        ctx.fillRect(screenX - 18, screenY - 12, 36, 24);

        ctx.fillStyle = '#5d4037';

        ctx.beginPath();
        ctx.arc(screenX - 12, screenY + 14, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(screenX + 12, screenY + 14, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#8d6e63';
        ctx.lineWidth = 4;

        ctx.beginPath();
        ctx.moveTo(screenX, screenY - 8);
        ctx.lineTo(screenX + (this.team === 'radiant' ? 20 : -20), screenY - 25);
        ctx.stroke();

        const barWidth = 40;
        ctx.fillStyle = '#000';
        ctx.fillRect(screenX - 20, screenY - 35, barWidth, 5);
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(screenX - 20, screenY - 35, barWidth * (this.hp / this.maxHp), 5);
    }
}

// --- ИЗМЕНЕННЫЙ КЛАСС TOWER (исправлена логика агро) ---
class Tower extends Entity {
    constructor(x, y, team, tier) {
        super(x, y, team, 32, 4500, 85, 0);
        this.attackRange = 360;
        this.attackSpeed = 1.3;
        this.glyphActive = false;
        this.glyphTimer = 0;
        this.tier = tier;
        this.lane = ''; // будет установлено извне
        // Список героев, которые заагрили башню (атаковали союзного героя)
        this.aggroSet = new Set();
    }

    // Добавить героя в список агро
    addAggro(hero) {
        if (hero && hero.team !== this.team && !hero.isDead) {
            this.aggroSet.add(hero);
        }
    }

    isAttackable() {
        return !this.isDead && !this.glyphActive;
    }

    update(dt) {
        if (this.isDead) return;
        this.updateBuffs(dt);
        if (this.glyphActive) {
            this.glyphTimer -= dt;
            if (this.glyphTimer <= 0) {
                this.glyphActive = false;
                this.glyphTimer = 0;
            }
        }
        if (this.attackCooldown > 0) this.attackCooldown -= dt;

        // Собираем всех врагов в радиусе
        const enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
        const inRange = enemies.filter(e => {
            if (e.isDead || !e.isAttackable()) return false;
            const dist = Math.hypot(e.x - this.x, e.y - this.y);
            return dist <= this.attackRange;
        });

        // 1. Поиск агрессивного героя (кто атаковал союзного героя)
        let aggroTarget = null;
        for (let h of this.aggroSet) {
            if (h.isDead || h.team === this.team) continue;
            const dist = Math.hypot(h.x - this.x, h.y - this.y);
            if (dist <= this.attackRange) {
                aggroTarget = h;
                break;
            }
        }

        // Если есть агрессивный герой в радиусе, атакуем его
        if (aggroTarget) {
            this.attackTarget = aggroTarget;
        } else {
            // 2. Ищем крипов (приоритет перед обычными героями)
            let creepTarget = null;
            for (let e of inRange) {
                if (e instanceof Creep) {
                    creepTarget = e;
                    break;
                }
            }
            if (creepTarget) {
                this.attackTarget = creepTarget;
            } else {
                // 3. Любой другой враг (герой или строение)
                this.attackTarget = inRange.length > 0 ? inRange[0] : null;
            }
        }

        // Если цель есть и кулдаун атаки готов, атакуем
        if (this.attackTarget && this.attackCooldown <= 0) {
            this.attackCooldown = this.attackSpeed;
            game.projectiles.push(new Projectile(this.x, this.y - 40, this.attackTarget, this.damage, this.team, this));
        }

        // Очистка aggroSet от мёртвых или вышедших из радиуса (делается при следующем апдейте)
        // Можно также удалять через некоторое время, но достаточно проверки при выборе цели
        // Однако если герой вышел из радиуса, но всё ещё в aggroSet, он не будет выбран, т.к. проверка на дистанцию.
        // Но чтобы Set не разрастался, периодически чистим
        if (Math.random() < 0.01) { // раз в ~100 кадров
            const toRemove = [];
            for (let h of this.aggroSet) {
                if (h.isDead || h.team === this.team || Math.hypot(h.x - this.x, h.y - this.y) > this.attackRange * 1.5) {
                    toRemove.push(h);
                }
            }
            for (let h of toRemove) {
                this.aggroSet.delete(h);
            }
        }
    }

    takeDamage(amount, attacker, isFb = false, damageType = 'physical') {
        if (this.isDead || this.glyphActive) return;
        super.takeDamage(amount, attacker, isFb, damageType);
    }

    onDeath(attacker) { audio.play('tower_break'); }

    draw(ctx, camera) {
        if (this.isDead) return; this.drawShadow(ctx, camera);
        let sx = this.x - camera.x; let sy = this.y - camera.y;
        if (this.glyphActive) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(sx, sy - 10, this.radius + 18, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 191, 255, 0.8)';
            ctx.lineWidth = 4;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00bfff';
            ctx.stroke();
            ctx.fillStyle = 'rgba(0, 191, 255, 0.1)';
            ctx.fill();
            ctx.restore();
        }
        ctx.fillStyle = '#465262'; ctx.fillRect(sx - 20, sy - 50, 40, 65);
        ctx.fillStyle = this.team === 'radiant' ? '#2e8b57' : '#8b2525';
        ctx.fillRect(sx - 16, sy - 45, 32, 12);
        this.drawHealthBar(ctx, camera);
    }
}

class Ancient extends Entity {
    constructor(x, y, team) { super(x, y, team, 45, 2800, 0, 0); }
    update(dt) {
        if (this.isDead) return;
        this.updateBuffs(dt);
        super.update(dt);
    }
    onDeath(attacker) { game.endGame(this.team === 'radiant' ? 'dire' : 'radiant'); }
    draw(ctx, camera) {
        if (this.isDead) return; this.drawShadow(ctx, camera);
        let sx = this.x - camera.x; let sy = this.y - camera.y;
        ctx.save();
        ctx.fillStyle = this.team === 'radiant' ? '#1c5e3a' : '#611a1a';
        ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 3;
        ctx.fillRect(sx - 45, sy - 45, 90, 75); ctx.strokeRect(sx - 45, sy - 45, 90, 75);
        ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(sx - 35, sy - 35, 70, 55);
        ctx.restore(); this.drawHealthBar(ctx, camera);
    }
}

class Fountain {
    constructor(x, y, team) { this.x = x; this.y = y; this.team = team; this.radius = 150; }
    update(dt) {
        let heroes = [game.playerHero, ...game.alliedBots, game.enemyHero, ...game.enemyBots].filter(h => h && !h.isDead && h.team === this.team);
        for (let h of heroes) {
            if (Math.hypot(h.x - this.x, h.y - this.y) <= this.radius) {
                h.hp = Math.min(h.maxHp, h.hp + 100 * dt);
                h.mp = Math.min(h.maxMp, h.mp + 100 * dt);
            }
        }
    }
    draw(ctx, camera) {
        let sx = this.x - camera.x; let sy = this.y - camera.y;
        ctx.save();
        ctx.shadowBlur = 25; ctx.shadowColor = this.team === 'radiant' ? '#00bfff' : '#ff4500';
        ctx.fillStyle = this.team === 'radiant' ? 'rgba(0,191,255,0.15)' : 'rgba(255,69,0,0.15)';
        ctx.beginPath(); ctx.arc(sx, sy, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = '#2f4f4f'; ctx.beginPath(); ctx.arc(sx, sy, 30, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
}

// Модифицированный Projectile с поддержкой Mana Break и Counterspell отражения
class Projectile {
    constructor(x, y, target, damage, team, attacker) {
        this.x = x; this.y = y; this.target = target; this.damage = damage; this.team = team; this.attacker = attacker;
        this.speed = 500; this.radius = 5; this.isHs = false; this.isAss = false;
        this.isCrit = false; this.isBurningSpear = false;
        this.isManaBreak = false; // для Anti-Mage
        this.reflected = false;   // для Counterspell
    }

    reflect() {
        // Отражение снаряда обратно на атакующего
        if (this.reflected) return;
        const originalTarget = this.target;
        if (!this.attacker) return;
        // Меняем цель на того, кто выпустил снаряд (если это живой враг)
        if (this.attacker.isDead) return;
        // Меняем направление: цель = атакующий
        this.target = this.attacker;
        // Меняем команду на противоположную, чтобы не считать своим
        this.team = this.attacker.team === 'radiant' ? 'dire' : 'radiant';
        this.reflected = true;
        // Добавляем визуальный эффект (можно через game.effects)
        if (game) {
            game.effects.push({
                type: 'reflect',
                x: this.x,
                y: this.y,
                life: 0.1,
                radius: 10,
                team: this.team
            });
        }
    }

    update(dt) {
        if (!this.target || this.target.isDead) return true;
        // Проверка на отражение: если цель имеет активный Counterspell и снаряд не отражён, отражаем
        if (this.target.counterspellActive && !this.reflected) {
            this.reflect();
            return false; // продолжаем лететь
        }
        let dx = this.target.x - this.x;
        let dy = this.target.y - this.y;
        let dist = Math.hypot(dx, dy);
        if (dist < 12) {
            // Попадание в цель
            // Mana Break (для Anti-Mage)
            if (this.isManaBreak && this.attacker instanceof AntiMage) {
                const target = this.target;
                // Сжигаем ману и наносим доп. урон
                if (target.maxMp > 0) {
                    const burnAmount = Math.min(25, target.mp);
                    if (burnAmount > 0) {
                        target.mp -= burnAmount;
                        // Доп. урон равен сожжённой мане (физический)
                        const bonusDamage = burnAmount;
                        // Добавляем бонусный урон к основному (но он уже рассчитан как обычный)
                        // Мы добавим его как отдельный урон через takeDamage
                        target.takeDamage(bonusDamage, this.attacker, false, 'physical');
                        // Отображаем эффект
                        game.uiManager.addFloatingText(target.x, target.y - 30, `-${burnAmount} mana`, '#66ccff');
                    }
                }
            }

            // Обычный урон
            if (this.isHs) {
                this.target.slowTimer = 1.5;
                this.target.headshotSlowTimer = 1.5;
                this.target.hitEffectTimer = 0.2;
                
                if (!(this.target instanceof Tower) && !(this.target instanceof Ancient)) {
                    let dx = this.target.x - this.attacker.x;
                    let dy = this.target.y - this.attacker.y;
                    let dist = Math.hypot(dx, dy) || 1;
                    let pushDistance = 35;
                    this.target.x += (dx / dist) * pushDistance;
                    this.target.y += (dy / dist) * pushDistance;
                    this.target.x = Math.max(50, Math.min(7950, this.target.x));
                    this.target.y = Math.max(50, Math.min(5950, this.target.y));
                }
                
                game.uiManager.addFloatingText(this.target.x, this.target.y - 30, "HEADSHOT", '#ffa500');
            }
            if (this.isCrit) {
                game.uiManager.addFloatingText(this.target.x, this.target.y - 45, "CRIT!", '#ff0000');
            }
            if (this.isBurningSpear) {
                if (!this.target.burningSpears) this.target.burningSpears = [];
                this.target.burningSpears.push({ duration: 9.0, tickTimer: 0, attacker: this.attacker });
            }
            // Наносим основной урон (уже с учётом крита и т.д.)
            this.target.takeDamage(this.damage, this.attacker);
            // Вампиризм
            try {
                const attacker = this.attacker;
                if (attacker && attacker.vladmirAura) {
                    let lifesteal = this.damage * 0.20;
                    if (this.target instanceof Creep) lifesteal *= 0.6;
                    attacker.hp = Math.min(attacker.maxHp, attacker.hp + lifesteal);
                }
            } catch (e) {}
            if (this.isAss && this.target.isDead) { game.uiManager.addFloatingText(this.target.x, this.target.y - 45, "ASSASSINATED!", '#ff0000'); }
            return true;
        }
        this.x += (dx / dist) * this.speed * dt;
        this.y += (dy / dist) * this.speed * dt;
        return false;
    }

    draw(ctx, camera) {
        let sx = this.x - camera.x; let sy = this.y - camera.y;
        let color = '#ffff00';
        if (this.isAss) color = '#ff0000';
        else if (this.isHs) color = '#ff8c00';
        else if (this.isBurningSpear) color = '#ff4500';
        else if (this.isManaBreak) color = '#66ccff';
        else if (this.reflected) color = '#ff66ff';
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(sx, sy, this.radius, 0, Math.PI*2); ctx.fill();
    }
}

class BountyRune {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.radius = 12; this.clickRadius = 35;
        this.isSpawned = true;
        this.respawnTimer = 0;
        this.respawnCooldown = 60;
        this.goldReward = 70;
        this.color = '#f59e0b';
    }
    isClicked(mouseX, mouseY) {
        if (!this.isSpawned) return false;
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        return Math.hypot(dx, dy) <= this.clickRadius;
    }
    update(dt) {
        if (!this.isSpawned) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) this.isSpawned = true;
        }
    }
    draw(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        ctx.save();
        ctx.beginPath();
        ctx.arc(screenX, screenY, 35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.06)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.restore();
        if (this.isSpawned) {
            const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.1;
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.radius * pulse, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('$', screenX, screenY);
        }
    }
    pickup(hero) {
        if (!this.isSpawned) return;
        this.isSpawned = false;
        this.respawnTimer = this.respawnCooldown;
        if (hero && typeof hero.gainGold === 'function') {
            hero.gainGold(this.goldReward);
        } else if (hero) {
            hero.gold += this.goldReward;
        }
        if (game.audioManager) {
            game.audioManager.play('buy');
        }
    }
}

// ----------------------------------------------
// БАРАКИ
// ----------------------------------------------
class Barracks {
    constructor(x, y, team, type, lane) {
        this.x = x;
        this.y = y;
        this.team = team;
        this.type = type;
        this.lane = lane;
        this.radius = 20;
        this.maxHp = 1200;
        this.hp = 1200;
        this.isDead = false;
        this.armor = 5;
        this.t3Alive = true; // будет обновляться из игры
    }

    isAttackable() {
        return !this.isDead && this.isVulnerable();
    }

    // Проверка, можно ли атаковать (T3 должна быть мертва)
    isVulnerable() {
        if (this.isDead) return false;
        // Находим соответствующую T3 для этой линии и команды
        const lane = this.lane;
        const team = this.team;
        const towers = game.towers;
        // T3 имеет tier === 3, ищем башню с такой же линией и командой
        const t3 = towers.find(t => t.team === team && t.lane === lane && t.tier === 3 && !t.isDead);
        return !t3; // если T3 нет в живых, то уязвим
    }

    takeDamage(amount, attacker) {
        if (this.isDead) return;
        if (!this.isVulnerable()) return; // не уязвим, игнорируем урон

        let reduction = this.armor / (this.armor + 100);
        amount = Math.max(1, amount * (1 - reduction));
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.isDead = true;
            audio.play('tower_break');
        }
    }

    update(dt) {}

    draw(ctx, camera) {
        if (this.isDead) return;
        // Проверяем уязвимость для отображения (прозрачность)
        const vulnerable = this.isVulnerable();
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;
        ctx.save();
        ctx.globalAlpha = vulnerable ? 1.0 : 0.4;
        ctx.fillStyle = this.team === 'radiant' ? '#2d7d2d' : '#7d2d2d';
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.fillRect(sx - 18, sy - 14, 36, 28);
        ctx.strokeRect(sx - 18, sy - 14, 36, 28);
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type === 'melee' ? '⚔️' : '🏹', sx, sy);
        ctx.restore();
        // HP bar
        const barW = 40, barH = 4;
        ctx.fillStyle = '#000';
        ctx.fillRect(sx - barW/2, sy - 22, barW, barH);
        ctx.fillStyle = this.team === 'radiant' ? '#33ff33' : '#ff3333';
        ctx.fillRect(sx - barW/2, sy - 22, barW * (this.hp/this.maxHp), barH);
        // Если не уязвим, показываем замок
        if (!vulnerable) {
            ctx.fillStyle = '#ffaa00';
            ctx.font = '12px Arial';
            ctx.fillText('🔒', sx, sy - 30);
        }
    }
}

// ----------------------------------------------
// НОВЫЙ КЛАСС ИИ ДЛЯ БОТОВ (исправленный)
// ----------------------------------------------
class BotAI {
    constructor(hero, lane, game) {
        this.hero = hero;
        this.lane = lane;
        this.game = game;
        this.state = 'normal'; // 'normal', 'retreat', 'heal'
        this.fountain = hero.team === 'radiant' ? game.fountains[0] : game.fountains[1];
        this.waypoints = hero.team === 'radiant' ? game.map.waypoints[lane] : game.map.waypointsReverse[lane];
        this.waypointIndex = 0;
        this.retreatThreshold = 0.10; // 10% hp
        this.abilityTimer = 0;
        this.blinkTimer = 0;
    }

    update(dt) {
        const hero = this.hero;
        if (hero.isDead) return;

        // Проверяем состояние здоровья
        const hpPercent = hero.hp / hero.maxHp;

        // Переход в режим отступления
        if (hpPercent <= this.retreatThreshold && this.state !== 'heal') {
            this.state = 'retreat';
            hero.attackTarget = null;
            hero.moveTo(this.fountain.x, this.fountain.y);
        }

        // Если на базе и здоровье не полное, лечимся
        if (this.state === 'retreat' || this.state === 'heal') {
            const dist = Math.hypot(hero.x - this.fountain.x, hero.y - this.fountain.y);
            if (dist < this.fountain.radius) {
                this.state = 'heal';
                // Лечение выполняется в Fountain.update, здесь ничего не делаем
                if (hero.hp >= hero.maxHp) {
                    // Полностью вылечились, возвращаемся на линию
                    this.state = 'normal';
                    hero.attackTarget = null;
                    if (this.waypoints && this.waypoints.length > 0) {
                        this.waypointIndex = 0;
                        hero.moveTo(this.waypoints[0].x, this.waypoints[0].y);
                    }
                }
                return;
            }
            // Если ещё не дошли до фонтана, продолжаем двигаться (moveTo уже установлен)
            return;
        }

        // В нормальном режиме выбираем цель и двигаемся
        if (this.state === 'normal') {
            // Поиск целей по приоритету
            const target = this.selectTarget();
            if (target) {
                hero.attackTarget = target;
                // Если цель вне радиуса атаки, двигаемся к ней
                const d = Math.hypot(hero.x - target.x, hero.y - target.y);
                if (d > hero.attackRange * 0.85) {
                    hero.moveTo(target.x, target.y);
                }

                // Использование способностей (не чаще 1 раза в 2 секунды)
                this.abilityTimer += dt;
                if (this.abilityTimer > 2.0) {
                    this.abilityTimer = 0;
                    this.useAbilities(target);
                }

                // Специфическая логика для Anti-Mage
                if (hero instanceof AntiMage) {
                    // Blink для сближения, если цель далеко
                    if (d > 400 && hero.abilities[1].currentCooldown <= 0 && hero.mp >= 50) {
                        hero.useAbility(1);
                    }
                }
            } else {
                // Нет целей, двигаемся по waypoints
                hero.attackTarget = null;
                if (this.waypoints && this.waypoints.length > 0) {
                    if (this.waypointIndex >= this.waypoints.length) {
                        // Стоим на месте
                    } else {
                        const wp = this.waypoints[this.waypointIndex];
                        const dist = Math.hypot(hero.x - wp.x, hero.y - wp.y);
                        if (dist < 20) {
                            this.waypointIndex++;
                            if (this.waypointIndex < this.waypoints.length) {
                                hero.moveTo(this.waypoints[this.waypointIndex].x, this.waypoints[this.waypointIndex].y);
                            }
                        } else {
                            hero.moveTo(wp.x, wp.y);
                        }
                    }
                }
            }
        }
    }

    selectTarget() {
        const hero = this.hero;
        const enemies = hero.team === 'radiant' ? this.game.direEntities() : this.game.radiantEntities();

        // 1. Вражеские крипы в радиусе атаки
        const attackRange = hero.attackRange * 1.2;
        let closestCreep = null;
        let minDistCreep = Infinity;
        for (let e of enemies) {
            if (e.isDead || !e.isAttackable()) continue;
            if (!(e instanceof Creep)) continue;
            const d = Math.hypot(e.x - hero.x, e.y - hero.y);
            if (d <= attackRange && d < minDistCreep) {
                minDistCreep = d;
                closestCreep = e;
            }
        }
        if (closestCreep) return closestCreep;

        // 2. Вражеские герои в радиусе атаки
        let closestHero = null;
        let minDistHero = Infinity;
        for (let e of enemies) {
            if (e.isDead || !e.isAttackable()) continue;
            if (!(e instanceof Hero)) continue;
            const d = Math.hypot(e.x - hero.x, e.y - hero.y);
            if (d <= attackRange && d < minDistHero) {
                minDistHero = d;
                closestHero = e;
            }
        }
        if (closestHero) return closestHero;

        // 3. Вражеские строения (башни, бараки, трон) – выбираем ближайшее
        let closestBuilding = null;
        let minDistBuilding = Infinity;
        // Башни
        for (let t of this.game.towers) {
            if (t.team === hero.team || t.isDead || !t.isAttackable()) continue;
            const d = Math.hypot(t.x - hero.x, t.y - hero.y);
            if (d < minDistBuilding) {
                minDistBuilding = d;
                closestBuilding = t;
            }
        }
        // Бараки
        for (let b of this.game.barracks) {
            if (b.team === hero.team || b.isDead || !b.isAttackable()) continue;
            const d = Math.hypot(b.x - hero.x, b.y - hero.y);
            if (d < minDistBuilding) {
                minDistBuilding = d;
                closestBuilding = b;
            }
        }
        // Трон
        for (let a of this.game.ancients) {
            if (a.team === hero.team || a.isDead || !a.isAttackable()) continue;
            const d = Math.hypot(a.x - hero.x, a.y - hero.y);
            if (d < minDistBuilding) {
                minDistBuilding = d;
                closestBuilding = a;
            }
        }

        if (closestBuilding && minDistBuilding <= attackRange) {
            return closestBuilding;
        }

        return null;
    }

    useAbilities(target) {
        const hero = this.hero;
        // Для Anti-Mage особая логика
        if (hero instanceof AntiMage) {
            // Counterspell: использовать перед дракой или при получении урона (упрощённо - если здоровье < 70% и враг рядом)
            if (hero.abilities[2].currentCooldown <= 0 && hero.mp >= 50) {
                const enemies = hero.team === 'radiant' ? this.game.direEntities() : this.game.radiantEntities();
                let nearbyEnemy = enemies.find(e => Math.hypot(e.x - hero.x, e.y - hero.y) < 500 && e instanceof Hero);
                if (nearbyEnemy && hero.hp / hero.maxHp < 0.7) {
                    hero.useAbility(2);
                }
            }
            // Mana Void: использовать, если у цели недостающая мана > 200
            if (hero.abilities[3].currentCooldown <= 0 && hero.mp >= 150) {
                const missing = (target.maxMp || 0) - (target.mp || 0);
                if (missing > 200) {
                    hero.attackTarget = target;
                    hero.useAbility(3);
                }
            }
        } else {
            // Общая логика для других героев (как было)
            for (let i = 0; i < hero.abilities.length; i++) {
                const ab = hero.abilities[i];
                if (ab.type === 'passive') continue;
                if (ab.currentCooldown > 0) continue;
                if (hero.mp < ab.manaCost) continue;
                const dist = Math.hypot(hero.x - target.x, hero.y - target.y);
                if (dist <= 500) {
                    hero.useAbility(i);
                    return;
                }
            }
        }
    }
}

// ----------------------------------------------
// UI Менеджер
// ----------------------------------------------
class UIManager {
    constructor() { this.floatTexts = []; }
    addFloatingText(x, y, text, color) { this.floatTexts.push({ x, y, text, color, life: 1.0 }); }
    update(dt) {
        for (let i = this.floatTexts.length - 1; i >= 0; i--) {
            this.floatTexts[i].life -= dt; this.floatTexts[i].y -= 20 * dt;
            if (this.floatTexts[i].life <= 0) this.floatTexts.splice(i, 1);
        }
        this.syncHUD();
    }
    syncHUD() {
        let p = game.playerHero; if (!p) return;
        document.getElementById('hero-level-badge').innerText = p.level;
        document.getElementById('stat-damage').innerText = Math.floor(p.damage);
        document.getElementById('stat-speed').innerText = Math.floor(p.speed);
        document.getElementById('stat-range').innerText = Math.floor(p.attackRange);
        document.getElementById('xp-bar').style.width = `${(p.xp / p.maxXp) * 100}%`;
        document.getElementById('xp-text').innerText = `${p.xp}/${p.maxXp} XP`;
        document.getElementById('hp-indicator').style.width = `${(p.hp / p.maxHp) * 100}%`;
        document.getElementById('hp-text').innerText = `${Math.floor(p.hp)}/${p.maxHp}`;
        document.getElementById('hp-regen-text').innerText = `+${p.getHpRegen().toFixed(1)}`;
        document.getElementById('mp-indicator').style.width = p.maxMp > 0 ? `${(p.mp / p.maxMp) * 100}%` : '0%';
        document.getElementById('mp-text').innerText = p.maxMp > 0 ? `${Math.floor(p.mp)}/${p.maxMp}` : '0/0';
        document.getElementById('mp-regen-text').innerText = p.maxMp > 0 ? `+${p.getMpRegen().toFixed(1)}` : '+0.0';
        document.getElementById('gold-value').innerText = Math.floor(p.gold);

        const profileIcon = document.getElementById('hero-profile-icon');
        if (profileIcon) {
            const heroKey = p.name || '';
            if (profileIcon.dataset.hero !== heroKey) {
                if (heroKey === 'Morphling') {
                    profileIcon.src = 'images/morphling_profile.gif';
                    profileIcon.alt = 'Morphling profile';
                } else if (heroKey === 'Sniper') {
                    profileIcon.src = 'images/sniper_profile.gif';
                    profileIcon.alt = 'Sniper profile';
                } else if (heroKey === 'Warlock') {
                    profileIcon.src = 'images/warlock_profile.webp';
                    profileIcon.alt = 'Warlock profile';
                } else if (heroKey === 'Bristleback') {
                    profileIcon.src = 'images/Bristleback_icon.svg';
                    profileIcon.alt = 'Bristleback profile';
                } else if (heroKey === 'Huskar') {
                    profileIcon.src = 'images/Huskar_icon.webp';
                    profileIcon.alt = 'Huskar profile';
                } else if (heroKey === 'Anti-Mage') {
                    profileIcon.src = 'images/antimage_profile.png';
                    profileIcon.alt = 'Anti-Mage profile';
                } else {
                    profileIcon.src = '';
                    profileIcon.alt = '';
                }
                profileIcon.dataset.hero = heroKey;
            }
            if (heroKey) profileIcon.classList.remove('hidden'); else profileIcon.classList.add('hidden');
        }

        let t = game.matchTime;
        document.getElementById('match-timer').innerText = `${Math.floor(t/60).toString().padStart(2,'0')}:${Math.floor(t%60).toString().padStart(2,'0')}`;
        let rt = game.ancients.find(a => a.team === 'radiant');
        let dt = game.ancients.find(a => a.team === 'dire');
        if (rt && dt) {
            document.getElementById('radiant-throne-hp').innerText = `${Math.ceil((rt.hp/rt.maxHp)*100)}%`;
            document.getElementById('dire-throne-hp').innerText = `${Math.ceil((dt.hp/dt.maxHp)*100)}%`;
        }
        
        for (let i = 0; i < 4; i++) {
            let slot = document.getElementById(`ability-${i}`);
            let cd = document.getElementById(`cooldown-${i}`);
            let tt = document.getElementById(`tooltip-${i}`);
            let ab = p.abilities[i];
            if (ab) {
                if (slot) {
                    slot.style.display = "flex";
                    let displayName = ab.name;
                    if (p instanceof Sniper && i === 0) {
                        displayName = `${ab.name} (${p.shrapnelCharges})`;
                    }
                    slot.querySelector('.ability-name').innerText = displayName;
                    tt.innerHTML = `<strong>${ab.name}</strong><br>${ab.description}<br>Cost: ${ab.manaCost} | CD: ${ab.maxCooldown}s`;
                    
                    if (p instanceof Sniper && i === 0) {
                        if (p.shrapnelCharges === 0) {
                            cd.style.opacity = 1;
                            cd.innerText = Math.ceil(p.shrapnelChargeCooldown - p.shrapnelChargeRegenTimer);
                        } else {
                            cd.style.opacity = 0;
                        }
                    } else {
                        if (ab.currentCooldown > 0) { cd.style.opacity = 1; cd.innerText = Math.ceil(ab.currentCooldown); }
                        else { cd.style.opacity = 0; }
                    }
                }
            } else {
                if (slot) slot.style.display = "none";
            }
        }
        for (let i = 0; i < 6; i++) {
            let slot = document.querySelector(`.inventory-slot[data-slot="${i}"]`);
            if (slot) {
                let it = p.inventory.slots[i];
                slot.innerText = it ? it.name.split(' ')[0] : '';
                slot.style.background = it ? '#253341' : '#11161b';
            }
        }

        let glyphBtn = document.getElementById('glyph-btn');
        let glyphCd = document.getElementById('glyph-cooldown');
        if (glyphBtn && glyphCd) {
            let playerTeam = p?.team;
            let cooldown = playerTeam ? game.glyphCooldown[playerTeam] : 0;
            let active = playerTeam ? game.glyphActive[playerTeam] : false;
            glyphBtn.disabled = !p || p.isDead || cooldown > 0;
            if (active) {
                glyphBtn.classList.add('active');
                glyphBtn.title = `Glyph active (${Math.ceil(game.glyphTimer[playerTeam])}s)`;
            } else {
                glyphBtn.classList.remove('active');
                glyphBtn.title = cooldown > 0
                    ? `Glyph: ${Math.ceil(cooldown)}s`
                    : 'Activate Glyph (Protect towers)';
            }
            if (cooldown > 0) {
                glyphCd.innerText = Math.ceil(cooldown);
                glyphCd.style.visibility = 'visible';
                glyphCd.style.opacity = 1;
            } else {
                glyphCd.style.visibility = 'hidden';
                glyphCd.style.opacity = 0;
            }
        }
    }
    draw(ctx, camera) {
        ctx.save(); ctx.font = 'bold 14px Arial';
        for (let t of this.floatTexts) {
            ctx.fillStyle = t.color; ctx.globalAlpha = t.life; ctx.fillText(t.text, t.x - camera.x, t.y - camera.y);
        }
        ctx.restore(); this.drawMinimap();
    }
    drawMinimap() {
        const mCanvas = document.getElementById('minimapCanvas'); const mCtx = mCanvas.getContext('2d');
        if (!mCanvas) return;
        mCtx.clearRect(0,0,150,150); mCtx.fillStyle = '#151c12'; mCtx.fillRect(0,0,150,150);
        const lanes = ['top', 'mid', 'bottom'];
        for (let lane of lanes) {
            const wps = game.map.waypoints[lane];
            if (!wps || wps.length < 2) continue;
            mCtx.strokeStyle = '#3a5a3a';
            mCtx.lineWidth = 2;
            mCtx.beginPath();
            for (let wp of wps) {
                const sx = (wp.x / 8000) * 150;
                const sy = (wp.y / 6000) * 150;
                if (mCtx.isPointInPath) mCtx.lineTo(sx, sy);
                else mCtx.moveTo(sx, sy);
            }
            mCtx.stroke();
        }
        let toM = (x, y) => ({ x: (x / 8000) * 150, y: (y / 6000) * 150 });
        let drawDots = (list, color, r) => {
            mCtx.fillStyle = color;
            for (let e of list) { if (e.isDead) continue; let pos = toM(e.x, e.y); mCtx.beginPath(); mCtx.arc(pos.x, pos.y, r, 0, Math.PI*2); mCtx.fill(); }
        };
        drawDots(game.towers.filter(t => t.team==='radiant'), '#00ff00', 3);
        drawDots(game.towers.filter(t => t.team==='dire'), '#ff0000', 3);
        drawDots(game.ancients.filter(a => a.team==='radiant'), '#00cc00', 5);
        drawDots(game.ancients.filter(a => a.team==='dire'), '#cc0000', 5);
        drawDots(game.creeps.filter(c => c.team==='radiant'), '#7cfc00', 1.5);
        drawDots(game.creeps.filter(c => c.team==='dire'), '#8b008b', 1.5);
        if (!game.playerHero.isDead) drawDots([game.playerHero], '#00ffff', 4);
        if (!game.enemyHero.isDead) drawDots([game.enemyHero], '#ff00ff', 4);
        for (let bot of game.alliedBots) {
            if (!bot.isDead) { const pos = toM(bot.x, bot.y); mCtx.fillStyle = '#00ddff'; mCtx.beginPath(); mCtx.arc(pos.x, pos.y, 2, 0, Math.PI*2); mCtx.fill(); }
        }
        for (let bot of game.enemyBots) {
            if (!bot.isDead) { const pos = toM(bot.x, bot.y); mCtx.fillStyle = '#ff44aa'; mCtx.beginPath(); mCtx.arc(pos.x, pos.y, 2, 0, Math.PI*2); mCtx.fill(); }
        }
        for (let b of game.barracks) {
            if (b.isDead) continue;
            const pos = toM(b.x, b.y);
            mCtx.fillStyle = b.team === 'radiant' ? '#66ff66' : '#ff6666';
            mCtx.beginPath(); mCtx.arc(pos.x, pos.y, 2, 0, Math.PI*2); mCtx.fill();
        }
    }
}

// ----------------------------------------------
// ОСНОВНОЙ КЛАСС ИГРЫ
// ----------------------------------------------
class Game {
    constructor() {
        this.map = new GameMap(); 
        this.camera = new Camera(this.map); 
        this.uiManager = new UIManager();
        this.playerHero = null; 
        this.enemyHero = null; 
        this.alliedBots = [];
        this.enemyBots = [];
        this.creeps = []; 
        this.towers = []; 
        this.barracks = [];
        this.ancients = []; 
        this.fountains = []; 
        this.projectiles = [];
        this.shrapnelZones = [];
        this.effects = [];
        this.matchTime = 0; 
        this.creepTimer = 0; 
        this.lastTime = performance.now();
        this.globalSpeedMultiplier = 0.75; 
        this.glyphCooldown = { radiant: 0, dire: 0 }; 
        this.glyphMaxCooldown = 120;
        this.glyphActive = { radiant: false, dire: false }; 
        this.glyphDuration = 8; 
        this.glyphTimer = { radiant: 0, dire: 0 };
        this.glyphShieldReduction = 0.4;
        this.waveNumber = 0;
        this.bountyRunes = [
            new BountyRune(700, 5000),
            new BountyRune(7300, 1500)
        ];
        this.initWorld(); 
        this.initInput();
        this.initShopItems(); // добавить новые предметы в магазин
    }

    initShopItems() {
        const shopList = document.querySelector('.shop-items-list');
        if (!shopList) return;
        // Проверяем, не добавлены ли уже (чтобы избежать дублирования)
        if (shopList.querySelector('[data-item="ringtarrasque"]')) return;

        // Ring of Tarrasque
        const ringItem = document.createElement('div');
        ringItem.className = 'shop-item';
        ringItem.setAttribute('data-item', 'ringtarrasque');
        ringItem.innerHTML = `
            <img class="shop-item-icon" src="images/ring_of_tarrasque_icon.png" alt="Ring of Tarrasque">
            <div class="shop-item-info">
                <h3>💍 Ring of Tarrasque</h3>
                <p>Price: 1700 🪙</p>
                <p>Bonus: +12 HP regen</p>
            </div>
        `;
        ringItem.addEventListener('click', () => this.buyItem('ringtarrasque'));
        shopList.appendChild(ringItem);

        // Reaver
        const reaverItem = document.createElement('div');
        reaverItem.className = 'shop-item';
        reaverItem.setAttribute('data-item', 'reaver');
        reaverItem.innerHTML = `
            <img class="shop-item-icon" src="images/reaver_icon.png" alt="Reaver">
            <div class="shop-item-info">
                <h3>⚔️ Reaver</h3>
                <p>Price: 2500 🪙</p>
                <p>Bonus: +25 Health</p>
            </div>
        `;
        reaverItem.addEventListener('click', () => this.buyItem('reaver'));
        shopList.appendChild(reaverItem);

        // Radiance
        const radianceItem = document.createElement('div');
        radianceItem.className = 'shop-item';
        radianceItem.setAttribute('data-item', 'radiance');
        radianceItem.innerHTML = `
            <img class="shop-item-icon" src="images/radiance_icon.png" alt="Radiance">
            <div class="shop-item-info">
                <h3>🔥 Radiance</h3>
                <p>Price: 1500 🪙</p>
                <p>Bonus: +20 damage</p>
                <p>Passive: Burns nearby enemies for 20 magic damage/sec.</p>
                <p>Enemies in radius have 5% miss chance.</p>
            </div>
        `;
        radianceItem.addEventListener('click', () => this.buyItem('radiance'));
        shopList.appendChild(radianceItem);
    }

    getAllHeroes() {
        const heroes = [];
        if (this.playerHero && !this.playerHero.isDead) heroes.push(this.playerHero);
        for (let bot of this.alliedBots) {
            if (!bot.isDead) heroes.push(bot);
        }
        if (this.enemyHero && !this.enemyHero.isDead) heroes.push(this.enemyHero);
        for (let bot of this.enemyBots) {
            if (!bot.isDead) heroes.push(bot);
        }
        return heroes;
    }

    initWorld() {
        this.ancients.push(new Ancient(this.map.radiantBase.x, this.map.radiantBase.y, 'radiant'));
        this.ancients.push(new Ancient(this.map.direBase.x, this.map.direBase.y, 'dire'));
        this.fountains.push(new Fountain(this.map.radiantBase.x - 100, this.map.radiantBase.y + 100, 'radiant'));
        this.fountains.push(new Fountain(this.map.direBase.x + 100, this.map.direBase.y - 100, 'dire'));

        // Исправление нижней линии: бараки между троном и T3, башни в порядке T3, T2, T1 от базы
        const laneData = {
            top: {
                towers: {
                    radiant: [{x: 500, y: 4400}, {x: 500, y: 2800}, {x: 500, y: 1400}],
                    dire:    [{x: 1500, y: 1000}, {x: 3500, y: 1000}, {x: 5500, y: 1000}]
                },
                barracks: {
                    radiant: {x: 500, y: 900},
                    dire:    {x: 6500, y: 1000}
                }
            },
            mid: {
                towers: {
                    radiant: [{x: 3650, y: 3475}, {x: 2600, y: 4150}, {x: 1550, y: 4825}],
                    dire:    [{x: 4350, y: 3025}, {x: 5400, y: 2350}, {x: 6450, y: 1675}]
                },
                barracks: {
                    radiant: {x: 850, y: 5275},
                    dire:    {x: 7150, y: 1225}
                }
            },
            bottom: {
                towers: {
                    radiant: [{x: 2800, y: 5500}, {x: 5675, y: 5500}, {x: 7500, y: 4450}],
                    dire:    [{x: 7500, y: 3500}, {x: 7500, y: 2500}, {x: 7500, y: 1500}]
                },
                barracks: {
                    radiant: {x: 1500, y: 5500},
                    dire:    {x: 7500, y: 1250}
                }
            }
        };

        const lanes = ['top', 'mid', 'bottom'];
        for (let lane of lanes) {
            const data = laneData[lane];
            for (let i = 0; i < 3; i++) {
                const pos = data.towers.radiant[i];
                const tier = (lane === 'bottom') ? 3 - i : i + 1;
                const tower = new Tower(pos.x, pos.y, 'radiant', tier);
                tower.lane = lane;
                this.towers.push(tower);
            }
            for (let i = 0; i < 3; i++) {
                const pos = data.towers.dire[i];
                const tier = (lane === 'bottom') ? 3 - i : i + 1;
                const tower = new Tower(pos.x, pos.y, 'dire', tier);
                tower.lane = lane;
                this.towers.push(tower);
            }
            const bPosR = data.barracks.radiant;
            this.barracks.push(new Barracks(bPosR.x, bPosR.y - 20, 'radiant', 'melee', lane));
            this.barracks.push(new Barracks(bPosR.x, bPosR.y + 20, 'radiant', 'ranged', lane));
            const bPosD = data.barracks.dire;
            this.barracks.push(new Barracks(bPosD.x, bPosD.y - 20, 'dire', 'melee', lane));
            this.barracks.push(new Barracks(bPosD.x, bPosD.y + 20, 'dire', 'ranged', lane));
        }
    }

    start(selectedHeroName) {
        audio.init();
        this.playerHero = this.createHero(selectedHeroName, this.map.radiantBase.x, this.map.radiantBase.y, 'radiant');
        const pool = ['Morphling', 'Warlock', 'Sniper', 'Bristleback', 'Huskar', 'Anti-Mage'];
        this.enemyHero = this.createHero(pool[Math.floor(Math.random() * pool.length)], this.map.direBase.x, this.map.direBase.y, 'dire');
        this.enemyHero.ai = new BotAI(this.enemyHero, 'mid', this);

        const alliedLanes = ['top', 'bottom'];
        for (let lane of alliedLanes) {
            for (let i = 0; i < 2; i++) {
                const name = pool[Math.floor(Math.random() * pool.length)];
                const x = this.map.radiantBase.x + 100 + i * 80;
                const y = this.map.radiantBase.y - 100 + i * 80;
                const hero = this.createHero(name, x, y, 'radiant');
                hero.ai = new BotAI(hero, lane, this);
                this.alliedBots.push(hero);
            }
        }

        for (let lane of alliedLanes) {
            for (let i = 0; i < 2; i++) {
                const name = pool[Math.floor(Math.random() * pool.length)];
                const x = this.map.direBase.x - 100 - i * 80;
                const y = this.map.direBase.y + 100 + i * 80;
                const hero = this.createHero(name, x, y, 'dire');
                hero.ai = new BotAI(hero, lane, this);
                this.enemyBots.push(hero);
            }
        }

        document.getElementById('hero-selection').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        this.lastTime = performance.now(); 
        requestAnimationFrame((t) => this.loop(t));
    }

    createHero(name, x, y, team) {
        if (name === 'Morphling') return new Morphling(x, y, team);
        if (name === 'Warlock') return new Warlock(x, y, team);
        if (name === 'Bristleback') return new Bristleback(x, y, team);
        if (name === 'Huskar') return new Huskar(x, y, team);
        if (name === 'Anti-Mage') return new AntiMage(x, y, team);
        return new Sniper(x, y, team);
    }

    radiantEntities() {
        return [this.playerHero, ...this.alliedBots, ...this.creeps.filter(c => c.team==='radiant'), ...this.towers.filter(t => t.team==='radiant'), ...this.ancients.filter(a => a.team==='radiant')].filter(e => e && !e.isDead);
    }

    direEntities() {
        return [this.enemyHero, ...this.enemyBots, ...this.creeps.filter(c => c.team==='dire'), ...this.towers.filter(t => t.team==='dire'), ...this.ancients.filter(a => a.team==='dire')].filter(e => e && !e.isDead);
    }

    spawnWave() {
        this.waveNumber++;
        const lanes = ['top', 'mid', 'bottom'];
        for (let lane of lanes) {
            const radiantWp = this.map.waypoints[lane][0];
            const direWp = this.map.waypointsReverse[lane][0];
            for (let i = 0; i < 3; i++) {
                const offsetX = i * 20 - 20;
                const offsetY = i * 15 - 15;
                this.creeps.push(new Creep(radiantWp.x + offsetX, radiantWp.y + offsetY, 'radiant', 'melee', lane));
                this.creeps.push(new Creep(direWp.x + offsetX, direWp.y + offsetY, 'dire', 'melee', lane));
            }
            this.creeps.push(new Creep(radiantWp.x - 30, radiantWp.y - 20, 'radiant', 'ranged', lane));
            this.creeps.push(new Creep(direWp.x + 30, direWp.y + 20, 'dire', 'ranged', lane));
            if (this.waveNumber % 3 === 0) {
                this.creeps.push(new Catapult(radiantWp.x - 50, radiantWp.y - 30, 'radiant', lane));
                this.creeps.push(new Catapult(direWp.x + 50, direWp.y + 30, 'dire', lane));
            }
        }
    }

    initInput() {
        canvas.addEventListener('mousedown', (e) => {
            if (e.button !== 2) return; 
            e.preventDefault();
            audio.init();

            const rect = canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
            const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
            
            const wx = mouseX + this.camera.x;
            const wy = mouseY + this.camera.y;

            if (this.bountyRunes) {
                for (let rune of this.bountyRunes) {
                    if (rune.isClicked(wx, wy)) {
                        const distToRune = Math.hypot(this.playerHero.x - rune.x, this.playerHero.y - rune.y);
                        if (distToRune <= 100) {
                            rune.pickup(this.playerHero);
                        } else {
                            this.playerHero.setMoveTarget(rune.x, rune.y);
                        }
                        return;
                    }
                }
            }

            let player = this.playerHero;
            let enemyTeam = player.team === 'radiant' ? 'dire' : 'radiant';

            let possibleTargets = [];
            if (this.enemyHero && !this.enemyHero.isDead && this.enemyHero.isAttackable()) possibleTargets.push(this.enemyHero);
            for (let bot of this.enemyBots) {
                if (!bot.isDead && bot.isAttackable()) possibleTargets.push(bot);
            }
            for (let c of this.creeps) {
                if (c.team === enemyTeam && !c.isDead && c.isAttackable()) possibleTargets.push(c);
            }
            for (let t of this.towers) {
                if (t.team === enemyTeam && !t.isDead && t.isAttackable()) possibleTargets.push(t);
            }
            for (let b of this.barracks) {
                if (b.team === enemyTeam && !b.isDead && b.isAttackable()) possibleTargets.push(b);
            }
            for (let a of this.ancients) {
                if (a.team === enemyTeam && !a.isDead && a.isAttackable()) possibleTargets.push(a);
            }

            let clickedEnemy = null;
            let minDist = Infinity;
            for (let ent of possibleTargets) {
                const d = Math.hypot(ent.x - wx, ent.y - wy);
                if (d < ent.radius + 20 && d < minDist) {
                    minDist = d;
                    clickedEnemy = ent;
                }
            }

            if (clickedEnemy) {
                this.playerHero.attackTarget = clickedEnemy;
            } else {
                this.playerHero.attackTarget = null;
                this.playerHero.moveTo(wx, wy);
                this.uiManager.addFloatingText(wx, wy, "➔", '#00ff00');
            }
        });

        window.addEventListener('keydown', (e) => {
            const k = e.key.toLowerCase();
            if (k === 'q' || k === 'й') this.playerHero.useAbility(0);
            if (k === 'w' || k === 'ц') this.playerHero.useAbility(1);
            if (k === 'e' || k === 'у') this.playerHero.useAbility(2); 
            if (k === 'r' || k === 'к') this.playerHero.useAbility(3); 
            if (k === 'p' || k === 'з') this.toggleShop();
            if (k === 'g' || k === 'п') this.activateGlyph();
        });
        document.getElementById('open-shop-btn').addEventListener('click', () => this.toggleShop());
        document.getElementById('glyph-btn')?.addEventListener('click', () => this.activateGlyph());
        document.getElementById('close-shop-btn').addEventListener('click', () => this.toggleShop());
        document.querySelectorAll('.shop-item').forEach(el => {
            el.addEventListener('click', () => this.buyItem(el.getAttribute('data-item')));
        });
        document.getElementById('ability-1').addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.playerHero && this.playerHero.name === 'Huskar') {
                this.playerHero.useAbility(1);
            }
        });
    }

    toggleShop() { document.getElementById('shop-modal').classList.toggle('hidden'); }
    activateGlyph() { this.activateGlyphForTeam(this.playerHero?.team); }

    activateGlyphForTeam(team) {
        if (!team || this.glyphCooldown[team] > 0 || this.glyphActive[team]) return false;
        this.glyphActive[team] = true;
        this.glyphTimer[team] = this.glyphDuration;
        this.glyphCooldown[team] = this.glyphMaxCooldown;
        for (let tower of this.towers) {
            if (tower.team === team && !tower.isDead) {
                tower.glyphActive = true;
                tower.glyphTimer = this.glyphDuration;
            }
        }
        audio.play('ability');
        let heroForText = team === this.playerHero?.team ? this.playerHero : this.enemyHero;
        if (heroForText && !heroForText.isDead) {
            this.uiManager.addFloatingText(heroForText.x, heroForText.y - 40, 'Glyph activated', '#7dd3fc');
        }
        return true;
    }

    buyItem(type) {
        let p = this.playerHero; let it = null;
        if (type === 'boots') it = new Item('boots', 'Boots of Speed', 500, { speedBonus: 30 });
        if (type === 'sword') it = new Item('sword', 'Crystalys', 1500, { damageBonus: 32, critChance: 0.3, critMultiplier: 1.6 });
        if (type === 'vitality') it = new Item('vitality', 'Vitality Booster', 1000, { hp: 250 });
        if (type === 'ringhealth') it = new Item('ringhealth', 'Ring of Health', 400, { hpRegen: 4.5 });
        if (type === 'vladmir') it = new Item('vladmir', "Vladmir's Offering", 1500, { manaRegen: 0.75, armorBonus: 1 });
        if (type === 'linkens') it = new Item('linkens', "Linken's Sphere", 1500, { hp: 200, mana: 200, damage: 15, manaRegen: 5 });
        // Новые предметы
        if (type === 'ringtarrasque') it = new Item('ringtarrasque', 'Ring of Tarrasque', 1700, { hpRegen: 12 });
        if (type === 'reaver') it = new Item('reaver', 'Reaver', 2500, { hp: 25 });
        if (type === 'radiance') it = new Item('radiance', 'Radiance', 1500, { damageBonus: 20 });
        if (it && p.gold >= it.cost && p.inventory.addItem(it)) { 
            p.gold -= it.cost; audio.play('buy');
            if (it.id === 'vladmir') { p.hasVladmir = true; }
            if (it.id === 'linkens') { p.hasLinkens = true; p.linkensCooldown = 0; }
        }
    }

    loop(time) {
        let dt = (time - this.lastTime) / 1000; this.lastTime = time;
        if (dt > 0.1) dt = 0.1; this.update(dt); this.render();
        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        this.matchTime += dt; this.creepTimer += dt;
        for (let team of ['radiant', 'dire']) {
            if (this.glyphCooldown[team] > 0) {
                this.glyphCooldown[team] = Math.max(0, this.glyphCooldown[team] - dt);
            }
            if (this.glyphActive[team]) {
                this.glyphTimer[team] -= dt;
                if (this.glyphTimer[team] <= 0) {
                    this.glyphActive[team] = false;
                    this.glyphTimer[team] = 0;
                }
            }
        }
        if (this.creepTimer >= 30 || this.matchTime === dt) { this.spawnWave(); this.creepTimer = 0; }

        // Обновление героев и ботов
        this.playerHero.update(dt);
        this.enemyHero.update(dt);
        if (this.enemyHero.ai) this.enemyHero.ai.update(dt);

        for (let bot of this.alliedBots) {
            bot.update(dt);
            if (bot.ai) bot.ai.update(dt);
        }
        for (let bot of this.enemyBots) {
            bot.update(dt);
            if (bot.ai) bot.ai.update(dt);
        }

        for (let i = this.creeps.length - 1; i >= 0; i--) {
            if (this.creeps[i].isDead) this.creeps.splice(i, 1);
            else this.creeps[i].update(dt);
        }

        for (let t of this.towers) t.update(dt);
        for (let b of this.barracks) b.update(dt);
        if (this.bountyRunes) {
            for (let rune of this.bountyRunes) rune.update(dt);
        }
        for (let f of this.fountains) f.update(dt);
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            if (this.projectiles[i].update(dt)) this.projectiles.splice(i, 1);
        }
        for (let i = this.shrapnelZones.length - 1; i >= 0; i--) {
            if (this.shrapnelZones[i].update(dt)) this.shrapnelZones.splice(i, 1);
        }
        for (let i = this.effects.length - 1; i >= 0; i--) {
            this.effects[i].life -= dt;
            if (this.effects[i].life <= 0) this.effects.splice(i, 1);
        }

        this.camera.update(this.playerHero.x, this.playerHero.y);
        this.uiManager.update(dt);
    }

    render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.map.draw(ctx, this.camera);
        for (let zone of this.shrapnelZones) zone.draw(ctx, this.camera);
        for (let f of this.fountains) f.draw(ctx, this.camera);
        for (let t of this.towers) t.draw(ctx, this.camera);
        for (let b of this.barracks) b.draw(ctx, this.camera);
        if (this.bountyRunes) {
            for (let rune of this.bountyRunes) rune.draw(ctx, this.camera);
        }
        for (let a of this.ancients) a.draw(ctx, this.camera);
        for (let c of this.creeps) c.draw(ctx, this.camera);

        this.playerHero.draw(ctx, this.camera);
        this.enemyHero.draw(ctx, this.camera);
        for (let bot of this.alliedBots) bot.draw(ctx, this.camera);
        for (let bot of this.enemyBots) bot.draw(ctx, this.camera);

        for (let p of this.projectiles) p.draw(ctx, this.camera);
        for (let e of this.effects) {
            if (e.type === 'linkens') {
                ctx.save();
                ctx.strokeStyle = "#66ccff";
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(e.x - this.camera.x, e.y - this.camera.y, 35, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            } else if (e.type === 'blink') {
                ctx.save();
                ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
                ctx.beginPath();
                ctx.arc(e.x - this.camera.x, e.y - this.camera.y, e.radius || 40, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (e.type === 'counterspell_shield') {
                ctx.save();
                ctx.strokeStyle = 'rgba(0, 200, 255, 0.5)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(e.x - this.camera.x, e.y - this.camera.y, e.radius || 30, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            } else if (e.type === 'mana_void') {
                ctx.save();
                ctx.fillStyle = 'rgba(100, 0, 255, 0.2)';
                ctx.beginPath();
                ctx.arc(e.x - this.camera.x, e.y - this.camera.y, e.radius || 350, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#8800ff';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();
            } else if (e.type === 'radiance_burn') {
                ctx.save();
                ctx.fillStyle = 'rgba(255, 140, 0, 0.3)';
                ctx.beginPath();
                ctx.arc(e.x - this.camera.x, e.y - this.camera.y, 15, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (e.type === 'reflect') {
                // небольшой эффект отражения
            }
        }
        this.uiManager.draw(ctx, this.camera);
    }

    endGame(wonTeam) {
        document.getElementById('game-screen').classList.add('hidden');
        let scr = document.getElementById('end-screen'); let title = document.getElementById('end-title');
        scr.classList.remove('hidden');
        if (wonTeam === this.playerHero.team) { title.innerText = "ПОБЕДА"; title.style.color = "#00ff00"; audio.play('victory'); }
        else { title.innerText = "ПОРАЖЕНИЕ"; title.style.color = "#ff0000"; audio.play('defeat'); }
    }
}

const game = new Game();
document.querySelectorAll('.hero-card').forEach(card => {
    card.addEventListener('click', () => game.start(card.getAttribute('data-hero')));
});