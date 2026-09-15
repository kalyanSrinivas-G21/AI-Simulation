import { Track } from "./Track";
import { Car } from "./Car";
import { TrafficSim } from "./Traffic";
import { RaycastSensors } from "./RaycastSensors";
import { PRNG } from "../../utils/prng";
import { IntelligenceLevel } from "../../design-system/tokens";
import { RandomCarController } from "../controllers/RandomCarController";
import { RuleCarController } from "../controllers/RuleCarController";
import { NeuralCarController } from "../controllers/NeuralCarController";
import { PerfectCarController } from "../controllers/PerfectCarController";

export interface CarMetrics {
  distanceTravelled: number;
  crashCount: number;
  timeToFirstCrash: number | null;
  laneStability: number;
  averageSpeed: number;
  currentSpeed: number;
  successfulAvoidanceRate: number;
  elapsedSeconds: number;
  sensorReadings: number[];
  generation: number;
  bestDistance: number;
}

export class CarSim {
  track: Track;
  car: Car;
  traffic: TrafficSim;
  prng: PRNG;
  seed: number;
  speedMultiplier: number = 1.0;
  level: IntelligenceLevel = 0;
  numCars: number = 8;

  randomCtrl: RandomCarController;
  ruleCtrl: RuleCarController;
  neuralCtrl: NeuralCarController; 
  perfectCtrl: PerfectCarController; 

  currentSensors: number[] = [1, 1, 1, 1, 1];
  avoidanceSuccessCount: number = 0;
  nearMissCount: number = 0;
  elapsedMs: number = 0;
  ticks: number = 0;
  stuckTicks: number = 0;

  generation: number = 1;
  bestDistance: number = 0;
  bestWeights: any = null;

  // PHYSICS STABILITY UPGRADE
  private physicsAccumulator: number = 0;
  private readonly FIXED_DT: number = 1 / 60; // Locked 60Hz Physics Step

  constructor(seed: number = 42) {
    this.seed = seed;
    this.prng = new PRNG(seed);
    
    const straightLen = 30 + this.prng.range(0, 100); 
    const trackRadius = 20 + this.prng.range(0, 50); 
    this.numCars = 2 + Math.floor(this.prng.range(0, 10)); 
    
    this.track = new Track(straightLen, trackRadius);
    this.car = new Car(0, 0, 0);
    this.traffic = new TrafficSim(this.track, this.prng.subsystem(2), this.numCars);

    this.randomCtrl = new RandomCarController();
    this.ruleCtrl = new RuleCarController();
    this.neuralCtrl = new NeuralCarController();
    this.perfectCtrl = new PerfectCarController();

    this.reset(seed);
  }

  setLevel(level: IntelligenceLevel): void {
    this.level = level;
    if (level === 2) {
      this.generation = 1;
      this.bestDistance = 0;
      this.neuralCtrl.initDefaultWeights();
      this.bestWeights = this.neuralCtrl.getWeights();
      this.reset(this.seed);
    }
  }

  setSpeedMultiplier(v: number): void {
    this.speedMultiplier = Math.max(0.25, Math.min(2.5, v));
  }

  resetLearning(): void {
    this.neuralCtrl.initDefaultWeights();
    this.bestWeights = this.neuralCtrl.getWeights();
    this.generation = 1;
    this.bestDistance = 0;
    this.reset(this.seed);
  }

  reset(seed: number = this.seed): void {
    this.seed = seed;
    this.prng = new PRNG(seed);
    
    const startX = 0;
    const startZ = -this.track.trackRadius; 
    const startHeading = 0; 
    
    this.car.reset(startX, startZ, startHeading);
    this.traffic.reset(seed, this.numCars);

    for (let car of this.traffic.cars) {
      car.speed = 30.0 + this.prng.range(0, 20.0);
      const playerDist = this.track.straightLen / 2;
      let randDist = playerDist + 60.0 + this.prng.range(0, this.track.totalLength - 100.0);
      randDist = randDist % this.track.totalLength;
      car.distAlongTrack = randDist;
      
      const randomLane = this.prng.rangeInt(0, 2);
      car.lane = randomLane;
      car.targetLane = randomLane;
      car.currentOffset = (randomLane - 1) * this.track.laneWidth;
    }
    this.traffic.update(0); 

    this.randomCtrl.reset();
    this.ruleCtrl.reset();
    this.perfectCtrl.reset();

    this.avoidanceSuccessCount = 0;
    this.nearMissCount = 0;
    this.elapsedMs = 0;
    this.ticks = 0;
    this.stuckTicks = 0;
    this.physicsAccumulator = 0;
  }

