/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Detection } from "./tracker";

interface SimulatedObject {
  id: number;
  class: string;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  direction: { x: number; y: number };
  color: string;
  targetSpeed: number;
  stopped: boolean;
  type: string;
  lane: number;
}

export class HighFidelitySimulator {
  private objects: SimulatedObject[] = [];
  private objectIdCounter = 1;
  private width = 640;
  private height = 480;
  private mode: "traffic" | "pedestrian" | "indoor" = "traffic";
  private trafficLightState: "green" | "yellow" | "red" = "green";
  private trafficLightTimer = 0;

  constructor(mode: "traffic" | "pedestrian" | "indoor" = "traffic") {
    this.mode = mode;
    this.spawnInitial();
  }

  public setMode(mode: "traffic" | "pedestrian" | "indoor") {
    if (this.mode !== mode) {
      this.mode = mode;
      this.objects = [];
      this.spawnInitial();
    }
  }

  private spawnInitial() {
    this.objectIdCounter = 1;
    if (this.mode === "indoor") {
      this.spawnIndoorStaticObjects();
    } else {
      const count = this.mode === "traffic" ? 6 : 10;
      for (let i = 0; i < count; i++) {
        this.spawnObject(true); // Spawn anywhere along their path initially
      }
    }
  }

  private spawnIndoorStaticObjects() {
    // Wall Mounted TV
    this.objects.push({
      id: this.objectIdCounter++,
      class: "tv",
      x: 230,
      y: 60,
      width: 180,
      height: 110,
      speed: 0,
      targetSpeed: 0,
      direction: { x: 0, y: 0 },
      color: "#4f46e5",
      stopped: true,
      type: "tv",
      lane: 0
    });

    // Swivel Desk Chair
    this.objects.push({
      id: this.objectIdCounter++,
      class: "chair",
      x: 80,
      y: 260,
      width: 65,
      height: 95,
      speed: 0,
      targetSpeed: 0,
      direction: { x: 0, y: 0 },
      color: "#a855f7",
      stopped: true,
      type: "chair",
      lane: 0
    });

    // Laptop on Desk
    this.objects.push({
      id: this.objectIdCounter++,
      class: "laptop",
      x: 205,
      y: 285,
      width: 60,
      height: 45,
      speed: 0,
      targetSpeed: 0,
      direction: { x: 0, y: 0 },
      color: "#3b82f6",
      stopped: true,
      type: "laptop",
      lane: 0
    });

    // Coffee Mug
    this.objects.push({
      id: this.objectIdCounter++,
      class: "cup",
      x: 300,
      y: 305,
      width: 22,
      height: 24,
      speed: 0,
      targetSpeed: 0,
      direction: { x: 0, y: 0 },
      color: "#f43f5e",
      stopped: true,
      type: "cup",
      lane: 0
    });

    // Remote Control
    this.objects.push({
      id: this.objectIdCounter++,
      class: "remote",
      x: 360,
      y: 310,
      width: 16,
      height: 35,
      speed: 0,
      targetSpeed: 0,
      direction: { x: 0, y: 0 },
      color: "#fbbf24",
      stopped: true,
      type: "remote",
      lane: 0
    });

    // Smart Cell Phone
    this.objects.push({
      id: this.objectIdCounter++,
      class: "cell phone",
      x: 410,
      y: 315,
      width: 18,
      height: 30,
      speed: 0,
      targetSpeed: 0,
      direction: { x: 0, y: 0 },
      color: "#10b981",
      stopped: true,
      type: "cell phone",
      lane: 0
    });

    // Book on Table
    this.objects.push({
      id: this.objectIdCounter++,
      class: "book",
      x: 455,
      y: 300,
      width: 40,
      height: 28,
      speed: 0,
      targetSpeed: 0,
      direction: { x: 0, y: 0 },
      color: "#f97316",
      stopped: true,
      type: "book",
      lane: 0
    });

    // Backpack on Floor
    this.objects.push({
      id: this.objectIdCounter++,
      class: "backpack",
      x: 535,
      y: 330,
      width: 45,
      height: 60,
      speed: 0,
      targetSpeed: 0,
      direction: { x: 0, y: 0 },
      color: "#14b8a6",
      stopped: true,
      type: "backpack",
      lane: 0
    });
  }

