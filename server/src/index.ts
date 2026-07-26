// server/src/index.ts
import { C2SPacket, C2SPacketParams, Config, Constants, flattenBullet, flattenPlayerData, S2CPacket, S2CPacketParams, ServerBullet, ServerPlayer, Vec } from "@committee-training/shared";
import express from "express";
import * as msgpack from "@msgpack/msgpack";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { UUID } from "crypto";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

const server = createServer(app);
const wss = new WebSocketServer({ server });

const players = new Map<UUID, ServerPlayer>();
const bullets = new Map<UUID, ServerBullet>();

function send<P extends S2CPacket>(pl: ServerPlayer, code: P, ...params: S2CPacketParams[P]) {
  pl.ws.send(msgpack.encode([code, ...params]));
}

function broadcastExclude<P extends S2CPacket>(pl: ServerPlayer | null, code: P, ...params: S2CPacketParams[P]) {
  for (let p of players.values()) {
    if (pl && p === pl) continue;
    send(p, code, ...params);
  }
}

function broadcast<P extends S2CPacket>(code: P, ...params: S2CPacketParams[P]) {
  broadcastExclude(null, code, ...params);
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

    if (!name || typeof name !== "string") name = Constants.defaultName;
    name = name.replace(/[^a-zA-Z0-9\!\?\#\$\^\*\.\,\:\;\<\>\(\)\-\+\_\/\ ]/g, "").slice(0, Constants.nameLengthLimit);
    if (!name) name = Constants.defaultName;

    pl.alive = true;
    pl.name = name;
    pl.health = Constants.playerMaxHealth;
    pl.x = Math.random() * Constants.mapWidth;
    pl.y = Math.random() * Constants.mapHeight;
    pl.motion.x = 0;
    pl.motion.y = 0;
    pl.bulletCooldown = 0;

    send(pl, S2CPacket.Spawn);
  },
  [C2SPacket.SetAutoFire](pl, autofire) {
    pl.autofire = !!autofire;
  }
};

function enforceBound(p: ServerPlayer) {
  const minX = 0;
  const minY = 0;
  const maxX = Constants.mapWidth;
  const maxY = Constants.mapHeight;

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
  let alivePlayers = [...players.values()].filter(p => p.alive);

  for (let p of alivePlayers) {
    let ratio = Constants.playerSpeed * Constants.mspt / 1000;
    p.motion.x += p.walk.x * ratio;
    p.motion.y += p.walk.y * ratio;

    p.motion.x *= Constants.playerDecel;
    p.motion.y *= Constants.playerDecel;

    p.x += p.motion.x;
    p.y += p.motion.y;

    if (p.bulletCooldown > 0) {
      p.bulletCooldown -= Constants.mspt;
    }
    else if (p.firing || p.autofire) {
      p.bulletCooldown = Constants.bulletReload;

      let angle = p.look - Constants.bulletSpread + Math.random() * Constants.bulletSpread * 2;
      let dx = Math.cos(angle), dy = Math.sin(angle);
      p.motion.x -= dx * Constants.bulletRecoil;
      p.motion.y -= dy * Constants.bulletRecoil;

      let id = crypto.randomUUID();
      let bullet = {
        id,
        owner: p.id,
        x: p.x,
        y: p.y,
        motion: {
          x: dx,
          y: dy
        },
        dist: 0
      } satisfies ServerBullet;
      bullets.set(id, bullet);

      broadcast(S2CPacket.AddBullet, ...flattenBullet(bullet));
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

  bulletsLoop: for (let b of bullets.values()) {
    let ratio = Constants.bulletSpeed * Constants.mspt / 1000;
    for (let i = 0; i < Constants.steps; ++i) {
      let dx = b.motion.x * ratio / Constants.steps, dy = b.motion.y * ratio / Constants.steps;
      b.x += dx;
      b.y += dy;
      b.dist += Math.hypot(dx, dy);

      for (let p of players.values()) {
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

          bullets.delete(b.id);
          broadcast(S2CPacket.RemoveBullet, b.id);

          continue bulletsLoop;
        }
      }
    }

    if (b.dist > Constants.bulletMaxDist) {
      bullets.delete(b.id);
      broadcast(S2CPacket.RemoveBullet, b.id);
    }
  }

  for (let p of players.values()) {
    if (!p.alive) continue;

    if (p.health <= 0) {
      p.alive = false;
      p.walk.x = 0;
      p.walk.y = 0;
      p.motion.x = 0;
      p.motion.y = 0;
      send(p, S2CPacket.Kill);
    }
  }

  for (let p of players.values()) {
    let playersFlatten: any[] = [];
    for (let q of players.values()) {
      if (!q.alive) continue;
      if (Math.hypot(p.x - q.x, p.y - q.y) <= Constants.updateDist) {
        playersFlatten.push([q.id, flattenPlayerData(q)]);
      }
    }
    send(p, S2CPacket.UpdatePlayers, ...playersFlatten);
  }
}

wss.on("connection", (ws: WebSocket) => {
  let id = crypto.randomUUID();
  let pl = {
    ws,
    id,
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
    health: 0,
    bulletCooldown: 0
  };
  players.set(id, pl);

  send(pl, S2CPacket.AssignId, id);
  console.log("[+]", players.size, "players online");

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
    players.delete(id);
    broadcast(S2CPacket.RemovePlayer, id);
    console.log("[-]", players.size, "players left");
  });
});

server.listen(Config.backendPort, () => {
  console.log(`WebSocket server running on ws://localhost:${Config.backendPort}`);
});

setInterval(tick, Constants.mspt);