  // ACCUMULATOR LOOP: Ensures physics always run at a reliable speed
  tick(dtMs: number): CarMetrics {
    // Cap maximum frame gap to prevent "death spirals" if tab is minimized
    const dt = Math.min(dtMs / 1000, 0.1); 
    this.elapsedMs += dtMs;
    this.physicsAccumulator += dt;

    while (this.physicsAccumulator >= this.FIXED_DT) {
        this.stepPhysics(this.FIXED_DT);
        this.physicsAccumulator -= this.FIXED_DT;
    }

    return this.getMetrics();
  }

  // The actual physics logic, moved into the fixed step loop
  private stepPhysics(dt: number) {
    this.ticks++;
    
    if (this.car.speed < 0.1) {
      this.stuckTicks++;
    } else {
      this.stuckTicks = 0;
    }
    
    if (this.stuckTicks > 40 && !this.car.isCrashed) {
      this.car.registerCrash(this.elapsedMs);
    }

    const mainCarLoc = this.track.getClosestCenterline(this.car.x, this.car.z);
    this.traffic.update(dt * this.speedMultiplier, mainCarLoc);

    const obstacles = this.traffic.getObstacles();
    this.currentSensors = RaycastSensors.computeReadings(
      this.car.x, this.car.z, this.car.heading, this.track, obstacles
    );

    const minSensor = Math.min(...this.currentSensors);
    if (minSensor < 0.35 && minSensor > 0.1) {
      this.nearMissCount++;
      if (!this.car.isCrashed) this.avoidanceSuccessCount++;
    }

    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      const dist = Math.hypot(obs.x - this.car.x, obs.z - this.car.z);
      if (dist < 2.4) {
        if (!this.car.isCrashed) this.car.registerCrash(this.elapsedMs);
      }
    }

    if (this.level === 2 && this.car.isCrashed) {
      if (this.car.distanceTravelled > this.bestDistance) {
        this.bestDistance = this.car.distanceTravelled;
        this.bestWeights = this.neuralCtrl.getWeights();
        this.neuralCtrl.mutate(0.05); 
      } else {
        if (this.bestWeights) {
          this.neuralCtrl.setWeights(this.bestWeights); 
        }
        this.neuralCtrl.mutate(0.15); 
      }
      this.generation++;
      this.reset(this.seed);
      return;
    }

    const { lateralOffset } = this.track.getClosestCenterline(this.car.x, this.car.z);
    let steer = 0;
    let throttle = 0.5;

    if (this.level === 0) {
      const action = this.randomCtrl.decide();
      steer = action.steer; throttle = action.throttle;
    } else if (this.level === 1) {
      const obs = this.ruleCtrl.observe({ sensors: this.currentSensors, speed: this.car.speed, lateralOffset });
      const action = this.ruleCtrl.decide(obs);
      steer = action.steer; throttle = action.throttle;
      this.car.activeRuleIndex = action.activeRuleIndex;
    } else if (this.level === 2) {
      const obs = this.neuralCtrl.observe({ sensors: this.currentSensors, speed: this.car.speed, lateralOffset });
      const action = this.neuralCtrl.decide(obs);
      steer = action.steer; throttle = action.throttle;
    } else {
      const obs = this.perfectCtrl.observe({ sensors: this.currentSensors, speed: this.car.speed, lateralOffset });
      const action = this.perfectCtrl.decide(obs);
      steer = action.steer; throttle = action.throttle;
    }

    this.car.updatePhysics(throttle, steer, this.track, dt, this.speedMultiplier);
  }

  getMetrics(): CarMetrics {
    const totalEvents = this.nearMissCount + this.car.crashCount;
    const avoidanceRate = totalEvents > 0 ? (this.avoidanceSuccessCount / totalEvents) * 100 : 100;

    return {
      distanceTravelled: Math.round(this.car.distanceTravelled),
      crashCount: this.car.crashCount,
      timeToFirstCrash: this.car.timeToFirstCrash,
      laneStability: this.car.getLaneVariance(),
      averageSpeed: this.car.getAverageSpeed(),
      currentSpeed: parseFloat(this.car.speed.toFixed(2)),
      successfulAvoidanceRate: Math.round(avoidanceRate),
      elapsedSeconds: Math.round(this.elapsedMs / 1000),
      sensorReadings: this.currentSensors,
      generation: this.generation,
      bestDistance: Math.round(this.bestDistance)
    };
  }
}