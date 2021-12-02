import { gameConfig } from "./gameConfig";
import { ArrowState } from "./state/ArrowState";
import { PlayerState } from "./state/PlayerState";

export interface GameSystemState {
    now: number,
    players: PlayerState[],
    arrows: ArrowState[],
    nextArrowId: number
}

export class GameSystem {

    // State (Render Pull)
    private _state: GameSystemState = {
        now: 0,
        players: [],
        arrows: [],
        nextArrowId: 1
    }
    get state(): Readonly<GameSystemState> {
        return this._state
    }

    reset(state: GameSystemState) {
        this._state = Object.merge({}, state);
    }

    // Input
    applyInput(input: GameSystemInput) {
        if (input.type === 'PlayerMove') {
            let player = this._state.players.find(v => v.id === input.playerId);
            if (!player) {
                return;
            }

            if (player.dizzyEndTime && player.dizzyEndTime > this._state.now) {
                return;
            }
            player.pos.x += input.speed.x * input.dt;
            player.pos.y += input.speed.y * input.dt;
        }
        else if (input.type === 'PlayerAttack') {
            let player = this._state.players.find(v => v.id === input.playerId);
            if (player) {
                this._state.arrows.push({
                    id: this._state.nextArrowId++,
                    fromPlayerId: input.playerId,
                    startPos: { ...player.pos },
                    startTime: this._state.now,
                    targetPos: {
                        x: player.pos.x + input.offset.x,
                        y: player.pos.y + input.offset.y
                    },
                    targetTime: this._state.now + gameConfig.arrowFlyTime
                });
            }
        }
        else if (input.type === 'PlayerJoin') {
            this.state.players.push({
                id: input.playerId,
                pos: { ...input.pos }
            })
        }
        else if (input.type === 'PlayerLeave') {
            this.state.players.remove(v => v.id === input.playerId);
        }
        else if (input.type === 'TimePast') {
            this._state.now += input.dt;

            // 落地的 Arrow
            for (let i = this._state.arrows.length - 1; i > -1; --i) {
                let arrow = this._state.arrows[i];
                if (arrow.targetTime <= this._state.now) {
                    // 伤害判定
                    let damagedPlayers = this._state.players.filter(v => {
                        // 不能伤害自己
                        // if (v.id === arrow.fromPlayerId) {
                        //     return false;
                        // }

                        return (v.pos.x - arrow.targetPos.x) * (v.pos.x - arrow.targetPos.x) + (v.pos.y - arrow.targetPos.y) * (v.pos.y - arrow.targetPos.y) <= gameConfig.arrowAttackRadius * gameConfig.arrowAttackRadius
                    });
                    damagedPlayers.forEach(p => {
                        // 设置击晕状态
                        p.dizzyEndTime = this._state.now + gameConfig.arrowDizzyTime;

                        // Event
                        this.onDamage.forEach(h => h({
                            fromPlayerId: arrow.fromPlayerId,
                            toPlayerId: p.id
                        }))
                    })
                    this._state.arrows.splice(i, 1);
                }
            }
        }
    }

    // Events (Game Push)
    onDamage: ((e: { fromPlayerId: number, toPlayerId: number }) => void)[] = [];

}

export interface PlayerMove {
    type: 'PlayerMove',
    playerId: number,
    speed: { x: number, y: number },
    // 移动的时间 (秒)
    dt: number,
}
export interface PlayerAttack {
    type: 'PlayerAttack',
    playerId: number,
    offset: { x: number, y: number },
}
export interface PlayerJoin {
    type: 'PlayerJoin',
    playerId: number,
    pos: { x: number, y: number }
}
export interface PlayerLeave {
    type: 'PlayerLeave',
    playerId: number
}
export interface TimePast {
    type: 'TimePast',
    dt: number
}
export type GameSystemInput = PlayerMove | PlayerAttack | PlayerJoin | PlayerLeave | TimePast;