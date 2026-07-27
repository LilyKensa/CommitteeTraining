import express from "express";
import * as msgpack from "@msgpack/msgpack";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { UUID } from "crypto";
import { Utils } from "@committee-training/shared/utils";
import { PlayerPort, ServerPlayer } from "@committee-training/shared/player";
import { BulletPort, ServerBullet } from "@committee-training/shared/bullet";
import { C2SPacket, C2SPacketParams, S2CPacket, S2CPacketParams } from "@committee-training/shared/io";
import { Constants } from "@committee-training/shared/constants";
import { Config } from "@committee-training/shared/config";
import { IdSet } from "@committee-training/shared/id-set";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

const server = createServer(app);
const wss = new WebSocketServer({ server });

const players = new IdSet<ServerPlayer>();
const bullets = new IdSet<ServerBullet>();

function send<P extends S2CPacket>(pl: ServerPlayer, code: P, ...params: S2CPacketParams[P]) {
  pl.ws.send(msgpack.encode([code, ...params]));
}

function broadcastExclude<P extends S2CPacket>(pl: ServerPlayer | null, code: P, ...params: S2CPacketParams[P]) {
  for (let p of players) {
    if (pl && p === pl) continue;
    send(p, code, ...params);
  }
}

function broadcast<P extends S2CPacket>(code: P, ...params: S2CPacketParams[P]) {
  broadcastExclude(null, code, ...params);
}

let mapSize = Utils.calculateMapSize(1);
let mapResizeTimeout: NodeJS.Timeout;

function resizeMap() {
  clearTimeout(mapResizeTimeout);
  let size = Utils.calculateMapSize(players.length);
  if (mapSize !== size) {
    mapResizeTimeout = setTimeout(() => {
      mapSize = size;
      broadcast(S2CPacket.SetMapSize, mapSize);
    }, Constants.mapResizeDelay);
  }
}

function isValidNumber(n: number) {
  return typeof n === "number" && Number.isFinite(n);
}

function validateUnitVector(x: number, y: number) {
  if (!isValidNumber(x) || !isValidNumber(y)) return null;
  let len = Math.hypot(x, y);
  if (len < 0.001) return {
    x: 0,
    y: 0
  };

  x /= len;
  y /= len;
  return { x, y };
}

