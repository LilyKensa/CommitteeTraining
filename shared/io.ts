import { PlayerPort } from "./player";
import { BulletPort } from "./bullet";

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
  [S2CPacket.AssignId]: [number];
  [S2CPacket.Spawn]: [];
  [S2CPacket.Kill]: [];
  [S2CPacket.FlashPlayer]: [number];
  [S2CPacket.RemovePlayer]: [number];
  [S2CPacket.UpdatePlayers]: [number, PlayerPort.FlattenPlayer][];
  [S2CPacket.AddBullet]: BulletPort.FlattenBullet;
  [S2CPacket.RemoveBullet]: [number];
  [S2CPacket.SetMapSize]: [number];
}

export type S2CPacketHandler<P extends S2CPacket> = (...args: S2CPacketParams[P]) => void;