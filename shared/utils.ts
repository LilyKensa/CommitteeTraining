import { Constants } from "./constants";

export namespace Utils {
  export function calculateMapSize(count: number) {
    return Math.ceil(Math.sqrt(Math.max(count, 1)) * Constants.mapSizePerPlayer / 2 / Constants.gridSize) * Constants.gridSize;
  }
}