const handlers: {
  [P in C2SPacket]: (pl: ServerPlayer, ...args: C2SPacketParams[P]) => void
} = {
  [C2SPacket.SetMotion](pl, dx: number, dy: number) {
    if (!pl.alive) return;
    let walk = validateUnitVector(dx, dy);
    if (!walk) return;

    pl.walk.x = walk.x;
    pl.walk.y = walk.y;
  },
  [C2SPacket.SetLook](pl, look: number) {
    if (!pl.alive) return;
    if (!isValidNumber(look)) return;

    pl.look = (look % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  },
  [C2SPacket.FireBullet](pl) {
    if (!pl.alive) return;
    pl.firing = true;
  },
  [C2SPacket.Join](pl, name) {
    if (pl.alive) return;
    if (Date.now() - pl.deathTime < Constants.playerRespawnTime) return;

    if ([...players].filter(p => p.alive).length >= Constants.maxPlayerCount) return;

    if (!name || typeof name !== "string") name = Constants.defaultName;
    name = name.replace(/[^a-zA-Z0-9\!\?\#\$\^\*\.\,\:\;\<\>\(\)\-\+\_\/\ ]/g, "").slice(0, Constants.nameLengthLimit);
    if (!name) name = Constants.defaultName;

    pl.alive = true;
    pl.name = name;
    pl.health = Constants.playerMaxHealth;
    pl.x = Math.random() * mapSize;
    pl.y = Math.random() * mapSize;
    pl.motion.x = 0;
    pl.motion.y = 0;
    pl.bulletCooldown = 0;

    send(pl, S2CPacket.Spawn);
  },
  [C2SPacket.SetAutoFire](pl, autofire) {
    pl.autofire = !!autofire;
  },
  [C2SPacket.SetAutoSpin](pl, autospin) {
    pl.autospin = !!autospin;
  }
};

function enforceBound(p: ServerPlayer) {
  const minX = -mapSize;
  const minY = -mapSize;
  const maxX = mapSize;
  const maxY = mapSize;

  const pushForce = Constants.mapBoundaryForce * Constants.mspt / 1000; 

  if (p.x < minX) {
    const depth = minX - p.x;
    p.motion.x += depth * pushForce;
  } else if (p.x > maxX) {
    const depth = p.x - maxX;
    p.motion.x -= depth * pushForce;
  }

  if (p.y < minY) {
    const depth = minY - p.y;
    p.motion.y += depth * pushForce;
  } else if (p.y > maxY) {
    const depth = p.y - maxY;
    p.motion.y -= depth * pushForce;
  }
}

function tick() {
  let alivePlayers = [...players].filter(p => p.alive);

  for (let p of alivePlayers) {
    let ratio = Constants.playerSpeed * Constants.mspt / 1000;
    p.motion.x += p.walk.x * ratio;
    p.motion.y += p.walk.y * ratio;

    p.motion.x *= Constants.playerDecel;
    p.motion.y *= Constants.playerDecel;

    p.x += p.motion.x;
    p.y += p.motion.y;

    if (p.autospin) {
      p.look += Constants.playerAutoSpinSpeed * Constants.mspt / 1000;
      p.look %= 2 * Math.PI;
    }

    if (p.bulletCooldown > 0) {
      p.bulletCooldown -= Constants.mspt;
    }
    else if (p.firing || p.autofire) {
      p.bulletCooldown = Constants.bulletReload;

      let angle = p.look - Constants.bulletSpread + Math.random() * Constants.bulletSpread * 2;
      let dx = Math.cos(angle), dy = Math.sin(angle);
      p.motion.x -= dx * Constants.bulletRecoil;
      p.motion.y -= dy * Constants.bulletRecoil;

      let bullet = {
        id: -1,
        owner: p.id,
        x: p.x,
        y: p.y,
        motion: {
          x: dx,
          y: dy
        },
        dist: 0
      } satisfies ServerBullet;
      let id = bullets.add(bullet);
      bullet.id = id;

      broadcast(S2CPacket.AddBullet, ...BulletPort.flattenBullet(bullet));
    }
    p.firing = false;

    p.health += Constants.playerRegen * Constants.mspt / 1000;
    if (p.health > Constants.playerMaxHealth) {
      p.health = Constants.playerMaxHealth;
    }
  }

  for (let i = 0; i < alivePlayers.length; ++i) {
    let p = alivePlayers[i];
    for (let j = i + 1; j < alivePlayers.length; ++j) {
      let q = alivePlayers[j];

      let dx = p.x - q.x;
      let dy = p.y - q.y;

      let bound = Constants.playerSize * 2;
      if (Math.abs(dx) > bound || Math.abs(dy) > bound) continue;

      let dist = Math.hypot(dx, dy);
      let clip = bound - dist;
      if (clip <= 0) continue;

      let nx = dist ? dx / dist : 1, ny = dist ? dy / dist : 0;
      let sep = clip * Constants.playerPushRate;
      p.x += nx * sep;
      p.y += ny * sep;
      q.x -= nx * sep;
      q.y -= ny * sep;

      let bounce = Constants.playerBounceForce * Constants.mspt / 1000;
      p.motion.x += nx * bounce;
      p.motion.y += ny * bounce;
      q.motion.x -= nx * bounce;
      q.motion.y -= ny * bounce;

      p.health -= Constants.playerBounceDamage;
      q.health -= Constants.playerBounceDamage;
      broadcast(S2CPacket.FlashPlayer, p.id);
      broadcast(S2CPacket.FlashPlayer, q.id);
    }
  }

  for (let p of alivePlayers) {
    enforceBound(p);
  }

  bulletsLoop: for (let b of bullets) {
    let ratio = Constants.bulletSpeed * Constants.mspt / 1000;
    for (let i = 0; i < Constants.steps; ++i) {
      let dx = b.motion.x * ratio / Constants.steps, dy = b.motion.y * ratio / Constants.steps;
      b.x += dx;
      b.y += dy;
      b.dist += Math.hypot(dx, dy);

      for (let p of players) {
        if (!p.alive) continue;
        if (p.id === b.owner) continue;

        let ox = p.x - b.x, oy = p.y - b.y;
        let dist = Math.hypot(ox, oy);
        if (dist <= Constants.playerSize + Constants.bulletSize) {
          let sx = b.motion.x, sy = b.motion.y;
          let sd = Math.hypot(sx, sy);
          let dot = sx / sd * ox / dist + sy / sd * oy / dist;

          p.health -= Constants.bulletDamage * dot;
          broadcast(S2CPacket.FlashPlayer, p.id);

          bullets.release(b.id);
          broadcast(S2CPacket.RemoveBullet, b.id);

          continue bulletsLoop;
        }
      }
    }

    if (b.dist > Constants.bulletMaxDist) {
      bullets.release(b.id);
      broadcast(S2CPacket.RemoveBullet, b.id);
    }
  }

  for (let p of players) {
    if (!p.alive) continue;

    if (p.health <= 0) {
      p.alive = false;
      p.deathTime = Date.now();
      p.walk.x = 0;
      p.walk.y = 0;
      p.motion.x = 0;
      p.motion.y = 0;
      send(p, S2CPacket.Kill);
    }
  }

  for (let p of players) {
    let playersFlatten: any[] = [];
    for (let q of players) {
      if (!q.alive) continue;
      if (Math.hypot(p.x - q.x, p.y - q.y) <= Constants.updateDist) {
        playersFlatten.push([q.id, PlayerPort.flattenPlayerData(q)]);
      }
    }
    send(p, S2CPacket.UpdatePlayers, ...playersFlatten);
  }
}

wss.on("connection", (ws: WebSocket) => {
  let pl = {
    ws,
    id: -1,
    name: Constants.defaultName,
    x: 0,
    y: 0,
    walk: {
      x: 0,
      y: 0
    },
    motion: {
      x: 0,
      y: 0
    },
    look: 0,
    alive: false,
    firing: false,
    autofire: false,
    autospin: false,
    lastLook: 0,
    deathTime: -Constants.playerRespawnTime,
    health: 0,
    bulletCooldown: 0
  };
  let id = players.add(pl);
  pl.id = id;

  send(pl, S2CPacket.AssignId, id);
  send(pl, S2CPacket.SetMapSize, mapSize);
  console.log("[+]", players.length, "players online");

  resizeMap();

  ws.on("message", <P extends C2SPacket>(data: Buffer) => {
    if (!(data instanceof Buffer)) return;
    let code: P, params: C2SPacketParams[P];
    try {
      let [rawCode, ...rawParams] = msgpack.decode(new Uint8Array(data)) as any[];
      if (!rawCode || typeof rawCode !== "string") return;
      code = rawCode as P;
      params = rawParams as C2SPacketParams[P];
    } 
    catch (err) {
      console.error(err);
      return;
    }

    if (!Object.hasOwn(handlers, code)) return;
    handlers[code].call(null, pl, ...params);
  });

  ws.on("close", () => {
    players.release(id);

    for (let b of bullets) {
      if (b.owner === id) {
        bullets.release(b.id);
      }
    }

    broadcast(S2CPacket.RemovePlayer, id);
    console.log("[-]", players.length, "players left");

    resizeMap();
  });
});

server.listen(Config.backendPort, () => {
  console.log(`WebSocket server running on ws://localhost:${Config.backendPort}`);
});

setInterval(tick, Constants.mspt);