<script lang="ts">
  import type { UUID } from "crypto";
  import { Constants } from "@committee-training/shared/constants";
  import { type ClientBullet } from "@committee-training/shared/bullet";
  import { type ClientPlayer } from "@committee-training/shared/player";
  import type { IdSet, SyncedIdSet } from "@committee-training/shared/id-set";

  let {
    pl = $bindable(),
    look = $bindable(),
    mapSize = $bindable(),
    players = $bindable(),
    bullets = $bindable(),
    autospin = $bindable(false),
    canvas = $bindable()!,
  }: {
    pl?: ClientPlayer,
    look: number,
    mapSize: number,
    players: SyncedIdSet<ClientPlayer>,
    bullets: SyncedIdSet<ClientBullet>,
    autospin: boolean,
    canvas?: HTMLCanvasElement
  } = $props();

  let ctx = $derived(canvas.getContext("2d"))!;

  function lerp(target: number, origin: number, t: number) {
    return origin + (target - origin) * t;
  }

  function lerpRad(target: number, origin: number, t: number) {
    let diff = (target - origin) % (2 * Math.PI);
    diff = ((diff + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
    return origin + diff * t;
  }

  function blendColor(hex1: string, hex2: string, blendRatio = 0.5) {
    const r1 = Number.parseInt(hex1.substring(1, 3), 16);
    const g1 = Number.parseInt(hex1.substring(3, 5), 16);
    const b1 = Number.parseInt(hex1.substring(5, 7), 16);

    const r2 = Number.parseInt(hex2.substring(1, 3), 16);
    const g2 = Number.parseInt(hex2.substring(3, 5), 16);
    const b2 = Number.parseInt(hex2.substring(5, 7), 16);

    const r = Math.round(lerp(r1, r2, blendRatio)).toString(16).padStart(2, "0");
    const g = Math.round(lerp(g1, g2, blendRatio)).toString(16).padStart(2, "0");
    const b = Math.round(lerp(b1, b2, blendRatio)).toString(16).padStart(2, "0");

    return `#${r}${g}${b}`;
  }

  function setObjectFillAndStroke(id: number, flash = 0, targetCtx = ctx) {
    let color = pl && id === pl.id ? Constants.selfColor : Constants.enemyColor;
    if (flash) color = blendColor(Constants.flashColor, color, flash);
    targetCtx.fillStyle = color;
    targetCtx.strokeStyle = blendColor(color, Constants.borderColor, Constants.blendRatio);
  }

  let cam = {
    x: 0,
    y: 0
  };

  let renderMapSize = mapSize;

  let plCanvas!: HTMLCanvasElement;
  let plCtx!: CanvasRenderingContext2D;

  $effect(() => {
    plCanvas = document.createElement("canvas");
    plCtx = plCanvas.getContext("2d")!;
    plCanvas.width = plCanvas.height = Constants.playerCanvasSize;
  });

  function render(delta: number) {
    let decayRate = 1 - Math.exp(-0.02 * delta);

    renderMapSize = lerp(mapSize, renderMapSize, decayRate);

    for (let p of players) {
      if (p.interpolate) {
        p.render.x = lerp(p.x, p.last.x, p.delta / Constants.mspt);
        p.render.y = lerp(p.y, p.last.y, p.delta / Constants.mspt);

        p.renderHealth = lerp(p.health, p.renderHealth, decayRate);
        p.barrelShrink = lerp(0, p.barrelShrink, decayRate);
        p.flash = lerp(0, p.flash, decayRate);
      }
      else {
        p.render.x = p.last.x = p.x;
        p.render.y = p.last.y = p.y;

        p.renderHealth = p.health;
        p.flash = 0;
      }

      if (p.visible) {
        p.renderLook = lerpRad(p.look, p.lastLook, p.delta / Constants.mspt);
        p.deathAnimation = 0;

        if (pl && p.id === pl.id) {
          if (!autospin) {
            p.renderLook = look;
          }

          cam = {
            x: p.render.x - canvas.width / 2,
            y: p.render.y - canvas.height / 2
          };
        }
      } 
      else {
        if (p.deathAnimation < Constants.deathAnimationTime) {
          p.deathAnimation += delta;
        }
      }

      p.delta += delta;
    }

    for (let b of bullets) {
      if (!b.alive) {
        b.deathAnimation += delta;
        if (b.deathAnimation >= Constants.deathAnimationTime) {
          bullets.release(b.id);
          continue;
        }
      }

      let ratio = Constants.bulletSpeed * delta / 1000;
      b.x += b.motion.x * ratio;
      b.y += b.motion.y * ratio;
    }

    ctx.fillStyle = Constants.groundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();

    ctx.translate(-cam.x, -cam.y);

    ctx.beginPath();
    for (let gx = Math.floor(cam.x / Constants.mapGridSize); gx <= Math.floor((cam.x + canvas.width) / Constants.mapGridSize); ++gx) {
      let x = gx * Constants.mapGridSize;
      ctx.moveTo(x, cam.y);
      ctx.lineTo(x, cam.y + canvas.height);
    }
    for (let gy = Math.floor(cam.y / Constants.mapGridSize); gy <= Math.floor((cam.y + canvas.height) / Constants.mapGridSize); ++gy) {
      let y = gy * Constants.mapGridSize;
      ctx.moveTo(cam.x, y);
      ctx.lineTo(cam.x + canvas.width, y);
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = Constants.gridColor;
    ctx.stroke();

    ctx.globalAlpha = 0.1;
    ctx.fillStyle = Constants.borderColor;
    const mapLeft = -renderMapSize, mapRight = renderMapSize, mapTop = -renderMapSize, mapBottom = renderMapSize;
    const mapInnerX = Math.max(mapLeft, cam.x), mapInnerWidth = Math.min(mapRight, cam.x + canvas.width) - mapInnerX;
    if (cam.x < mapLeft) {
      ctx.fillRect(cam.x, cam.y, mapLeft - cam.x, canvas.height);
    }
    if (cam.x + canvas.width > mapRight) {
      ctx.fillRect(mapRight, cam.y, (cam.x + canvas.width) - mapRight, canvas.height);
    }
    if (cam.y < mapTop) {
      ctx.fillRect(mapInnerX, cam.y, mapInnerWidth, mapTop - cam.y);
    }
    if (cam.y + canvas.height > mapBottom) {
      ctx.fillRect(mapInnerX, mapBottom, mapInnerWidth, (cam.y + canvas.height) - mapBottom);
    }
    ctx.globalAlpha = 1;

    if (!pl) {
      ctx.restore();
      return;
    }

    for (let b of bullets) {
      ctx.save();

      ctx.lineWidth = Constants.objectBorder;

      ctx.translate(b.x, b.y);

      if (!b.alive) {
        let ratio = b.deathAnimation / Constants.deathAnimationTime;
        ctx.globalAlpha = 1 - ratio;

        let scale = 1 + Constants.deathAnimationScaleAdd * ratio;
        ctx.scale(scale, scale);
      }
      
      ctx.beginPath();
      ctx.arc(0, 0, Constants.bulletRadius, 0, 2 * Math.PI);
      setObjectFillAndStroke(b.owner);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    for (let p of players) {
      if (!p.visible && p.deathAnimation >= Constants.deathAnimationTime) continue;

      plCtx.clearRect(0, 0, plCanvas.width, plCanvas.height);

      plCtx.save();

      plCtx.lineJoin = "round";

      plCtx.translate(plCanvas.width / 2, plCanvas.height / 2);
      
      plCtx.save();

      plCtx.rotate(p.renderLook);
      
      plCtx.lineWidth = Constants.objectBorder;
      
      plCtx.fillStyle = Constants.barrelColor;
      plCtx.strokeStyle = blendColor(Constants.barrelColor, Constants.borderColor, Constants.blendRatio);
      for (let method of ["fillRect", "strokeRect"] as const)
        plCtx[method](0, -Constants.bulletRadius, Constants.barrelSize - p.barrelShrink, Constants.bulletRadius * 2);

      setObjectFillAndStroke(p.id, p.flash, plCtx);
      plCtx.beginPath();
      plCtx.arc(0, 0, Constants.playerRadius, 0, 2 * Math.PI);
      plCtx.fill();
      plCtx.stroke();

      plCtx.restore();

      plCtx.lineWidth = Constants.textBorder * 2;

      plCtx.font = Constants.textStyle;
      let nameSize = plCtx.measureText(p.name);
      plCtx.fillStyle = Constants.textColor;
      plCtx.strokeStyle = Constants.borderColor;
      for (let method of ["strokeText", "fillText"] as const)
        plCtx[method](p.name, -nameSize.width / 2, Constants.nameYOffset);

      if (p.health < Constants.playerMaxHealth) {
        plCtx.lineWidth = Constants.healthBorder;

        plCtx.beginPath();
        plCtx.roundRect(
          -Constants.healthBarSize / 2, 
          Constants.healthBarYOffset, 
          Constants.healthBarSize,
          Constants.healthBarThickness,
          Constants.healthBarThickness / 2
        );
        plCtx.fillStyle = Constants.barrelColor;
        plCtx.fill();
        
        plCtx.beginPath();
        plCtx.roundRect(
          -Constants.healthBarSize / 2, 
          Constants.healthBarYOffset, 
          Constants.healthBarSize * p.renderHealth / Constants.playerMaxHealth,
          Constants.healthBarThickness,
          Constants.healthBarThickness / 2
        );
        plCtx.fillStyle = p.id === pl.id ? Constants.selfColor : Constants.enemyColor;
        plCtx.fill();
        plCtx.beginPath();
        plCtx.roundRect(
          -Constants.healthBarSize / 2, 
          Constants.healthBarYOffset, 
          Constants.healthBarSize,
          Constants.healthBarThickness,
          Constants.healthBarThickness / 2
        );
        plCtx.strokeStyle = Constants.borderColor;
        plCtx.stroke();
      }

      plCtx.restore();

      ctx.save();

      ctx.translate(p.render.x, p.render.y);
      
      if (!p.visible) {
        let ratio = p.deathAnimation / Constants.deathAnimationTime;
        ctx.globalAlpha = 1 - ratio;

        let scale = 1 + Constants.deathAnimationScaleAdd * ratio;
        ctx.scale(scale, scale);
      }

      ctx.drawImage(
        plCanvas,
        -plCanvas.width / 2,
        -plCanvas.height / 2
      );

      ctx.restore();
    }

    ctx.restore();
  }

  $effect(() => {
    if (!canvas) return;

    canvas.width = 1920;
    canvas.height = 1080;

    cam = {
      x: -canvas.width / 2,
      y: -canvas.height / 2
    };

    let frame: number;
    let last = 0;
    function runFrame(now: number) {
      let delta = now - last;
      last = now;

      render(delta);

      frame = requestAnimationFrame(runFrame);
    }

    frame = requestAnimationFrame(runFrame);
    return () => cancelAnimationFrame(frame);
  });
</script>

<div class="wrapper">
  <canvas bind:this={canvas}></canvas>
</div>

<style lang="postcss">
  @reference "layout.css";

  .wrapper {
    @apply w-dvw h-dvh overflow-hidden;
  }
  
  canvas {
    @apply size-full object-cover;
  }
</style>