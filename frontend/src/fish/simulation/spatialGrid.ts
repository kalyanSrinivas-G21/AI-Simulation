export interface SpatialItem {
  id: number;
  x: number;
  y: number;
  heading: number;
  speed: number;
}

export class SpatialGrid<T extends SpatialItem> {
  cellSize: number;
  cells: Map<string, T[]>;

  constructor(cellSize: number = 160) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  private key(x: number, y: number): string {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
  }

  clear(): void {
    this.cells.clear();
  }

  rebuild(items: T[]): void {
    this.cells.clear();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const k = this.key(item.x, item.y);
      let list = this.cells.get(k);
      if (!list) {
        list = [];
        this.cells.set(k, list);
      }
      list.push(item);
    }
  }

  /**
   * Query neighbors within radius R of a given position
   */
  queryNeighbors(x: number, y: number, radius: number, excludeId?: number): T[] {
    const results: T[] = [];
    const minCellX = Math.floor((x - radius) / this.cellSize);
    const maxCellX = Math.floor((x + radius) / this.cellSize);
    const minCellY = Math.floor((y - radius) / this.cellSize);
    const maxCellY = Math.floor((y + radius) / this.cellSize);

    const r2 = radius * radius;

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const cell = this.cells.get(`${cx},${cy}`);
        if (!cell) continue;

        for (let i = 0; i < cell.length; i++) {
          const item = cell[i];
          if (excludeId !== undefined && item.id === excludeId) continue;
          const dx = item.x - x;
          const dy = item.y - y;
          if (dx * dx + dy * dy <= r2) {
            results.push(item);
          }
        }
      }
    }
    return results;
  }
}
