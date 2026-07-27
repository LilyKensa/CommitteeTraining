import { WebSocket } from "ws";
import { Vec } from "./vec";

export interface Player extends Vec {
  id: number;
  name: string;
  look: number;
  health: number;
  bulletCooldown: number;
}

export interface ServerPlayer extends Player {
  ws: WebSocket;
  // sentTo: Set<UUID>;
  walk: {
    x: number;
    y: number;
  }
  motion: {
    x: number;
    y: number;
  };
  alive: boolean;
  firing: boolean;
  autofire: boolean;
  autospin: boolean;
  deathTime: number;
}

export interface ClientPlayer extends Player {
  visible: boolean;
  interpolate: boolean;
  delta: number;
  last: {
    x: number;
    y: number;
  }
  render: {
    x: number;
    y: number;
  };
  lastLook: number;
  renderLook: number;
  renderHealth: number;
  barrelShrink: number;
  flash: number;
  deathAnimation: number;
}

export namespace PlayerPort {
  export type FlattenPlayer = [
    ServerPlayer["name"],
    ServerPlayer["x"],
    ServerPlayer["y"],
    ServerPlayer["look"],
    ServerPlayer["health"]
  ];

  export function flattenPlayerData(p: ServerPlayer): FlattenPlayer {
    return [p.name, p.x, p.y, p.look, p.health];
  }

  export function createPlayer(id: number, data: FlattenPlayer): ClientPlayer {
    let [name, x, y, look, health] = data;
    return {
      id, name, x, y, health,
      last: { x, y },
      render: { x, y },
      look: look,
      lastLook: look,
      renderLook: look,
      visible: true,
      interpolate: true,
      delta: 0,
      bulletCooldown: 0,
      barrelShrink: 0,
      renderHealth: health,
      flash: 0,
      deathAnimation: 0
    };
  }

  export function assignPlayerData(p: ClientPlayer, data: FlattenPlayer) {
    let [name, x, y, look, health] = data;
    p.name = name;
    p.health = health;

    p.last.x = p.x;
    p.last.y = p.y;
    p.x = x;
    p.y = y;

    p.lastLook = p.look;
    p.look = look;

    p.delta = 0;
  }
}