import type { Body, Vec2 } from "../types";

type Spring = { aId: string; bId: string; restLength: number; stiffness: number };

export class SpringPhysicsEngine {
  private readonly bodies = new Map<string, Body>();
  private readonly springs: Spring[] = [];
  private gravity = 0.003;
  private damping = 0.96;
  private rafId: number | null = null;
  private gravityCenter: { center: Vec2; strength: number } | null = null;

  addBody(body: Body): void {
    this.bodies.set(body.id, { ...body });
  }

  removeBody(id: string): void {
    this.bodies.delete(id);
  }

  addSpring(aId: string, bId: string, restLength: number, stiffness: number): void {
    this.springs.push({ aId, bId, restLength, stiffness });
  }

  setGravityField(center: Vec2, strength: number): void {
    this.gravityCenter = { center, strength };
  }

  orbit(orbiterId: string, centerId: string, radius: number, period: number): void {
    const orbiter = this.bodies.get(orbiterId);
    const center = this.bodies.get(centerId);
    if (!orbiter || !center) return;
    orbiter.position = { x: center.position.x + radius, y: center.position.y };
    const angularVelocity = (2 * Math.PI) / Math.max(period, 1);
    orbiter.velocity = { x: 0, y: angularVelocity * radius };
  }

  step(dt: number): void {
    const ids = [...this.bodies.keys()];
    for (let index = 0; index < ids.length; index += 1) {
      const a = this.bodies.get(ids[index]!)!;
      if (a.fixed) continue;
      for (let otherIndex = index + 1; otherIndex < ids.length; otherIndex += 1) {
        const b = this.bodies.get(ids[otherIndex]!)!;
        const dx = b.position.x - a.position.x;
        const dy = b.position.y - a.position.y;
        const distSq = Math.max(dx * dx + dy * dy, 25);
        const dist = Math.sqrt(distSq);
        const force = (this.gravity * a.mass * b.mass) / distSq;
        const fx = (force * dx) / dist;
        const fy = (force * dy) / dist;
        if (!a.fixed) {
          a.velocity.x += (fx / a.mass) * dt;
          a.velocity.y += (fy / a.mass) * dt;
        }
        if (!b.fixed) {
          b.velocity.x -= (fx / b.mass) * dt;
          b.velocity.y -= (fy / b.mass) * dt;
        }
      }
      if (this.gravityCenter) {
        const dx = this.gravityCenter.center.x - a.position.x;
        const dy = this.gravityCenter.center.y - a.position.y;
        const distSq = Math.max(dx * dx + dy * dy, 64);
        const dist = Math.sqrt(distSq);
        const force = (this.gravityCenter.strength * a.mass) / distSq;
        a.velocity.x += ((force * dx) / dist) * dt;
        a.velocity.y += ((force * dy) / dist) * dt;
      }
    }
    this.springs.forEach((spring) => {
      const a = this.bodies.get(spring.aId);
      const b = this.bodies.get(spring.bId);
      if (!a || !b) return;
      const dx = b.position.x - a.position.x;
      const dy = b.position.y - a.position.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const displacement = dist - spring.restLength;
      const force = spring.stiffness * displacement;
      const fx = (force * dx) / dist;
      const fy = (force * dy) / dist;
      if (!a.fixed) {
        a.velocity.x += fx / a.mass;
        a.velocity.y += fy / a.mass;
      }
      if (!b.fixed) {
        b.velocity.x -= fx / b.mass;
        b.velocity.y -= fy / b.mass;
      }
    });
    this.bodies.forEach((body) => {
      if (body.fixed) return;
      body.velocity.x *= this.damping;
      body.velocity.y *= this.damping;
      body.position.x += body.velocity.x * dt;
      body.position.y += body.velocity.y * dt;
    });
  }

  start(onFrame: (bodies: Map<string, Body>) => void): void {
    let lastTime = performance.now();
    const frame = (now: number) => {
      const dt = Math.min((now - lastTime) / 16.6667, 2);
      lastTime = now;
      this.step(dt);
      onFrame(this.bodies);
      this.rafId = requestAnimationFrame(frame);
    };
    this.rafId = requestAnimationFrame(frame);
  }

  stop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }
}
