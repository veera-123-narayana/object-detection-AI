/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BoundingBox {
  x: number;      // Top-left x
  y: number;      // Top-left y
  width: number;
  height: number;
}

export interface Detection {
  box: BoundingBox;
  class: string;
  confidence: number;
}

export interface Track {
  id: number;
  class: string;
  box: BoundingBox;
  predictedBox: BoundingBox;
  history: { x: number; y: number; time: number }[];
  velocity: { dx: number; dy: number };
  age: number;        // Total frames active
  hits: number;       // Number of consecutive frames matched
  misses: number;     // Number of consecutive frames missed
  color: string;      // RGB or Hex color string
  speed: number;      // Pixels per frame
  isInsideZone: boolean;
  hasCrossedTripwire: boolean;
  isActive: boolean;
}

// Generate an elegant, highly visible color for bounding boxes
const TRACK_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#14b8a6", // Teal
  "#f97316", // Orange
  "#a855f7", // Purple-Light
];

let trackIdCounter = 1;

export function resetTrackCounter() {
  trackIdCounter = 1;
}

export class SimpleSortTracker {
  private tracks: Track[] = [];
  private maxAge: number;
  private minHits: number;
  private iouThreshold: number;

  constructor(maxAge = 15, minHits = 1, iouThreshold = 0.15) {
    this.maxAge = maxAge;
    this.minHits = minHits;
    this.iouThreshold = iouThreshold;
  }

  // Calculate Intersection over Union (IoU) of two boxes
  private getIoU(box1: BoundingBox, box2: BoundingBox): number {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

    if (x2 <= x1 || y2 <= y1) return 0;

    const intersectionArea = (x2 - x1) * (y2 - y1);
    const area1 = box1.width * box1.height;
    const area2 = box2.width * box2.height;
    const unionArea = area1 + area2 - intersectionArea;

    return intersectionArea / unionArea;
  }

  // Get active tracks (only those with enough hits and low misses)
  public getTracks(): Track[] {
    return this.tracks.filter(t => t.hits >= this.minHits);
  }

  // Reset all current tracks
  public clear() {
    this.tracks = [];
  }

  // Update tracker with new detections
  public update(detections: Detection[]): Track[] {
    // 1. Predict next state of all existing tracks using a linear constant velocity model
    for (const track of this.tracks) {
      track.age++;
      
      // Constant velocity prediction
      const predX = track.box.x + track.velocity.dx;
      const predY = track.box.y + track.velocity.dy;
      
      track.predictedBox = {
        x: predX,
        y: predY,
        width: track.box.width,
        height: track.box.height
      };
    }

    // 2. Associate detections with predicted tracks using IoU & Greedy bipartite matching
    const matchedDetections = new Set<number>();
    const matchedTracks = new Set<number>();
    const associations: { trackIndex: number; detectionIndex: number; iou: number }[] = [];

    // Compute all pairwise IoU scores (only for same class to keep association stable)
    for (let t = 0; t < this.tracks.length; t++) {
      for (let d = 0; d < detections.length; d++) {
        if (this.tracks[t].class !== detections[d].class) continue;

        const iou = this.getIoU(this.tracks[t].predictedBox, detections[d].box);
        if (iou >= this.iouThreshold) {
          associations.push({ trackIndex: t, detectionIndex: d, iou });
        }
      }
    }

    // Sort associations by IoU descending
    associations.sort((a, b) => b.iou - a.iou);

    // Greedy matching
    for (const assoc of associations) {
      if (matchedTracks.has(assoc.trackIndex) || matchedDetections.has(assoc.detectionIndex)) {
        continue;
      }

      matchedTracks.add(assoc.trackIndex);
      matchedDetections.add(assoc.detectionIndex);

      // Update matched track
      const track = this.tracks[assoc.trackIndex];
      const det = detections[assoc.detectionIndex];
      
      // Calculate velocity (dx, dy) with a small smoothing factor (alpha)
      const alpha = 0.4;
      const currentCenterX = det.box.x + det.box.width / 2;
      const currentCenterY = det.box.y + det.box.height / 2;
      const prevCenterX = track.box.x + track.box.width / 2;
      const prevCenterY = track.box.y + track.box.height / 2;

      const instantDx = currentCenterX - prevCenterX;
      const instantDy = currentCenterY - prevCenterY;

      track.velocity.dx = track.velocity.dx * (1 - alpha) + instantDx * alpha;
      track.velocity.dy = track.velocity.dy * (1 - alpha) + instantDy * alpha;

      // Calculate speed (magnitude of velocity vector)
      track.speed = Math.sqrt(track.velocity.dx ** 2 + track.velocity.dy ** 2);

      // Update box
      track.box = det.box;
      track.hits++;
      track.misses = 0;

      // Update movement history
      track.history.push({
        x: currentCenterX,
        y: currentCenterY,
        time: Date.now()
      });
      if (track.history.length > 50) {
        track.history.shift();
      }
    }

    // 3. Handle unmatched tracks (misses)
    for (let t = 0; t < this.tracks.length; t++) {
      if (!matchedTracks.has(t)) {
        const track = this.tracks[t];
        track.misses++;
        // Extrapolate state for unmatched tracks so they continue briefly
        track.box = {
          x: track.box.x + track.velocity.dx,
          y: track.box.y + track.velocity.dy,
          width: track.box.width,
          height: track.box.height
        };
        // Slowly decay velocity
        track.velocity.dx *= 0.8;
        track.velocity.dy *= 0.8;
        track.speed *= 0.8;
      }
    }

    // 4. Handle unmatched detections (create new tracks)
    for (let d = 0; d < detections.length; d++) {
      if (!matchedDetections.has(d)) {
        const det = detections[d];
        const color = TRACK_COLORS[trackIdCounter % TRACK_COLORS.length];
        const centerX = det.box.x + det.box.width / 2;
        const centerY = det.box.y + det.box.height / 2;

        this.tracks.push({
          id: trackIdCounter++,
          class: det.class,
          box: det.box,
          predictedBox: det.box,
          history: [{ x: centerX, y: centerY, time: Date.now() }],
          velocity: { dx: 0, dy: 0 },
          age: 1,
          hits: 1,
          misses: 0,
          color,
          speed: 0,
          isInsideZone: false,
          hasCrossedTripwire: false,
          isActive: true
        });
      }
    }

    // 5. Filter out dead tracks (too many misses)
    this.tracks = this.tracks.filter(track => track.misses < this.maxAge);

    return this.getTracks();
  }
}
