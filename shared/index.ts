// shared/index.ts
import { type UUID } from "crypto";
import { WebSocket } from "ws";

export namespace Config {
  export const backendPort = 5440;
  export const backendUrl = `wss://huey.ckefgisc.org/not-diep/ws/`;
}

export namespace Constants {
  export const mspt = 50;
  export const steps = 8;

  export const maxPlayerCount = 20;

  export const mapResizeDelay = 2000;
  export const mapAreaPerPlayer = 500 ** 2;
  export const mapBoundaryForce = 1.5;

  export const updateDist = Math.hypot(1920, 1080) * 1.2;

  export const nameLengthLimit = 12;

  export const playerSpeed = 400;
  export const playerDecel = 0.6;
  export const playerSize = 50;
  export const playerPushRate = 0.3;
  export const playerBounceForce = 400;
  export const playerBounceDamage = 5;
  export const playerMaxHealth = 100;
  export const playerRegen = 5;
  export const playerRespawnTime = 3000;
  export const playerAutoSpinSpeed = 1;

  export const healthBarSize = playerSize * 2;
  export const healthBarYOffset = playerSize + 30;
  export const healthBarThickness = 10;


  export const defaultName = "unknown";

  export const nameYOffset = -Constants.playerSize - 20;

  // export const barrelSize = 85;
  // export const barrelShrink = 10;

  // export const bulletSpeed = 800;
  // export const bulletSize = 20;
  // export const bulletReload = 500;
  // export const bulletRecoil = 15;
  // export const bulletSpread = 0.05;
  // export const bulletMaxDist = 1000;
  // export const bulletDamage = 15;

  export const barrelSize = 95;
  export const barrelShrink = 10;

  export const bulletSpeed = 800;
  export const bulletSize = 35;
  export const bulletReload = 1500;
  export const bulletRecoil = 120;
  export const bulletSpread = 0.05;
  export const bulletMaxDist = 1000;
  export const bulletDamage = 45;

  export const gridSize = 40;

  export const deathAnimationTime = 300;
  export const deathAnimationScaleAdd = 0.5;

  export const groundColor = "#efefef";
  export const gridColor = "#dfdfdf";
  export const borderColor = "#3f3f3f";
  export const textColor = "#efefef";
  export const bulletColor = "#8f8f8f";
  export const selfColor = "#9fff5f";
  export const enemyColor = "#ff4f6f";
  export const flashColor = "#ffffff";

  export const textStyle = "32px Bowlby One";

  export const objectBorder = 5;
  export const healthBorder = 2;
  export const textBorder = 4;

  export const blendRatio = 0.5;
}

export function calculateMapSize(count: number) {
  return Math.ceil(Math.sqrt(Math.max(count, 1) * Constants.mapAreaPerPlayer) / Constants.gridSize) * Constants.gridSize;
}

export enum C2SPacket {
  Join = "0",
  SetMotion = "a",
  SetLook = "b",
  FireBullet = "c",
  SetAutoFire = "d",
  SetAutoSpin = "e"
}

export type C2SPacketParams = {
  [C2SPacket.Join]: [string];
  [C2SPacket.SetMotion]: [number, number];
  [C2SPacket.SetLook]: [number];
  [C2SPacket.FireBullet]: [];
  [C2SPacket.SetAutoFire]: [boolean];
  [C2SPacket.SetAutoSpin]: [boolean];
}

export enum S2CPacket {
  AssignId = "v",
  Spawn = "w",
  Kill = "x",
  RemovePlayer = "y",
  FlashPlayer = "z",
  UpdatePlayers = "j",
  AddBullet = "q",
  RemoveBullet = "k",
  SetMapSize = "9"
}

export type S2CPacketParams = {
  [S2CPacket.AssignId]: [UUID];
  [S2CPacket.Spawn]: [];
  [S2CPacket.Kill]: [];
  [S2CPacket.FlashPlayer]: [UUID];
  [S2CPacket.RemovePlayer]: [UUID];
  [S2CPacket.UpdatePlayers]: [UUID, any[]][];
  [S2CPacket.AddBullet]: any[];
  [S2CPacket.RemoveBullet]: [UUID];
  [S2CPacket.SetMapSize]: [number];
}

export type S2CPacketHandler<P extends S2CPacket> = (...args: S2CPacketParams[P]) => void;

export interface Vec {
  x: number;
  y: number;
}

export interface Player extends Vec {
  id: UUID;
  name: string;
  look: number;
  health: number;
  bulletCooldown: number;
}

export interface ServerPlayer extends Player {
  ws: WebSocket;
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
  lastLook: number;
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

export function flattenPlayerData(p: ServerPlayer) {
  return [p.name, p.x, p.y, p.look, p.health];
}

export function createPlayer(id: UUID, data: any[]) {
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
  } satisfies ClientPlayer;
}

export function assignPlayerData(p: ClientPlayer, data: any[]) {
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

export interface Bullet extends Vec {
  id: UUID;
  owner: UUID;
  motion: {
    x: number;
    y: number;
  };
}

export interface ServerBullet extends Bullet {
  dist: number;
}

export interface ClientBullet extends Bullet {
  alive: boolean;
  deathAnimation: number;
}

export function flattenBullet(b: ServerBullet) {
  return [b.id, b.owner, b.x, b.y, b.motion.x, b.motion.y];
}

export function createBullet(data: any[]) {
  let [id, owner, x, y, motionX, motionY] = data;
  return {
    id, owner, x, y,
    motion: {
      x: motionX,
      y: motionY
    },
    alive: true,
    deathAnimation: 0
  } satisfies ClientBullet;
}
