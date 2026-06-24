/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LogEntry } from "../types";
import { ListCollapse, Trash2, ShieldAlert, Navigation, Info, BellRing } from "lucide-react";
import { useState } from "react";

interface EventLogsProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

export function EventLogs({ logs, onClearLogs }: EventLogsProps) {
  const [filter, setFilter] = useState<"all" | "alert" | "warning" | "info">("all");

  const filteredLogs = logs.filter((log) => {
    if (filter === "all") return true;
    return log.severity === filter;
  });

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "alert":
        return "bg-red-500/5 text-red-300 border-red-500/20";
      case "warning":
        return "bg-yellow-500/5 text-yellow-300 border-yellow-500/20";
      default:
        return "bg-[#0A0A0B]/40 text-slate-300 border-white/5 hover:border-white/10";
    }
  };

  const getLogIcon = (type: string, severity: string) => {
    if (severity === "alert" || type === "intrusion") {
      return <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />;
    }
    if (type === "crossing") {
      return <Navigation className="w-4 h-4 text-indigo-400 rotate-90 shrink-0 mt-0.5" />;
    }
    return <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />;
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col h-full min-h-[220px]">
      {/* Header */}
      <div className="px-5 py-4 bg-[#0A0A0B]/50 border-b border-white/10 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <BellRing className="w-4 h-4 text-indigo-400 animate-pulse" />
          <h3 className="text-sm font-serif italic text-white">Incident & Tracking Logs</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClearLogs}
            className="p-1.5 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors border border-transparent hover:border-white/10"
            title="Clear logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-white/5 bg-[#0A0A0B]/20 text-[10px] p-1.5 gap-1.5">
        {(["all", "alert", "warning", "info"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1 rounded-full transition-all capitalize font-sans font-bold tracking-wide ${
              filter === tab
                ? "bg-white text-black shadow"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Log List */}
      <div className="flex-1 overflow-y-auto max-h-[200px] lg:max-h-none p-4 space-y-2.5 font-mono text-[11px] scrollbar-thin scrollbar-thumb-white/10">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-slate-500">
            <ListCollapse className="w-8 h-8 opacity-30 mb-1.5 text-indigo-400" />
            <p className="text-xs font-sans text-slate-400">No logged events</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`p-2.5 rounded-xl border flex gap-3 items-start leading-relaxed transition-all ${getSeverityStyle(
                log.severity
              )}`}
            >
              {getLogIcon(log.type, log.severity)}
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-slate-500 text-[10px]">{log.timestamp}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#0A0A0B] border border-white/5 capitalize text-slate-400 font-sans tracking-wide">
                    {log.type}
                  </span>
                </div>
                <p className="text-slate-300 break-words leading-normal">{log.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
