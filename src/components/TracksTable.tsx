/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Track } from "../lib/tracker";
import { Gauge, Timer, AlertTriangle, Eye, Car, User, Sparkles } from "lucide-react";

interface TracksTableProps {
  tracks: Track[];
  onFocusTrack: (trackId: number | null) => void;
  focusedTrackId: number | null;
}

export function TracksTable({ tracks, onFocusTrack, focusedTrackId }: TracksTableProps) {
  // Helper to choose class icon
  const getClassIcon = (cls: string) => {
    switch (cls.toLowerCase()) {
      case "car":
      case "truck":
      case "bus":
      case "motorcycle":
        return <Car className="w-4 h-4 text-indigo-400" />;
      case "person":
        return <User className="w-4 h-4 text-purple-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 bg-[#0A0A0B]/50 border-b border-white/10 flex justify-between items-center">
        <h3 className="text-sm font-serif italic text-white flex items-center gap-2">
          <Eye className="w-4 h-4 text-indigo-400 animate-pulse" />
          Active Tracks ({tracks.length})
        </h3>
        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest font-bold">Live telemetry</span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto max-h-[320px] lg:max-h-none scrollbar-thin scrollbar-thumb-white/10">
        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-slate-500 mb-3 border border-white/10">
              <Eye className="w-5 h-5 text-indigo-400" />
            </div>
            <p className="text-xs text-slate-300 font-medium">No objects tracked yet</p>
            <p className="text-[10px] text-slate-500 mt-1 max-w-[220px] leading-relaxed">
              Detected objects with high confidence will spawn persistent active trackers here.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0A0A0B]/30 border-b border-white/10 text-[9px] uppercase font-mono tracking-widest text-slate-500">
                <th className="py-2.5 px-4 font-bold">Obj ID</th>
                <th className="py-2.5 px-4 font-bold">Class</th>
                <th className="py-2.5 px-4 text-right font-bold">Est. Speed</th>
                <th className="py-2.5 px-4 text-right font-bold">Age</th>
                <th className="py-2.5 px-4 text-right font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {tracks.map((track) => {
                const isFocused = focusedTrackId === track.id;
                // Calculate speed in "mph" for display
                const displaySpeed = Math.round(track.speed * 2.8);

                return (
                  <tr
                    key={track.id}
                    onClick={() => onFocusTrack(isFocused ? null : track.id)}
                    className={`cursor-pointer hover:bg-white/5 transition-colors ${
                      isFocused ? "bg-white/5 border-l-2 border-indigo-500" : ""
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold flex items-center gap-2 text-white">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: track.color }}
                      />
                      #{track.id}
                    </td>
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-2 capitalize text-slate-300 font-medium">
                        {getClassIcon(track.class)}
                        {track.class}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Gauge className="w-3.5 h-3.5 text-slate-500" />
                        {displaySpeed} km/h
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Timer className="w-3.5 h-3.5 text-slate-500" />
                        {track.age}f
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {track.isInsideZone ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
                          <AlertTriangle className="w-2.5 h-2.5 text-red-400" />
                          Restricted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