  private spawnObject(anywhere = false) {
    if (this.mode === "indoor") {
      // Spawn dynamic entities: person or dog
      const hasPerson = this.objects.some((o) => o.class === "person");
      const hasDog = this.objects.some((o) => o.class === "dog");

      if (!hasPerson && Math.random() < 0.5) {
        const fromLeft = Math.random() < 0.5;
        const x = fromLeft ? -40 : this.width + 10;
        const y = 240 + Math.random() * 30;
        this.objects.push({
          id: this.objectIdCounter++,
          class: "person",
          x,
          y,
          width: 30,
          height: 70,
          speed: 1.0,
          targetSpeed: 1.0,
          direction: { x: fromLeft ? 1 : -1, y: 0 },
          color: "#a78bfa",
          stopped: false,
          type: "person",
          lane: 0,
        });
      } else if (!hasDog && Math.random() < 0.5) {
        const fromLeft = Math.random() < 0.5;
        const x = fromLeft ? -40 : this.width + 10;
        const y = 390 + Math.random() * 30;
        this.objects.push({
          id: this.objectIdCounter++,
          class: "dog",
          x,
          y,
          width: 35,
          height: 25,
          speed: 1.2,
          targetSpeed: 1.2,
          direction: { x: fromLeft ? 1 : -1, y: 0 },
          color: "#f59e0b",
          stopped: false,
          type: "dog",
          lane: 0,
        });
      }
    } else if (this.mode === "traffic") {
      // Spawn car, truck, bicycle, or dog
      const rand = Math.random();
      let type: "car" | "truck" | "bicycle" = "car";
      let className = "car";
      let w = 45;
      let h = 30;

      if (rand < 0.15) {
        type = "truck";
        className = "truck";
        w = 65;
        h = 35;
      } else if (rand < 0.3) {
        type = "bicycle";
        className = "bicycle";
        w = 35;
        h = 20;
      }

      // Choose directions: Horizontal (0: left-to-right, 1: right-to-left) or Vertical (2: top-to-bottom)
      const dirIndex = Math.floor(Math.random() * 3);
      let x = 0;
      let y = 0;
      let dx = 0;
      let dy = 0;
      let speed = 2 + Math.random() * 2;
      let lane = Math.floor(Math.random() * 2);

      if (dirIndex === 0) {
        // Horizontal left-to-right
        x = anywhere ? Math.random() * this.width : -w - 10;
        y = 220 + lane * 40; // Lanes in the bottom-half of the horizontal road
        dx = 1;
        dy = 0;
      } else if (dirIndex === 1) {
        // Horizontal right-to-left
        x = anywhere ? Math.random() * this.width : this.width + w + 10;
        y = 120 + lane * 40; // Lanes in the top-half of the horizontal road
        dx = -1;
        dy = 0;
        // Flip dimensions for vertical orientation relative to direction
      } else {
        // Vertical top-to-bottom
        const temp = w;
        w = h;
        h = temp;
        x = 340 + lane * 40; // Vertical road right lane
        y = anywhere ? Math.random() * this.height : -h - 10;
        dx = 0;
        dy = 1;
        speed = 1.5 + Math.random() * 1.5;
      }

      this.objects.push({
        id: this.objectIdCounter++,
        class: className,
        x,
        y,
        width: w,
        height: h,
        speed,
        targetSpeed: speed,
        direction: { x: dx, y: dy },
        color: type === "truck" ? "#94a3b8" : (type === "bicycle" ? "#34d399" : "#38bdf8"),
        stopped: false,
        type,
        lane
      });
    } else {
      // Pedestrian Plaza Mode
      const isDog = Math.random() < 0.15;
      const isBicycle = Math.random() < 0.15;
      const type = isDog ? "dog" : (isBicycle ? "bicycle" : "person");
      const className = type;
      
      const w = type === "person" ? 22 : (type === "dog" ? 28 : 35);
      const h = type === "person" ? 50 : (type === "dog" ? 20 : 35);

      // Random position around boundaries or anywhere
      let x = anywhere ? Math.random() * (this.width - 40) + 20 : 0;
      let y = anywhere ? Math.random() * (this.height - 40) + 20 : 0;

      if (!anywhere) {
        const edge = Math.floor(Math.random() * 4);
        if (edge === 0) { x = -w; y = Math.random() * this.height; }
        else if (edge === 1) { x = this.width; y = Math.random() * this.height; }
        else if (edge === 2) { x = Math.random() * this.width; y = -h; }
        else { x = Math.random() * this.width; y = this.height; }
      }

      // Random target direction
      const angle = Math.random() * Math.PI * 2;
      const speed = type === "dog" ? 1.5 + Math.random() * 2 : (type === "bicycle" ? 2 + Math.random() * 2 : 0.8 + Math.random() * 0.8);

      this.objects.push({
        id: this.objectIdCounter++,
        class: className,
        x,
        y,
        width: w,
        height: h,
        speed,
        targetSpeed: speed,
        direction: { x: Math.cos(angle), y: Math.sin(angle) },
        color: type === "dog" ? "#fbbf24" : (type === "bicycle" ? "#10b981" : "#a78bfa"),
        stopped: false,
        type,
        lane: 0
      });
    }
  }

