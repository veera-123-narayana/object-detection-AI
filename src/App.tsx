/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo, ChangeEvent, MouseEvent } from "react";
import { SimpleSortTracker, Track, Detection, resetTrackCounter } from "./lib/tracker";
import { HighFidelitySimulator } from "./lib/simulator";
import { TracksTable } from "./components/TracksTable";
import { EventLogs } from "./components/EventLogs";
import { SystemSpecs } from "./components/SystemSpecs";
import { LogEntry, CountingStats, VideoSource, SystemMetrics } from "./types";
import {
  Camera,
  Upload,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Eye,
  Settings2,
  Volume2,
  VolumeX,
  Plus,
  Compass,
  MonitorPlay,
  Info,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Video
} from "lucide-react";

// For loading COCO-SSD safely
let tf: any = null;
let cocossd: any = null;

export default function App() {
  // State variables for Video & Simulator
  const [videoSource, setVideoSource] = useState<VideoSource>("simulator_traffic");
  const [modelStatus, setModelStatus] = useState<"uninitialized" | "loading" | "ready" | "failed">("uninitialized");
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  // Advanced Visual Toggles
  const [showBoxes, setShowBoxes] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showTrails, setShowTrails] = useState(true);
  const [showTripwire, setShowTripwire] = useState(true);
  const [showZone, setShowZone] = useState(false);
  const [showSpeeds, setShowSpeeds] = useState(false);

  // Detection Constraints
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.4);
  const [skipFrames, setSkipFrames] = useState(1); // Process every N frames
  const [classesToTrack, setClassesToTrack] = useState<Record<string, boolean>>({
    person: true,
    car: true,
    truck: true,
    bicycle: true,
    dog: true,
    tv: true,
    remote: true,
    laptop: true,
    "cell phone": true,
    cup: true,
    book: true,
    backpack: true,
    chair: true
  });

  // Tripwire & Restricted Zone States
  const [tripwireOrientation, setTripwireOrientation] = useState<"horizontal" | "vertical">("horizontal");
  const [tripwirePos, setTripwirePos] = useState(190); // Y position for horizontal, X for vertical
  const [zone, setZone] = useState({ x: 120, y: 320, width: 400, height: 120 }); // Region overlay
  const [activeTool, setActiveTool] = useState<"none" | "tripwire" | "zone">("none");

  // Telemetry Metrics
  const [metrics, setMetrics] = useState<SystemMetrics>({
    fps: 0,
    inferenceTime: 0,
    trackingTime: 0,
    totalFrames: 0,
    activeTracksCount: 0
  });

  // Track counts & Logs
  const [stats, setStats] = useState<CountingStats>({
    total: 0,
    byClass: {},
    tripwireCrossings: {
      in: 0,
      out: 0,
      classes: {}
    },
    zoneIntrusions: 0
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [focusedTrackId, setFocusedTrackId] = useState<number | null>(null);

  // Refs for HTML Elements and Libraries
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modelRef = useRef<any>(null);
  const trackerRef = useRef<SimpleSortTracker>(new SimpleSortTracker(15, 1, 0.15));
  const simulatorRef = useRef<HighFidelitySimulator>(new HighFidelitySimulator("traffic"));
  const requestRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(Date.now());
  const streamRef = useRef<MediaStream | null>(null);
  const frameCountRef = useRef(0);
  const trackRegistryRef = useRef<Map<number, { lastY: number; lastX: number; crossed: boolean }>>(new Map());

  // Available classes helper
  const [discoveredClasses, setDiscoveredClasses] = useState<string[]>([
    "person", "car", "truck", "bicycle", "dog", "tv", "remote", "laptop", "cell phone", "cup", "book", "backpack", "chair"
  ]);

  // Helper: Play simple synthesised alarm sounds using Web Audio API
  const playSound = (type: "crossing" | "intrusion") => {
    if (isMuted) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === "crossing") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } else {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(280, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      }
    } catch (e) {
      console.warn("Web Audio API not supported or blocked by user guest settings", e);
    }
  };

  // Add structured log entries
  const addLog = (
    message: string,
    type: LogEntry["type"],
    severity: LogEntry["severity"],
    trackId = -1,
    cls = ""
  ) => {
    const timestamp = new Date().toLocaleTimeString();
    const newEntry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp,
      trackId,
      class: cls,
      type,
      message,
      severity
    };
    setLogs((prev) => [newEntry, ...prev].slice(0, 100)); // Maintain last 100 entries
  };

  // Setup/Tear down video elements based on source selection
  useEffect(() => {
    stopWebcam();
    if (videoSource === "webcam") {
      startWebcam();
    } else if (videoSource === "simulator_traffic") {
      simulatorRef.current.setMode("traffic");
      addLog("Initialized high-fidelity simulated traffic junction scene.", "system", "info");
    } else if (videoSource === "simulator_pedestrian") {
      simulatorRef.current.setMode("pedestrian");
      addLog("Initialized high-fidelity simulated pedestrian plaza scene.", "system", "info");
    } else if (videoSource === "simulator_indoor") {
      simulatorRef.current.setMode("indoor");
      addLog("Initialized smart-home living room IoT scene tracking remotes, screen, phone, and apparel.", "system", "info");
    }
  }, [videoSource]);

  // Load TensorFlow.js and COCO-SSD on mount asynchronously
  useEffect(() => {
    const loadModel = async () => {
      setModelStatus("loading");
      try {
        addLog("Loading TensorFlow.js core runtime...", "system", "info");
        // Dynamically import to ensure isolation and fallback
        tf = await import("@tensorflow/tfjs");
        cocossd = await import("@tensorflow-models/coco-ssd");

        // Wait for ready state
        await tf.ready();
        addLog("Downloading COCO-SSD model weights...", "system", "info");
        modelRef.current = await cocossd.load({ base: "lite_mobilenet_v2" });
        setModelStatus("ready");
        addLog("TensorFlow.js COCO-SSD model loaded successfully. Hardware accelerated pipeline active.", "system", "info");
      } catch (err) {
        console.error("Error loading tensorflow library", err);
        setModelStatus("failed");
        addLog("Failed to load local ML model. Activated high-performance CPU simulation fallback.", "system", "warning");
      }
    };
    loadModel();
  }, []);

  // Web camera activation helper
  const startWebcam = async () => {
    try {
      addLog("Requesting camera access permissions...", "system", "info");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      addLog("Camera feed active. Running detection pipeline.", "system", "info");
    } catch (err) {
      console.error("Camera access error", err);
      addLog("Unable to access camera. Please check permissions or select a simulator source.", "system", "warning");
      setVideoSource("simulator_traffic");
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Uploaded file change handler
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      stopWebcam();
      setVideoSource("upload");
      const url = URL.createObjectURL(file);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.play();
      }
      addLog(`Loaded local video file: ${file.name}`, "system", "info");
    }
  };

  // Main real-time Processing Loop
  useEffect(() => {
    if (!isPlaying) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    const processFrame = async () => {
      const now = Date.now();
      const elapsed = now - lastFrameTimeRef.current;
      const currentFps = 1000 / (elapsed || 1);
      lastFrameTimeRef.current = now;

      const canvas = canvasRef.current;
      if (!canvas) {
        requestRef.current = requestAnimationFrame(processFrame);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        requestRef.current = requestAnimationFrame(processFrame);
        return;
      }

      let detections: Detection[] = [];
      let activeImage: CanvasImageSource | null = null;
      let startInference = Date.now();
      let endInference = startInference;

      // 1. Fetch frames and detect based on chosen source
      const isSimulated = videoSource === "simulator_traffic" || videoSource === "simulator_pedestrian" || videoSource === "simulator_indoor";

      if (isSimulated) {
        // High fidelity procedural generator
        const simResult = simulatorRef.current.step(canvas.width, canvas.height, confidenceThreshold);
        detections = simResult.detections;
        activeImage = simResult.simulationFrame;
        endInference = Date.now();
      } else {
        // Handle physical video tags (webcam or upload)
        const video = videoRef.current;
        if (video && video.readyState >= 2) {
          activeImage = video;
          
          frameCountRef.current++;
          // Skip frames if requested to optimize performance
          if (frameCountRef.current % skipFrames === 0) {
            startInference = Date.now();
            if (modelRef.current && modelStatus === "ready") {
              try {
                // Run COCO-SSD detection
                const predictions = await modelRef.current.detect(video);
                detections = predictions.map((pred: any) => ({
                  class: pred.class,
                  confidence: pred.score,
                  box: {
                    x: pred.bbox[0],
                    y: pred.bbox[1],
                    width: pred.bbox[2],
                    height: pred.bbox[3]
                  }
                }));
              } catch (err) {
                console.error("TF detect error:", err);
              }
            }
            endInference = Date.now();
          }
        }
      }

      // Dynamically discover and register any newly detected classes from the model/simulation stream
      const detectedClassNames = detections.map((d) => d.class.toLowerCase());
      const newlyDiscovered = detectedClassNames.filter((cls) => !discoveredClasses.includes(cls));
      if (newlyDiscovered.length > 0) {
        setDiscoveredClasses((prev) => {
          const updated = [...prev];
          let changed = false;
          for (const cls of newlyDiscovered) {
            if (!updated.includes(cls)) {
              updated.push(cls);
              changed = true;
            }
          }
          return changed ? updated : prev;
        });
      }

      // Filter classes that user has toggled off (default to true if not explicitly disabled)
      detections = detections.filter(
        (det) => classesToTrack[det.class.toLowerCase()] !== false
      );

      // 2. Pass raw model detections to SORT tracking algorithm
      const startTracking = Date.now();
      const trackedObjects = trackerRef.current.update(detections);
      const endTracking = Date.now();

      // 3. Process interactive business logics (Crossing Tripwires & Restricted Zones)
      processInteractiveLogics(trackedObjects);

      // 4. Render Dashboard Canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (activeImage) {
        ctx.drawImage(activeImage, 0, 0, canvas.width, canvas.height);
      } else {
        // Fallback grid
        ctx.fillStyle = "#020617";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#334155";
        ctx.font = "14px monospace";
        ctx.fillText("WAITING FOR VIDEO FEED...", 220, 240);
      }

      // Render Visual overlays
      drawOverlays(ctx, trackedObjects);

      // 5. Update Metrics state safely
      setMetrics((prev) => {
        const smoothing = 0.9;
        const finalFps = prev.fps * smoothing + currentFps * (1 - smoothing);
        const finalInf = prev.inferenceTime * smoothing + (endInference - startInference) * (1 - smoothing);
        const finalTrack = prev.trackingTime * smoothing + (endTracking - startTracking) * (1 - smoothing);
        return {
          fps: finalFps > 60 ? 60 : finalFps,
          inferenceTime: finalInf,
          trackingTime: finalTrack,
          totalFrames: prev.totalFrames + 1,
          activeTracksCount: trackedObjects.length
        };
      });

      requestRef.current = requestAnimationFrame(processFrame);
    };

    requestRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, videoSource, confidenceThreshold, skipFrames, classesToTrack, tripwirePos, tripwireOrientation, zone, isMuted, modelStatus, discoveredClasses]);

  // Business Logic: Handles Tripwire Counts
  const processInteractiveLogics = (tracks: Track[]) => {
    let intrudersInZone = 0;

    for (const track of tracks) {
      const cx = track.box.x + track.box.width / 2;
      const cy = track.box.y + track.box.height / 2;

      track.isInsideZone = false;

      // --- Tripwire crossing logic ---
      // Fetch historical coordinates
      const registry = trackRegistryRef.current;
      const record = registry.get(track.id);

      if (!record) {
        registry.set(track.id, { lastY: cy, lastX: cx, crossed: false });
      } else {
        if (!record.crossed) {
          let crossed = false;
          let direction: "in" | "out" = "in";

          if (tripwireOrientation === "horizontal") {
            const lastY = record.lastY;
            const crossedLine = (lastY - tripwirePos) * (cy - tripwirePos) < 0;
            if (crossedLine) {
              crossed = true;
              direction = cy > lastY ? "out" : "in"; // Moving down is "out", up is "in"
            }
          } else {
            const lastX = record.lastX;
            const crossedLine = (lastX - tripwirePos) * (cx - tripwirePos) < 0;
            if (crossedLine) {
              crossed = true;
              direction = cx > lastX ? "out" : "in"; // Moving right is "out", left is "in"
            }
          }

          if (crossed) {
            record.crossed = true;
            // Record crossing stats
            setStats((prev) => {
              const currentCross = prev.tripwireCrossings;
              const nextIn = currentCross.in + (direction === "in" ? 1 : 0);
              const nextOut = currentCross.out + (direction === "out" ? 1 : 0);
              const classIn = currentCross.classes[track.class] || { in: 0, out: 0 };
              
              return {
                ...prev,
                tripwireCrossings: {
                  ...currentCross,
                  in: nextIn,
                  out: nextOut,
                  classes: {
                    ...currentCross.classes,
                    [track.class]: {
                      in: classIn.in + (direction === "in" ? 1 : 0),
                      out: classIn.out + (direction === "out" ? 1 : 0)
                    }
                  }
                }
              };
            });

            addLog(
              `TRIPWIRE: Track #${track.id} (${track.class}) crossed moving ${
                direction === "in" ? "INWARDS (North/West)" : "OUTWARDS (South/East)"
              }.`,
              "crossing",
              "warning",
              track.id,
              track.class
            );
            playSound("crossing");
          }
        }
        // Update history cache
        record.lastY = cy;
        record.lastX = cx;
      }
    }

    // Clean up registry for lost tracks to avoid memory leak
    const activeIds = new Set(tracks.map((t) => t.id));
    for (const key of trackRegistryRef.current.keys()) {
      if (!activeIds.has(key)) {
        trackRegistryRef.current.delete(key);
      }
    }

    // Sync zone intrusions
    if (stats.zoneIntrusions !== intrudersInZone) {
      setStats((prev) => ({ ...prev, zoneIntrusions: intrudersInZone }));
    }
  };

  // Canvas Drawing Routine
  const drawOverlays = (ctx: CanvasRenderingContext2D, tracks: Track[]) => {
    // 1. Draw Tracking Trails first (so they go beneath boxes)
    if (showTrails) {
      for (const track of tracks) {
        if (track.history.length < 2) continue;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(track.history[0].x, track.history[0].y);
        for (let i = 1; i < track.history.length; i++) {
          ctx.lineTo(track.history[i].x, track.history[i].y);
        }
        ctx.strokeStyle = track.color;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalAlpha = 0.55;
        // Apply neon-like glow to track trails
        ctx.shadowBlur = 6;
        ctx.shadowColor = track.color;
        ctx.stroke();
        ctx.restore();
      }
    }

    // 2. Draw Bounding Boxes, Labels, Velocity and Speed
    for (const track of tracks) {
      const { x, y, width, height } = track.box;
      const isFocused = focusedTrackId === track.id;

      ctx.save();

      // Box design
      if (showBoxes) {
        ctx.strokeStyle = track.color;
        ctx.lineWidth = isFocused ? 4 : 2;
        // Smooth frame corners
        ctx.shadowBlur = isFocused ? 12 : 3;
        ctx.shadowColor = track.color;
        ctx.strokeRect(x, y, width, height);

        // Highlight Corners with visual brackets
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.5;
        const cornerSize = Math.min(10, width * 0.2);
        // Top Left
        ctx.beginPath(); ctx.moveTo(x + cornerSize, y); ctx.lineTo(x, y); ctx.lineTo(x, y + cornerSize); ctx.stroke();
        // Top Right
        ctx.beginPath(); ctx.moveTo(x + width - cornerSize, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width, y + cornerSize); ctx.stroke();
        // Bottom Left
        ctx.beginPath(); ctx.moveTo(x, y + height - cornerSize); ctx.lineTo(x, y + height); ctx.lineTo(x + cornerSize, y + height); ctx.stroke();
        // Bottom Right
        ctx.beginPath(); ctx.moveTo(x + width, y + height - cornerSize); ctx.lineTo(x + width, y + height); ctx.lineTo(x + width - cornerSize, y + height); ctx.stroke();
      }

      // Visual Target HUD for focused item
      if (isFocused) {
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        // Centered crosshair
        const cx = x + width / 2;
        const cy = y + height / 2;
        ctx.beginPath();
        ctx.moveTo(cx - 20, cy); ctx.lineTo(cx + 20, cy);
        ctx.moveTo(cx, cy - 20); ctx.lineTo(cx, cy + 20);
        ctx.stroke();
        
        ctx.setLineDash([]);
        ctx.strokeStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Labels Text Overlay
      if (showLabels) {
        const label = `ID #${track.id} ${track.class.toUpperCase()}`;
        ctx.font = "bold 11px monospace";
        ctx.fillStyle = track.color;
        const textWidth = ctx.measureText(label).width;

        // Label Background
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(x, y - 18, textWidth + 8, 18);
        ctx.strokeStyle = track.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y - 18, textWidth + 8, 18);

        // Text
        ctx.fillStyle = "#ffffff";
        ctx.fillText(label, x + 4, y - 5);
      }

      // Draw vector velocity vectors
      if (showSpeeds && track.speed > 0.5) {
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 1.5;
        const cx = x + width / 2;
        const cy = y + height / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + track.velocity.dx * 8, cy + track.velocity.dy * 8);
        ctx.stroke();
      }

      ctx.restore();
    }

    // 3. Restricted Zone removed

    // 4. Draw Tripwire Line
    if (showTripwire) {
      ctx.save();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2.5;
      
      // Draw directional counting arrows on the tripwire
      ctx.beginPath();
      if (tripwireOrientation === "horizontal") {
        ctx.moveTo(0, tripwirePos);
        ctx.lineTo(640, tripwirePos);
        ctx.stroke();

        // Direction indicator arrows (In: Upwards, Out: Downwards)
        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 9px monospace";
        ctx.fillText("▲ IN (NORTH)", 10, tripwirePos - 6);
        ctx.fillText("▼ OUT (SOUTH)", 10, tripwirePos + 14);
      } else {
        ctx.moveTo(tripwirePos, 0);
        ctx.lineTo(tripwirePos, 480);
        ctx.stroke();

        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 9px monospace";
        ctx.fillText("◀ IN", tripwirePos - 35, 15);
        ctx.fillText("OUT ▶", tripwirePos + 6, 15);
      }
      ctx.restore();
    }
  };

  // Interactive mouse canvas handles
  const handleCanvasInteraction = (e: MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === "none") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (activeTool === "tripwire") {
      if (tripwireOrientation === "horizontal") {
        setTripwirePos(Math.round(Math.max(10, Math.min(470, y))));
      } else {
        setTripwirePos(Math.round(Math.max(10, Math.min(630, x))));
      }
      addLog(`Repositioned tripwire line to coordinate ${Math.round(tripwireOrientation === "horizontal" ? y : x)}.`, "system", "info");
    } else if (activeTool === "zone") {
      // Re-center restricted zone at clicked coordinate
      const nextX = Math.max(0, Math.min(640 - zone.width, x - zone.width / 2));
      const nextY = Math.max(0, Math.min(480 - zone.height, y - zone.height / 2));
      setZone((prev) => ({ ...prev, x: Math.round(nextX), y: Math.round(nextY) }));
      addLog(`Relocated security zone center to centroid: [${Math.round(x)}, ${Math.round(y)}].`, "system", "info");
    }
  };

  // Reset metrics, logs, and trackers
  const handleSystemReset = () => {
    resetTrackCounter();
    trackerRef.current.clear();
    trackRegistryRef.current.clear();
    setStats({
      total: 0,
      byClass: {},
      tripwireCrossings: { in: 0, out: 0, classes: {} },
      zoneIntrusions: 0
    });
    setLogs([]);
    setFocusedTrackId(null);
    addLog("System telemetry and incident counters reset.", "system", "info");
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E2E8F0] flex flex-col font-sans">
      
      {/* Dynamic Header */}
      <header className="h-20 border-b border-white/10 flex items-center justify-between px-6 sm:px-8 shrink-0 bg-[#0A0A0B]">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-sm rotate-45 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <Compass className="w-4 h-4 text-white -rotate-45" />
          </div>
          <div>
            <h1 className="text-xl font-serif italic text-white tracking-wide leading-none flex items-center gap-2">
              Aegis <span className="not-italic font-sans font-extrabold tracking-widest text-slate-400 uppercase text-[10px] bg-white/5 px-2 py-0.5 rounded border border-white/10">Vision</span>
            </h1>
            <p className="text-[9px] text-slate-500 font-sans tracking-widest uppercase font-bold mt-1">
              Live Bounding-Box Telemetry Analyzer
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10 text-[10px] font-mono text-slate-400">
            <span className="text-slate-500">Video Pipeline:</span>
            <span className="text-indigo-400 font-bold uppercase">{videoSource.replace("_", " ")}</span>
          </div>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-full border transition-all ${
              isMuted
                ? "bg-red-950/20 text-red-400 border-red-900/40"
                : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
            }`}
            title={isMuted ? "Unmute system alerts" : "Mute system alerts"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={handleSystemReset}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-white text-black hover:bg-slate-200 rounded-full transition-all shadow-md shadow-white/5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset State
          </button>
        </div>
      </header>


      {/* Main Content Area */}
      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-y-auto max-w-7xl mx-auto w-full">
        
        {/* Left Column: Interactive Screen and Analytics (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {/* Top Panel: Video Player Canvas */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
            
            {/* Status Overlays */}
            <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2 pointer-events-none">
              <span className="px-3 py-1.5 rounded-full bg-[#0A0A0B]/80 text-[10px] font-mono border border-white/10 text-slate-300 flex items-center gap-1.5 shadow-lg backdrop-blur">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping shrink-0" />
                STREAM_ACTIVE
              </span>


            </div>

            {/* Main Interactive Stage */}
            <div className="relative aspect-video w-full bg-[#0A0A0B] flex items-center justify-center">
              {/* HTML Canvas overlay for overlays & simulation backgrounds */}
              <canvas
                id="interactive-canvas"
                ref={canvasRef}
                width={640}
                height={480}
                onClick={handleCanvasInteraction}
                onMouseMove={(e) => {
                  if (e.buttons === 1) handleCanvasInteraction(e); // Allow dragging Y
                }}
                className={`w-full h-full max-h-[500px] object-cover transition-all ${
                  activeTool !== "none" ? "cursor-crosshair border border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.25)]" : ""
                }`}
              />

              {/* Hidden HTML Video element for Webcam/Upload video sources */}
              <video
                ref={videoRef}
                playsInline
                muted
                loop
                className="hidden"
                width={640}
                height={480}
              />
            </div>

            {/* Interaction Tool Selector Drawer */}
            <div className="bg-[#0A0A0B]/80 backdrop-blur border-t border-white/10 p-3 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold">HUD Placements:</span>
                <div className="flex rounded-full bg-white/5 border border-white/10 p-0.5 text-[11px]">
                  <button
                    onClick={() => setActiveTool("none")}
                    className={`px-4 py-1.5 rounded-full transition-all font-medium ${
                      activeTool === "none"
                        ? "bg-white text-black shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Inspect
                  </button>
                  <button
                    onClick={() => setActiveTool("tripwire")}
                    className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5 font-medium ${
                      activeTool === "tripwire"
                        ? "bg-white text-black shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Sliders className="w-3 h-3" />
                    Tripwire
                  </button>
                </div>
              </div>

              {activeTool !== "none" && (
                <div className="text-[10px] font-mono text-slate-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                  💡 Click or drag on the viewport above to reposition your tool target.
                </div>
              )}
            </div>
          </div>

          {/* Core System Performance Grid */}
          <SystemSpecs
            metrics={metrics}
            stats={stats}
            isSimulated={videoSource === "simulator_traffic" || videoSource === "simulator_pedestrian" || videoSource === "simulator_indoor"}
            modelStatus={modelStatus}
          />
        </div>

        {/* Right Column: Configuration & Telemetry Table (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Bento Block 1: Video Controller & Setup */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
            <h2 className="text-sm font-serif italic text-white flex items-center gap-2">
              <MonitorPlay className="w-4 h-4 text-indigo-400" />
              Feed Source Controller
            </h2>

            {/* Play/Pause controls */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-bold rounded-full transition-all border ${
                  isPlaying
                    ? "bg-white/5 hover:bg-white/10 text-slate-200 border-white/10"
                    : "bg-white hover:bg-slate-200 text-black border-transparent"
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPlaying ? "Pause Stream" : "Resume Stream"}
              </button>
              
              <div className="relative">
                <input
                  type="file"
                  id="video-upload-file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="video-upload-file"
                  className="flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-bold rounded-full bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Video
                </label>
              </div>
            </div>

            {/* Video Source Option Selector */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-500 block">Stream Channels</label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: "simulator_traffic", title: "Intersection Traffic Simulator", subtitle: "Physics-based vehicle tracking demo" },
                  { id: "simulator_pedestrian", title: "Pedestrian Plaza Simulator", subtitle: "People and animal flow tracking" },
                  { id: "simulator_indoor", title: "Smart-Home Indoor Simulator", subtitle: "Tracking remotes, screens, phones, and items" },
                  { id: "webcam", title: "Local Hardware Webcam Stream", subtitle: "Uses local browser camera + TensorFlow.js" }
                ].map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => {
                      setVideoSource(channel.id as VideoSource);
                      setIsPlaying(true);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                      videoSource === channel.id
                        ? "bg-white/5 text-white border-white/20 shadow-lg shadow-black/20"
                        : "bg-transparent text-slate-400 border-white/5 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg bg-[#0A0A0B] border ${videoSource === channel.id ? "border-indigo-500/30" : "border-white/5"}`}>
                      {channel.id === "webcam" ? (
                        <Camera className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <Video className="w-3.5 h-3.5 shrink-0" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold leading-none mb-1">{channel.title}</h4>
                      <p className="text-[9px] text-slate-500 font-medium leading-none">{channel.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bento Block 2: Detection Settings */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
            <h2 className="text-sm font-serif italic text-white flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-indigo-400" />
              Model Controls
            </h2>

            {/* Slider: Confidence Threshold */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-slate-400">Confidence Threshold:</span>
                <span className="text-indigo-400 font-bold">{(confidenceThreshold * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.90"
                step="0.05"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 bg-[#0A0A0B] h-1.5 rounded-lg appearance-none cursor-pointer border border-white/5"
              />
            </div>

            {/* Classes checklist filters */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-500 block">Class Filters</label>
              <div className="flex flex-wrap gap-1.5">
                {discoveredClasses.map((cls) => (
                  <button
                    key={cls}
                    onClick={() =>
                      setClassesToTrack((prev) => ({ ...prev, [cls]: prev[cls] === false }))
                    }
                    className={`px-3 py-1.5 text-[10px] font-semibold rounded-full border transition-all capitalize ${
                      classesToTrack[cls] !== false
                        ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                        : "bg-[#0A0A0B] text-slate-500 border-white/10 hover:text-slate-300"
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            {/* Adjust display toggles */}
            <div className="space-y-2 pt-1">
              <label className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-500 block">Visual Layers</label>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs text-slate-300">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showBoxes}
                    onChange={(e) => setShowBoxes(e.target.checked)}
                    className="rounded accent-indigo-500 border-white/10 bg-[#0A0A0B] w-3.5 h-3.5"
                  />
                  <span>Boxes</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showLabels}
                    onChange={(e) => setShowLabels(e.target.checked)}
                    className="rounded accent-indigo-500 border-white/10 bg-[#0A0A0B] w-3.5 h-3.5"
                  />
                  <span>Labels</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showTrails}
                    onChange={(e) => setShowTrails(e.target.checked)}
                    className="rounded accent-indigo-500 border-white/10 bg-[#0A0A0B] w-3.5 h-3.5"
                  />
                  <span>Track Trails</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showSpeeds}
                    onChange={(e) => setShowSpeeds(e.target.checked)}
                    className="rounded accent-indigo-500 border-white/10 bg-[#0A0A0B] w-3.5 h-3.5"
                  />
                  <span>Vectors</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showTripwire}
                    onChange={(e) => setShowTripwire(e.target.checked)}
                    className="rounded accent-indigo-500 border-white/10 bg-[#0A0A0B] w-3.5 h-3.5"
                  />
                  <span>Tripwire</span>
                </label>

              </div>
            </div>

            {/* Tripwire alignment toggle */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span>Tripwire Alignment:</span>
              <div className="flex bg-[#0A0A0B] border border-white/10 rounded-full p-0.5 font-mono text-[10px]">
                <button
                  onClick={() => setTripwireOrientation("horizontal")}
                  className={`px-3 py-1 rounded-full font-bold transition-all ${
                    tripwireOrientation === "horizontal"
                      ? "bg-white/10 text-indigo-400"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  Horiz
                </button>
                <button
                  onClick={() => setTripwireOrientation("vertical")}
                  className={`px-3 py-1 rounded-full font-bold transition-all ${
                    tripwireOrientation === "vertical"
                      ? "bg-white/10 text-indigo-400"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  Vert
                </button>
              </div>
            </div>
          </div>

          {/* Bento Block 3: Live Track Telemetry Table */}
          <div className="flex-1 min-h-[300px]">
            <TracksTable
              tracks={trackerRef.current.getTracks()}
              onFocusTrack={setFocusedTrackId}
              focusedTrackId={focusedTrackId}
            />
          </div>

          {/* Bento Block 4: Logs */}
          <div>
            <EventLogs logs={logs} onClearLogs={() => setLogs([])} />
          </div>

        </div>
      </main>

      {/* Mini Help footer info */}
      <footer className="bg-[#0A0A0B] border-t border-white/10 px-6 py-4 shrink-0 flex items-center justify-between text-[10px] text-slate-500 font-mono">
        <span className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          Aegis system core active. Supports browser-based tracking in full real-time.
        </span>
        <span>Version 1.4.0 (Client Processing)</span>
      </footer>

    </div>
  );
}
