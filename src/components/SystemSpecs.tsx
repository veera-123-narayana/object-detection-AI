/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SystemMetrics, CountingStats } from "../types";
import { Cpu, Film, TrendingUp, AlertTriangle, LogIn, LogOut } from "lucide-react";

interface SystemSpecsProps {
  metrics: SystemMetrics;
  stats: CountingStats;
  isSimulated: boolean;
  modelStatus: "loading" | "ready" | "failed" | "uninitialized";
}

export function SystemSpecs({ metrics, stats, isSimulated, modelStatus }: SystemSpecsProps) {
  // Determine model status color badge
  const getStatusBadge = () => {
    switch (modelStatus) {
      case "ready":
        return <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">LOCAL_COCO_READY</span>;
      case "loading":
        return <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 animate-pulse">DOWNLOADING_WEIGHTS...</span>;
      case "failed":
        return <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">FALLBACK_SIMULATOR</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-white/5 text-slate-500 border border-white/10">UNINITIALIZED</span>;
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* FPS Card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden transition-all hover:bg-white/10">
        <div className="absolute top-0 right-0 p-4 opacity-[0.06]">
          <Cpu className="w-16 h-16 text-indigo-400" />
        </div>
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold block mb-1">FPS Engine</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-bold font-mono tracking-tight text-white">
              {metrics.fps.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500 font-mono">FPS</span>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${metrics.fps > 20 ? "bg-indigo-500 animate-pulse" : "bg-yellow-500"}`} />
          <span className="text-[10px] text-slate-400 font-sans tracking-wide">
            {isSimulated ? "Simulated pipeline" : "Hardware Stream"}
          </span>
        </div>
      </div>

      {/* Latency Card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden transition-all hover:bg-white/10">
        <div className="absolute top-0 right-0 p-4 opacity-[0.06]">
          <TrendingUp className="w-16 h-16 text-indigo-400" />
        </div>
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold block mb-1">Inference Speed</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-bold font-mono tracking-tight text-white">
              {metrics.inferenceTime > 0 ? `${Math.round(metrics.inferenceTime)}` : "—"}
            </span>
            {metrics.inferenceTime > 0 && <span className="text-xs text-slate-500 font-mono">MS</span>}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Status:</span>
          {getStatusBadge()}
        </div>
      </div>

      {/* Tripwire Crossings Card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden transition-all hover:bg-white/10">
        <div className="absolute top-0 right-0 p-4 opacity-[0.06]">
          <Film className="w-16 h-16 text-indigo-400" />
        </div>
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold block mb-1">Tripwire Count</span>
          <div className="flex items-baseline gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <LogIn className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-2xl font-extrabold font-mono text-slate-200">{stats.tripwireCrossings.in}</span>
              <span className="text-[9px] text-slate-500 font-mono font-bold">IN</span>
            </div>
            <div className="flex items-center gap-1.5">
              <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="text-2xl font-extrabold font-mono text-slate-200">{stats.tripwireCrossings.out}</span>
              <span className="text-[9px] text-slate-500 font-mono font-bold">OUT</span>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-sans">
          <span className="text-slate-500 uppercase tracking-wider text-[9px] font-mono font-bold">Total crossings:</span>
          <span className="font-bold text-white bg-white/5 px-2 py-0.5 rounded border border-white/5">{stats.tripwireCrossings.in + stats.tripwireCrossings.out}</span>
        </div>
      </div>

      {/* Restricted Zone Violations */}
      <div className={`border rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden transition-all ${
        stats.zoneIntrusions > 0 
          ? "bg-red-950/20 border-red-500/30" 
          : "bg-white/5 border-white/10 hover:bg-white/10"
      }`}>
        <div className="absolute top-0 right-0 p-4 opacity-[0.06]">
          <AlertTriangle className={`w-16 h-16 ${stats.zoneIntrusions > 0 ? "text-red-500" : "text-indigo-400"}`} />
        </div>
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold block mb-1">Security Zones</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-3xl font-extrabold font-mono tracking-tight ${stats.zoneIntrusions > 0 ? "text-red-400 animate-pulse" : "text-white"}`}>
              {stats.zoneIntrusions}
            </span>
            <span className="text-xs text-slate-500 font-mono">INTRUDERS</span>
          </div>
        </div>
        <div className="mt-4">
          {stats.zoneIntrusions > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] bg-red-500/10 text-red-400 font-bold uppercase tracking-wider font-mono border border-red-500/20 animate-pulse">
              ⚠️ ZONE BREACH ACTIVE
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 font-sans">No violations logged</span>
          )}
        </div>
      </div>
    </div>
  );
}