  // Update simulator state and return simulated "raw" model detections
  public step(width: number, height: number, confidenceThreshold: number): { detections: Detection[]; simulationFrame: HTMLCanvasElement } {
    this.width = width;
    this.height = height;

    // 1. Update traffic lights if in traffic mode
    if (this.mode === "traffic") {
      this.trafficLightTimer++;
      if (this.trafficLightState === "green" && this.trafficLightTimer > 180) {
        this.trafficLightState = "yellow";
        this.trafficLightTimer = 0;
      } else if (this.trafficLightState === "yellow" && this.trafficLightTimer > 60) {
        this.trafficLightState = "red";
        this.trafficLightTimer = 0;
      } else if (this.trafficLightState === "red" && this.trafficLightTimer > 180) {
        this.trafficLightState = "green";
        this.trafficLightTimer = 0;
      }
    }

    // 2. Move objects & adjust speed based on behaviors
    for (const obj of this.objects) {
      if (this.mode === "indoor") {
        if (obj.class === "person") {
          // A person walks towards the desk chair, sits down (stops), interacts with remote/phone, then stands up and exits
          if (!obj.stopped && obj.x > 110 && obj.x < 150) {
            obj.stopped = true;
            obj.targetSpeed = 0;
            obj.speed = 0;
            obj.lane = 160; // Sit down for 160 frames
          }

          if (obj.stopped) {
            obj.lane--;
            if (obj.lane <= 0) {
              obj.stopped = false;
              obj.targetSpeed = 1.0;
              obj.speed = 1.0;
              // Ensure we don't snap back - continue walking off-screen
            } else {
              // Pick up remote control
              const remoteObj = this.objects.find((o) => o.class === "remote");
              if (remoteObj) {
                remoteObj.x = obj.x + 12;
                remoteObj.y = obj.y + 35 + Math.sin(Date.now() / 200) * 2;
              }
              // Pick up smartphone later in sitting session
              if (obj.lane < 80) {
                const phoneObj = this.objects.find((o) => o.class === "cell phone");
                if (phoneObj) {
                  phoneObj.x = obj.x + 10;
                  phoneObj.y = obj.y + 25 + Math.cos(Date.now() / 200) * 1.5;
                }
              }
            }
          } else {
            // Keep remote and smartphone resting on table if person is not active/sitting
            const remoteObj = this.objects.find((o) => o.class === "remote");
            if (remoteObj) {
              remoteObj.x = 360;
              remoteObj.y = 310;
            }
            const phoneObj = this.objects.find((o) => o.class === "cell phone");
            if (phoneObj) {
              phoneObj.x = 410;
              phoneObj.y = 315;
            }
          }
          obj.x += obj.direction.x * obj.speed;
          obj.y += obj.direction.y * obj.speed;
        } else if (obj.class === "dog") {
          // Dog walks around floor, sniffs backpack and couch, then leaves
          if (!obj.stopped && obj.x > 480 && obj.x < 545 && Math.random() < 0.05) {
            obj.stopped = true;
            obj.targetSpeed = 0;
            obj.speed = 0;
            obj.lane = 90; // Sniff backpack
          }

          if (obj.stopped) {
            obj.lane--;
            if (obj.lane <= 0) {
              obj.stopped = false;
              obj.targetSpeed = 1.2;
              obj.speed = 1.2;
            }
          }
          obj.x += obj.direction.x * obj.speed;
          obj.y += obj.direction.y * obj.speed;
        } else {
          // Gentle micro-actions for stationary items
          if (obj.class === "chair") {
            obj.x = 80 + Math.sin(Date.now() / 1500) * 4; // Gentle swivel chair sway
          }
        }
      } else if (this.mode === "traffic") {
        // Slow down/stop for traffic light
        let shouldStop = false;

        if (this.trafficLightState === "red") {
          if (obj.direction.x > 0 && obj.x > 220 && obj.x < 260) {
            shouldStop = true;
          } else if (obj.direction.x < 0 && obj.x < 500 && obj.x > 460) {
            shouldStop = true;
          } else if (obj.direction.y > 0 && obj.y > 60 && obj.y < 90) {
            shouldStop = true;
          }
        } else if (this.trafficLightState === "yellow") {
          if (obj.direction.x > 0 && obj.x > 180 && obj.x < 260) shouldStop = true;
          if (obj.direction.x < 0 && obj.x < 540 && obj.x > 460) shouldStop = true;
          if (obj.direction.y > 0 && obj.y > 30 && obj.y < 90) shouldStop = true;
        }

        // Avoid colliding with cars ahead in the same lane
        for (const other of this.objects) {
          if (other.id === obj.id) continue;
          if (obj.direction.x > 0 && other.direction.x > 0 && other.lane === obj.lane) {
            const distance = other.x - (obj.x + obj.width);
            if (distance > 0 && distance < 40) {
              shouldStop = true;
            }
          } else if (obj.direction.x < 0 && other.direction.x < 0 && other.lane === obj.lane) {
            const distance = obj.x - (other.x + other.width);
            if (distance > 0 && distance < 40) {
              shouldStop = true;
            }
          } else if (obj.direction.y > 0 && other.direction.y > 0 && other.lane === obj.lane) {
            const distance = other.y - (obj.y + obj.height);
            if (distance > 0 && distance < 40) {
              shouldStop = true;
            }
          }
        }

        if (shouldStop) {
          obj.speed = Math.max(0, obj.speed - 0.25);
        } else {
          obj.speed = Math.min(obj.targetSpeed, obj.speed + 0.15);
        }

        obj.x += obj.direction.x * obj.speed;
        obj.y += obj.direction.y * obj.speed;
      } else {
        // Pedestrian Plaza Mode
        obj.x += obj.direction.x * obj.speed;
        obj.y += obj.direction.y * obj.speed;

        // Bounce off walls or change direction slightly
        if (Math.random() < 0.02) {
          const currentAngle = Math.atan2(obj.direction.y, obj.direction.x);
          const newAngle = currentAngle + (Math.random() - 0.5) * 0.5;
          obj.direction.x = Math.cos(newAngle);
          obj.direction.y = Math.sin(newAngle);
        }

        if (obj.x < 20 || obj.x > this.width - obj.width - 20) {
          obj.direction.x *= -1;
          obj.x = Math.max(20, Math.min(this.width - obj.width - 20, obj.x));
        }
        if (obj.y < 20 || obj.y > this.height - obj.height - 20) {
          obj.direction.y *= -1;
          obj.y = Math.max(20, Math.min(this.height - obj.height - 20, obj.y));
        }
      }
    }

    // 3. Remove out-of-bounds objects and spawn replacements
    this.objects = this.objects.filter((obj) => {
      if (this.mode === "indoor" && obj.class !== "person" && obj.class !== "dog") {
        return true; // Always preserve static home items
      }
      const margin = 100;
      const inBounds =
        obj.x >= -margin &&
        obj.x <= this.width + margin &&
        obj.y >= -margin &&
        obj.y <= this.height + margin;
      return inBounds;
    });

    let targetCount = 12;
    if (this.mode === "traffic") {
      targetCount = 7;
    } else if (this.mode === "indoor") {
      const dynamicCount = this.objects.filter((o) => o.class === "person" || o.class === "dog").length;
      if (dynamicCount < 2 && Math.random() < 0.04) {
        this.spawnObject(false);
      }
      targetCount = this.objects.length; // Lock to current structured items
    }

    while (this.objects.length < targetCount) {
      this.spawnObject(false);
    }

    // 4. Draw synthetic frame on an off-screen canvas to act as the video stream
    const canvas = document.createElement("canvas");
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      this.drawBackground(ctx);
      this.drawObjects(ctx);
    }

