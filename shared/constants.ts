export namespace Constants {
  export const mspt = 50;
  export const steps = 8;

  export const maxPlayerCount = 20;

  export const mapResizeDelay = 2000;
  export const mapSizePerPlayer = 1200;
  export const mapBoundaryForce = 1.5;
  export const mapGridSize = 40;

  export const updateDist = Math.hypot(1920, 1080) * 1.2;

  export const nameLengthLimit = 12;

  export const playerSpeed = 400;
  export const playerDecel = 0.6;
  export const playerRadius = 50;
  export const playerPushRate = 0.3;
  export const playerBounceForce = 400;
  export const playerBounceDamage = 3;
  export const playerMaxHealth = 100;
  export const playerRegen = 5;
  export const playerRespawnTime = 3000;
  export const playerAutoSpinSpeed = 1;
  export const playerCanvasSize = 500;

  export const healthBarSize = playerRadius * 2;
  export const healthBarYOffset = playerRadius + 30;
  export const healthBarThickness = 10;

  export const defaultName = "unknown";

  export const nameYOffset = -Constants.playerRadius - 20;

  export const barrelSize = 85;
  export const barrelShrink = 10;

  export const bulletSpeed = 800;
  export const bulletRadius = 20;
  export const bulletReload = 500;
  export const bulletRecoil = 15;
  export const bulletSpread = 0.05;
  export const bulletMaxDist = 1000;
  export const bulletDamage = 15;

  // export const barrelSize = 95;
  // export const barrelShrink = 10;

  // export const bulletSpeed = 800;
  // export const bulletRadius = 35;
  // export const bulletReload = 1500;
  // export const bulletRecoil = 120;
  // export const bulletSpread = 0.05;
  // export const bulletMaxDist = 1000;
  // export const bulletDamage = 45;

  export const deathAnimationTime = 300;
  export const deathAnimationScaleAdd = 0.5;

  export const groundColor = "#efefef";
  export const gridColor = "#dfdfdf";
  export const borderColor = "#3f3f3f";
  export const textColor = "#efefef";
  export const barrelColor = "#8f8f8f";
  export const selfColor = "#9fff5f";
  export const enemyColor = "#ff4f6f";
  export const flashColor = "#ffffff";

  export const textStyle = "24px Bowlby One";

  export const objectBorder = 5;
  export const healthBorder = 2;
  export const textBorder = 4;

  export const blendRatio = 0.5;
}