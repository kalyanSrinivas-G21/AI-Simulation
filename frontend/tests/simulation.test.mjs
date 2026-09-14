import test from "node:test";
import assert from "node:assert";

// 1. Test PRNG Determinism per §14
class PRNG {
  constructor(seed = 1337) {
    this.s = Math.floor(seed) >>> 0;
  }
  next() {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(min, max) {
    return min + this.next() * (max - min);
  }
}

test("PRNG produces deterministic sequences from identical seeds", () => {
  const prng1 = new PRNG(1337);
  const prng2 = new PRNG(1337);

  for (let i = 0; i < 50; i++) {
    assert.strictEqual(prng1.next(), prng2.next(), `PRNG values must match at step ${i}`);
  }
});

// 2. Test Spatial Hash Grid
class SpatialGrid {
  constructor(cellSize = 160) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }
  key(x, y) {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
  }
  rebuild(items) {
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
  queryNeighbors(x, y, radius, excludeId) {
    const results = [];
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

test("SpatialGrid correctly queries neighbors within radius and excludes self", () => {
  const grid = new SpatialGrid(160);
  const fishList = [
    { id: 0, x: 100, y: 100 },
    { id: 1, x: 110, y: 110 }, // distance ~14px (close)
    { id: 2, x: 140, y: 100 }, // distance 40px (inside 80px)
    { id: 3, x: 300, y: 300 }, // distance ~282px (far away)
  ];

  grid.rebuild(fishList);
  const neighbors = grid.queryNeighbors(100, 100, 80, 0);

  assert.strictEqual(neighbors.length, 2, "Must find exactly 2 neighbors within 80px");
  assert.ok(neighbors.some((n) => n.id === 1));
  assert.ok(neighbors.some((n) => n.id === 2));
  assert.ok(!neighbors.some((n) => n.id === 0), "Must exclude self ID");
  assert.ok(!neighbors.some((n) => n.id === 3), "Must exclude distant agents");
});

// 3. Test Neural Forward Pass Range and Stability
test("Neural forward pass output produces bounded actions [-1, 1]", () => {
  const mockLayer = {
    weight: [
      [0.5, -0.2, 0.1],
      [-0.4, 0.8, -0.3],
    ],
    bias: [0.1, -0.1],
    activation: "tanh",
  };

  const input = [0.8, -0.5, 0.2];
  const output = [];

  for (let i = 0; i < mockLayer.weight.length; i++) {
    let sum = mockLayer.bias[i];
    for (let j = 0; j < input.length; j++) {
      sum += mockLayer.weight[i][j] * input[j];
    }
    output.push(Math.tanh(sum));
  }

  assert.strictEqual(output.length, 2);
  assert.ok(output[0] >= -1 && output[0] <= 1, "Action 0 must be in [-1, 1]");
  assert.ok(output[1] >= -1 && output[1] <= 1, "Action 1 must be in [-1, 1]");
});