    // 5. Build raw "detections" list with added model noise
    const detections: Detection[] = [];
    for (const obj of this.objects) {
      if (Math.random() < 0.02) continue; // 2% chance of missing bounding box (false negative test)

      const confidence = 0.65 + Math.random() * 0.33;
      if (confidence < confidenceThreshold) continue;

      const jitterX = (Math.random() - 0.5) * 1.5;
      const jitterY = (Math.random() - 0.5) * 1.5;
      const jitterW = (Math.random() - 0.5) * 1.2;
      const jitterH = (Math.random() - 0.5) * 1.2;

      detections.push({
        class: obj.class,
        confidence,
        box: {
          x: Math.max(0, Math.min(this.width, obj.x + jitterX)),
          y: Math.max(0, Math.min(this.height, obj.y + jitterY)),
          width: Math.max(10, Math.min(this.width, obj.width + jitterW)),
          height: Math.max(10, Math.min(this.height, obj.height + jitterH)),
        },
      });
    }

    return { detections, simulationFrame: canvas };
  }

  private drawBackground(ctx: CanvasRenderingContext2D) {
    if (this.mode === "indoor") {
      // Draw modern accent wall paneling with vertical slats
      const wallGrad = ctx.createLinearGradient(0, 0, 0, 260);
      wallGrad.addColorStop(0, "#0e131f"); // Midnight shade
      wallGrad.addColorStop(1, "#1c2538"); // Elegant gray-blue wall
      ctx.fillStyle = wallGrad;
      ctx.fillRect(0, 0, this.width, 260);

      // Draw beautiful wood slat panels on the accent wall
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 4;
      for (let x = 30; x < this.width; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 260);
        ctx.stroke();
      }

      // Draw cozy ambient shelving
      ctx.fillStyle = "#2d3748"; // Slate wood shelf
      ctx.fillRect(40, 160, 140, 10);
      ctx.fillStyle = "#0e131f"; // Shelf shadow
      ctx.fillRect(44, 170, 132, 4);

      // Decorative flower pot on shelf
      ctx.fillStyle = "#f97316"; // Clay pot
      ctx.beginPath();
      ctx.moveTo(95, 160);
      ctx.lineTo(100, 145);
      ctx.lineTo(110, 145);
      ctx.lineTo(115, 160);
      ctx.closePath();
      ctx.fill();

      // Green leaves
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.ellipse(102, 138, 5, 10, -0.4, 0, Math.PI * 2);
      ctx.ellipse(108, 138, 5, 10, 0.4, 0, Math.PI * 2);
      ctx.ellipse(105, 134, 4, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Desk tabletop
      const deskGrad = ctx.createLinearGradient(0, 260, 0, this.height);
      deskGrad.addColorStop(0, "#111827"); // Shadow below desktop edge
      deskGrad.addColorStop(0.05, "#1f2937"); // Tabletop surface
      deskGrad.addColorStop(1, "#030712"); // Shadows on floor
      ctx.fillStyle = deskGrad;
      ctx.fillRect(0, 260, this.width, this.height - 260);

      // Elegant neon LED strip along the table edge
      ctx.strokeStyle = "#4f46e5"; // Indigo neon LED wire
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 260);
      ctx.lineTo(this.width, 260);
      ctx.stroke();
    } else if (this.mode === "traffic") {
      // Draw road junction
      ctx.fillStyle = "#1e293b"; // Charcoal asphalt
      ctx.fillRect(0, 0, this.width, this.height);

      // Horizontal Road
      ctx.fillStyle = "#334155";
      ctx.fillRect(0, 100, this.width, 180);

      // Vertical Road
      ctx.fillRect(300, 0, 180, this.height);

      // Draw grass landscape
      ctx.fillStyle = "#0f172a"; // Tech-style landscape blocks
      ctx.fillRect(0, 0, 300, 100);
      ctx.fillRect(480, 0, this.width - 480, 100);
      ctx.fillRect(0, 280, 300, this.height - 280);
      ctx.fillRect(480, 280, this.width - 480, this.height - 280);

      // Draw lanes and markings
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 15]);

      // Horizontal lanes dashed center lines
      ctx.beginPath();
      ctx.moveTo(0, 190);
      ctx.lineTo(300, 190);
      ctx.moveTo(480, 190);
      ctx.lineTo(this.width, 190);
      
      // Vertical lane center dashed
      ctx.moveTo(390, 0);
      ctx.lineTo(390, 100);
      ctx.moveTo(390, 280);
      ctx.lineTo(this.height, 390); // simple line
      ctx.stroke();

      // Side solid lane lines
      ctx.setLineDash([]);
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      // Horizontal boundaries
      ctx.moveTo(0, 100); ctx.lineTo(300, 100);
      ctx.moveTo(480, 100); ctx.lineTo(this.width, 100);
      ctx.moveTo(0, 280); ctx.lineTo(300, 280);
      ctx.moveTo(480, 280); ctx.lineTo(this.width, 280);
      // Vertical boundaries
      ctx.moveTo(300, 0); ctx.lineTo(300, 100);
      ctx.moveTo(300, 280); ctx.lineTo(300, this.height);
      ctx.moveTo(480, 0); ctx.lineTo(480, 100);
      ctx.moveTo(480, 280); ctx.lineTo(480, this.height);
      ctx.stroke();

      // Crosswalk lines
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 4;
      ctx.setLineDash([]);
      ctx.beginPath();
      for (let i = 105; i < 275; i += 15) {
        ctx.moveTo(280, i);
        ctx.lineTo(295, i);
        ctx.moveTo(485, i);
        ctx.lineTo(500, i);
      }
      ctx.stroke();

      // Draw Traffic Light Poles & Lights
      // North light pole
      ctx.fillStyle = "#475569";
      ctx.fillRect(275, 75, 10, 20);
      
      // Draw glowing light
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.arc(280, 60, 12, 0, Math.PI * 2);
      ctx.fill();

      if (this.trafficLightState === "red") {
        ctx.fillStyle = "#ef4444"; // Red glow
      } else if (this.trafficLightState === "yellow") {
        ctx.fillStyle = "#fbbf24"; // Yellow glow
      } else {
        ctx.fillStyle = "#10b981"; // Green glow
      }
      ctx.beginPath();
      ctx.arc(280, 60, 7, 0, Math.PI * 2);
      ctx.fill();

      // Traffic light text/info
      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px monospace";
      ctx.fillText(`LIGHT: ${this.trafficLightState.toUpperCase()}`, 10, 25);
    } else {
      // Pedestrian Plaza Mode
      ctx.fillStyle = "#0f172a"; // Dark blue canvas background
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < this.width; x += 40) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, this.height);
      }
      for (let y = 0; y < this.height; y += 40) {
        ctx.moveTo(0, y);
        ctx.lineTo(this.width, y);
      }
      ctx.stroke();

      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.arc(320, 240, 65, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = "#0284c7";
      ctx.beginPath();
      ctx.arc(320, 240, 45, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#7dd3fc";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(320, 240, 25 + Math.sin(Date.now() / 400) * 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#334155";
      ctx.fillRect(100, 100, 80, 20);
      ctx.fillRect(100, 360, 80, 20);
      ctx.fillRect(460, 100, 80, 20);
      ctx.fillRect(460, 360, 80, 20);

      ctx.fillStyle = "#475569";
      ctx.fillRect(105, 103, 70, 14);
      ctx.fillRect(105, 363, 70, 14);
      ctx.fillRect(465, 103, 70, 14);
      ctx.fillRect(465, 363, 70, 14);
    }
  }

  private drawObjects(ctx: CanvasRenderingContext2D) {
    for (const obj of this.objects) {
      ctx.save();

      if (this.mode === "indoor") {
        ctx.translate(obj.x + obj.width / 2, obj.y + obj.height / 2);

        if (obj.class === "tv") {
          // Bezel shadow
          ctx.fillStyle = "#030712";
          ctx.fillRect(-obj.width / 2 - 3, -obj.height / 2 - 3, obj.width + 6, obj.height + 6);
          // Plastic frame
          ctx.fillStyle = "#111827";
          ctx.fillRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
          // Glowing screen background
          const tvGrad = ctx.createLinearGradient(0, -obj.height / 2, 0, obj.height / 2);
          tvGrad.addColorStop(0, "#4338ca"); // Indigo tv screen
          tvGrad.addColorStop(1, "#1e1b4b");
          ctx.fillStyle = tvGrad;
          ctx.fillRect(-obj.width / 2 + 6, -obj.height / 2 + 6, obj.width - 12, obj.height - 12);

          // Screensaver content: elegant digital waves or graphs
          ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          const t = Date.now() / 400;
          for (let x = -obj.width / 2 + 8; x < obj.width / 2 - 8; x += 4) {
            const y = Math.sin(x * 0.08 + t) * 12;
            if (x === -obj.width / 2 + 8) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          // Camera feed overlay "REC" dot
          if (Math.floor(Date.now() / 500) % 2 === 0) {
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.arc(-obj.width / 2 + 16, -obj.height / 2 + 16, 4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
          ctx.font = "8px monospace";
          ctx.fillText("LIVE FEED", -obj.width / 2 + 25, -obj.height / 2 + 19);

          // TV Stand / Mount
          ctx.fillStyle = "#1f2937";
          ctx.fillRect(-15, obj.height / 2, 30, 4);
        } else if (obj.class === "chair") {
          // Base wheels
          ctx.strokeStyle = "#4b5563";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-20, obj.height / 2 - 4);
          ctx.lineTo(20, obj.height / 2 - 4);
          ctx.stroke();

          // Hydraulic cylinder post
          ctx.fillStyle = "#111827";
          ctx.fillRect(-4, obj.height / 2 - 35, 8, 30);

          // Seat cushion
          ctx.fillStyle = "#7c3aed"; // Violet cushion
          this.drawRoundedRect(ctx, -obj.width / 2, obj.height / 2 - 50, obj.width, 15, 4);
          ctx.fill();

          // Curved chair Backrest
          ctx.fillStyle = "#5b21b6"; // Dark purple mesh backrest
          this.drawRoundedRect(ctx, -obj.width / 2 + 6, -obj.height / 2 + 5, obj.width - 12, obj.height - 55, 6);
          ctx.fill();

          // Armrests
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(-obj.width / 2 - 2, obj.height / 2 - 48, 4, 18);
          ctx.fillRect(obj.width / 2 - 2, obj.height / 2 - 48, 4, 18);
        } else if (obj.class === "laptop") {
          // Open lid screen
          ctx.fillStyle = "#475569"; // Metallic bezel
          this.drawRoundedRect(ctx, -obj.width / 2 + 3, -obj.height / 2, obj.width - 6, obj.height - 12, 4);
          ctx.fill();

          // Screen display
          ctx.fillStyle = "#0284c7"; // Blue screen
          ctx.fillRect(-obj.width / 2 + 6, -obj.height / 2 + 3, obj.width - 12, obj.height - 20);

          // Code line drawings
          ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
          ctx.fillRect(-obj.width / 2 + 10, -obj.height / 2 + 7, 18, 3);
          ctx.fillRect(-obj.width / 2 + 10, -obj.height / 2 + 12, 28, 3);
          ctx.fillStyle = "#a855f7"; // purple text
          ctx.fillRect(-obj.width / 2 + 10, -obj.height / 2 + 17, 14, 3);

          // Keyboard base
          ctx.fillStyle = "#1e293b"; // Charcoal metal base
          ctx.fillRect(-obj.width / 2, obj.height / 2 - 12, obj.width, 10);
          ctx.fillStyle = "#0f172a"; // Trackpad highlight
          ctx.fillRect(-8, obj.height / 2 - 6, 16, 3);
        } else if (obj.class === "cup") {
          // Mug base
          ctx.fillStyle = "#f43f5e";
          this.drawRoundedRect(ctx, -obj.width / 2, -obj.height / 2 + 4, obj.width, obj.height - 4, 3);
          ctx.fill();

          // Handle
          ctx.strokeStyle = "#e11d48";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(obj.width / 2, 0, 5, -Math.PI / 2, Math.PI / 2);
          ctx.stroke();

          // Steam ripples
          ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          const offset = Math.sin(Date.now() / 150) * 2;
          ctx.moveTo(-3, -obj.height / 2);
          ctx.quadraticCurveTo(-1 + offset, -obj.height / 2 - 5, -3, -obj.height / 2 - 10);
          ctx.moveTo(3, -obj.height / 2);
          ctx.quadraticCurveTo(5 - offset, -obj.height / 2 - 4, 3, -obj.height / 2 - 9);
          ctx.stroke();
        } else if (obj.class === "remote") {
          // Plastic body
          ctx.fillStyle = "#1e293b";
          this.drawRoundedRect(ctx, -obj.width / 2, -obj.height / 2, obj.width, obj.height, 3);
          ctx.fill();

          // Button matrix grid
          ctx.fillStyle = "#ef4444"; // Red top power button
          ctx.fillRect(-obj.width / 4, -obj.height / 2 + 4, 4, 4);

          ctx.fillStyle = "#94a3b8"; // Rubber keys
          for (let row = 0; row < 4; row++) {
            ctx.fillRect(-obj.width / 3, -obj.height / 2 + 11 + row * 6, 3, 3);
            ctx.fillRect(obj.width / 3 - 3, -obj.height / 2 + 11 + row * 6, 3, 3);
          }
        } else if (obj.class === "cell phone") {
          // Glossy frame
          ctx.fillStyle = "#111827";
          this.drawRoundedRect(ctx, -obj.width / 2, -obj.height / 2, obj.width, obj.height, 4);
          ctx.fill();

          // Glowing touch screen
          ctx.fillStyle = "#10b981"; // Green glowing screen
          ctx.fillRect(-obj.width / 2 + 2, -obj.height / 2 + 3, obj.width - 4, obj.height - 6);

          // Notch camera bar
          ctx.fillStyle = "#000";
          ctx.fillRect(-3, -obj.height / 2 + 3, 6, 2);
        } else if (obj.class === "book") {
          // Hardcover book top down
          ctx.fillStyle = obj.color;
          this.drawRoundedRect(ctx, -obj.width / 2, -obj.height / 2, obj.width, obj.height, 2);
          ctx.fill();

          // Spine rib lines
          ctx.fillStyle = "#ea580c";
          ctx.fillRect(-obj.width / 2 + 3, -obj.height / 2, 4, obj.height);

          // Page edge details
          ctx.fillStyle = "#fef08a";
          ctx.fillRect(obj.width / 2 - 3, -obj.height / 2 + 2, 3, obj.height - 4);
        } else if (obj.class === "backpack") {
          // Backpack body canvas
          ctx.fillStyle = obj.color;
          this.drawRoundedRect(ctx, -obj.width / 2, -obj.height / 2 + 6, obj.width, obj.height - 12, 8);
          ctx.fill();

          // Front pocket pouch
          ctx.fillStyle = "#0d9488";
          this.drawRoundedRect(ctx, -obj.width / 2 + 4, 2, obj.width - 8, obj.height / 2 - 6, 4);
          ctx.fill();

          // Zipper sliders
          ctx.fillStyle = "#cbd5e1";
          ctx.fillRect(-10, -2, 6, 2);
          ctx.fillRect(-2, 12, 4, 2);

          // Carrying top loop strap
          ctx.strokeStyle = "#115e59";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, -obj.height / 2 + 6, 6, Math.PI, 0);
          ctx.stroke();
        } else if (obj.class === "person") {
          // Front-facing person body vectors
          ctx.fillStyle = "#1d4ed8"; // Indigo denim legs
          ctx.fillRect(-9, 10, 7, 25);
          ctx.fillRect(2, 10, 7, 25);

          ctx.fillStyle = "#ec4899"; // Bright pink sweater
          this.drawRoundedRect(ctx, -obj.width / 2 - 3, -15, obj.width + 6, 26, 6);
          ctx.fill();

          ctx.fillStyle = "#ffedd5"; // Skin tone head
          ctx.beginPath();
          ctx.arc(0, -23, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#78350f"; // Brown hair
          ctx.beginPath();
          ctx.arc(0, -26, 11, Math.PI, 0);
          ctx.fill();
        } else if (obj.class === "dog") {
          // Dog profile vectors
          ctx.fillStyle = obj.color;
          ctx.fillRect(-obj.width / 2, -obj.height / 6, obj.width - 10, obj.height / 2);
          ctx.fillRect(-obj.width / 2 + 2, obj.height / 3, 4, obj.height / 3);
          ctx.fillRect(obj.width / 2 - 12, obj.height / 3, 4, obj.height / 3);
          ctx.fillRect(obj.width / 2 - 10, -obj.height / 2, 10, obj.height / 2);
          ctx.fillStyle = "#b45309";
          ctx.fillRect(obj.width / 2 - 11, -obj.height / 2, 4, 10);
          ctx.strokeStyle = obj.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-obj.width / 2, 0);
          ctx.quadraticCurveTo(-obj.width / 2 - 8, -6, -obj.width / 2 - 5, -12);
          ctx.stroke();
        }
      } else if (this.mode === "traffic") {
        // Cars, trucks, bicycles
        ctx.translate(obj.x + obj.width / 2, obj.y + obj.height / 2);
        
        // Compute angle from velocity/direction
        const angle = Math.atan2(obj.direction.y, obj.direction.x);
        ctx.rotate(angle);

        // Body color
        ctx.fillStyle = obj.color;
        
        if (obj.type === "truck") {
          // Semi truck cab and trailer
          ctx.fillRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
          // Windshield
          ctx.fillStyle = "#e2e8f0";
          ctx.fillRect(obj.width / 2 - 12, -obj.height / 2 + 3, 5, obj.height - 6);
          // Wheels
          ctx.fillStyle = "#090d16";
          ctx.fillRect(-obj.width / 2 + 10, -obj.height / 2 - 2, 8, 2);
          ctx.fillRect(-obj.width / 2 + 10, obj.height / 2, 8, 2);
          ctx.fillRect(obj.width / 2 - 15, -obj.height / 2 - 2, 8, 2);
          ctx.fillRect(obj.width / 2 - 15, obj.height / 2, 8, 2);
        } else if (obj.type === "car") {
          // Car shape (rounded rect representation)
          this.drawRoundedRect(ctx, -obj.width / 2, -obj.height / 2, obj.width, obj.height, 6);
          ctx.fill();
          // Windshield
          ctx.fillStyle = "#cbd5e1";
          ctx.fillRect(obj.width / 2 - 16, -obj.height / 2 + 3, 4, obj.height - 6);
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(-obj.width / 2 + 10, -obj.height / 2 + 3, 10, obj.height - 6);
          // Lights
          ctx.fillStyle = "#fef08a"; // headlights
          ctx.fillRect(obj.width / 2 - 1, -obj.height / 2 + 2, 2, 4);
          ctx.fillRect(obj.width / 2 - 1, obj.height / 2 - 6, 2, 4);
          ctx.fillStyle = "#f87171"; // taillights
          ctx.fillRect(-obj.width / 2 - 1, -obj.height / 2 + 3, 2, 3);
          ctx.fillRect(-obj.width / 2 - 1, obj.height / 2 - 6, 2, 3);
        } else {
          // Bicycle
          ctx.strokeStyle = obj.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-10, 0); ctx.lineTo(10, 0);
          ctx.stroke();
          // Wheels
          ctx.fillStyle = "#020617";
          ctx.beginPath();
          ctx.arc(-10, 0, 6, 0, Math.PI * 2);
          ctx.arc(10, 0, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Pedestrian plaza shapes (circle avatar for person/dog from top-down)
        ctx.translate(obj.x + obj.width / 2, obj.y + obj.height / 2);
        const angle = Math.atan2(obj.direction.y, obj.direction.x);
        ctx.rotate(angle);

        ctx.fillStyle = obj.color;
        if (obj.type === "person") {
          // Person shoulders & head top-down
          ctx.beginPath();
          ctx.ellipse(0, 0, obj.width / 2, obj.height / 4, 0, 0, Math.PI * 2);
          ctx.fill();
          // Head circle
          ctx.fillStyle = "#fed7aa"; // Skin tone / hair top down
          ctx.beginPath();
          ctx.arc(0, 0, 7, 0, Math.PI * 2);
          ctx.fill();
          // Backpack if any
          if (obj.id % 2 === 0) {
            ctx.fillStyle = "#1d4ed8";
            ctx.fillRect(-8, -5, 6, 10);
          }
        } else if (obj.type === "dog") {
          // Dog body
          ctx.fillRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
          // Tail
          ctx.strokeStyle = obj.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-obj.width / 2, 0);
          ctx.lineTo(-obj.width / 2 - 5, -2);
          ctx.stroke();
        } else {
          // Bicycle in plaza
          ctx.strokeStyle = obj.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-12, 0); ctx.lineTo(12, 0);
          ctx.stroke();
          // Wheels
          ctx.fillStyle = "#1e293b";
          ctx.beginPath();
          ctx.arc(-10, 0, 5, 0, Math.PI * 2);
          ctx.arc(10, 0, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }
  }

  private drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height - radius);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
