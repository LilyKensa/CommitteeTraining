<!-- client/src/routes/+page.svelte -->
<script lang="ts">
  import { onMount } from "svelte";

  import * as msgpack from "@msgpack/msgpack";

  import Menu from "./Menu.svelte";
  import Canvas from "./Canvas.svelte";
  import Input from "./Input.svelte";

  import { PlayerPort, type ClientPlayer } from "@committee-training/shared/player";
  import { Utils } from "@committee-training/shared/utils";
  import { Constants } from "@committee-training/shared/constants";
  import { Config } from "@committee-training/shared/config";
  import { IdSet, SyncedIdSet } from "@committee-training/shared/id-set";
  import { S2CPacket, type S2CPacketParams, C2SPacket, type C2SPacketParams } from "@committee-training/shared/io";
  import { BulletPort, type ClientBullet } from "@committee-training/shared/bullet";

  let selfId = $state<number>();
  let pl = $state<ClientPlayer>();
  let inGame = $state(false);
  let mapSize = $state(Utils.calculateMapSize(Constants.maxPlayerCount));
  let respawnTime = $state(0);

  let players = $state(new SyncedIdSet<ClientPlayer>());
  let bullets = $state(new SyncedIdSet<ClientBullet>());

  let motion = $state({
    x: 0,
    y: 0,
  });
  let look = $state(0);
  let sent = $state({
    motion: {
      x: 0,
      y: 0
    },
    look: 0,
    autofire: false,
    autospin: false
  });
  let clicking = $state(false);
  let autofire = $state(false);
  let autospin = $state(false);

  let ws = $state.raw<WebSocket>();

  function send<P extends C2SPacket>(code: P, ...params: C2SPacketParams[P]) {
    if (!ws) return;
    ws.send(msgpack.encode([code, ...params]));
  }

  const handlers: {
    [P in S2CPacket]: (...args: S2CPacketParams[P]) => void
  } = {
    [S2CPacket.AssignId](id: number) {
      selfId = id;
    },
    [S2CPacket.Spawn]() {
      inGame = true;
      if (!pl) return;

      pl.bulletCooldown = 0;
    },
    [S2CPacket.Kill]() {
      inGame = false;
      respawnTime = Date.now() + Constants.playerRespawnTime;
    },
    [S2CPacket.AddBullet](...data) {
      let b = BulletPort.createBullet(data);
      bullets.set(b.id, b);

      let p = players.get(b.owner);
      if (!p) return;
      p.barrelShrink = Constants.barrelShrink;
    },
    [S2CPacket.RemoveBullet](id) {
      let b = bullets.get(id);
      if (!b) return;
      b.alive = false;
    },
    [S2CPacket.FlashPlayer](id) {
      let p = players.get(id);
      if (!p) return;
      p.flash = 1;
    },
    [S2CPacket.RemovePlayer](id) {
      players.release(id);
    },
    [S2CPacket.UpdatePlayers](...arr) {
      for (let p of players) {
        p.interpolate = p.visible;
        p.visible = false;
      }

      for (let [id, data] of arr) {
        let p = players.get(id);
        if (p) {
          PlayerPort.assignPlayerData(p, data);
        } 
        else {
          p = PlayerPort.createPlayer(id, data);
          players.set(id, p);
        }

        p.visible = true;
        if (p.id === selfId) pl = p;
      }

      if (inGame && pl) {
        if (motion.x !== sent.motion.x || motion.y !== sent.motion.y) {
          send(C2SPacket.SetMotion, motion.x, motion.y);
          sent.motion.x = motion.x;
          sent.motion.y = motion.y;
        }
        if (look !== sent.look && !autospin) {
          send(C2SPacket.SetLook, look);
          sent.look = look;
        }

        if (pl.bulletCooldown > 0) {
          pl.bulletCooldown -= Constants.mspt;
        } 
        else if (clicking && !autofire) {
          send(C2SPacket.FireBullet);
          pl.bulletCooldown = Constants.bulletReload;
        }
      }
    },
    [S2CPacket.SetMapSize](size) {
      mapSize = size;
    }
  };

  $effect(() => {
    if (sent.autofire === autofire) return;
    send(C2SPacket.SetAutoFire, autofire);
    sent.autofire = autofire;
  });

  function syncLook() {
    if (!pl) return;
    pl.lastLook = look;
    pl.renderLook = look;
    send(C2SPacket.SetLook, look);
    sent.look = look;
  }

  $effect(() => {
    if (sent.autospin === autospin) return;
    send(C2SPacket.SetAutoSpin, autospin);
    sent.autospin = autospin;
    syncLook();
  });

  onMount(() => {
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      const socket = new WebSocket(Config.backendUrl);

      socket.addEventListener("open", () => {
        console.log("Opened");
        ws = socket;
      });

      socket.addEventListener("close", () => {
        console.log("Closed");
        inGame = false;

        reconnectTimeout = setTimeout(connect, 5000);
      });

      socket.addEventListener("error", (err) => {
        console.error("Error:", err);
      });

      socket.addEventListener("message", async function <P extends S2CPacket>(ev: MessageEvent) {
        if (!(ev.data instanceof Blob)) return;
        let code: P, params: S2CPacketParams[P];
        try {
          let [rawCode, ...rawParams] = msgpack.decode(
            new Uint8Array(await ev.data.arrayBuffer()),
          ) as unknown[];
          if (!rawCode || typeof rawCode !== "string") return;
          code = rawCode as P;
          params = rawParams as S2CPacketParams[P];
        } catch (err) {
          console.error(err);
          return;
        }

        if (!Object.hasOwn(handlers, code)) return;
        handlers[code].call(null, ...params);
      });
    }

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      ws?.close();
    };
  });

  function joinGame(name: string) {
    send(C2SPacket.Join, name);
  }
</script>

<svelte:head>
  <title>NOT DIEP.IO</title>
</svelte:head>

{#if !inGame}
  <Menu onJoin={joinGame} bind:respawnTime />
{/if}
<Input bind:inGame bind:motion bind:look bind:clicking bind:autofire bind:autospin />
<Canvas bind:pl bind:look bind:autospin bind:mapSize bind:players bind:bullets />
