/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Track } from "./lib/tracker";

export interface LogEntry {
  id: string;
  timestamp: string;
  trackId: number;
  class: string;
  type: "crossing" | "intrusion" | "exit_zone" | "system";
  message: string;
  severity: "info" | "warning" | "alert";
}

export interface CountingStats {
  total: number;
  byClass: Record<string, number>;
  tripwireCrossings: {
    in: number;
    out: number;
    classes: Record<string, { in: number; out: number }>;
  };
  zoneIntrusions: number;
}

export type VideoSource = "simulator_traffic" | "simulator_pedestrian" | "simulator_indoor" | "webcam" | "upload";

export interface SystemMetrics {
  fps: number;
  inferenceTime: number;
  trackingTime: number;
  totalFrames: number;
  activeTracksCount: number;
}
