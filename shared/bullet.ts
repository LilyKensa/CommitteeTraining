import { Vec } from "./vec";

export interface Bullet extends Vec {
  id: number;
  owner: number;
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

export namespace BulletPort {
  export type FlattenBullet = [
    ServerBullet["id"], 
    ServerBullet["owner"], 
    ServerBullet["x"], 
    ServerBullet["y"], 
    ServerBullet["motion"]["x"], 
    ServerBullet["motion"]["y"], 
  ];

  export function flattenBullet(b: ServerBullet): FlattenBullet {
    return [b.id, b.owner, b.x, b.y, b.motion.x, b.motion.y];
  }

  export function createBullet(data: FlattenBullet): ClientBullet {
    let [id, owner, x, y, motionX, motionY] = data;
    return {
      id, owner, x, y,
      motion: {
        x: motionX,
        y: motionY
      },
      alive: true,
      deathAnimation: 0
    };
  }
}
