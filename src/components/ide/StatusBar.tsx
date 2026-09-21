/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ES4 Studio 2002 - Classic Swing Status Bar
 */

import React from 'react';

interface StatusBarProps {
  statusMessage: string;
  cursorLine: number;
  cursorCol: number;
  heapBytes: number;
  onTriggerGC: () => void;
  vmStatus: string;
  compiledTargetName?: string | null;
  isOutdated?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  statusMessage,
  cursorLine,
  cursorCol,
  heapBytes,
  onTriggerGC,
  vmStatus,
  compiledTargetName,
  isOutdated,
}) => {
  const currentKb = Math.round(heapBytes / 1024);
  const maxKb = 65536; // 64MB simulated heap
  const percentage = Math.min(100, Math.max(5, (currentKb / 1024) * 2));

  return (
    <div className="bg-[#d4d0c8] border-t border-[#808080] flex items-center p-0.5 gap-1 select-none text-[11px] font-mono shrink-0 h-6">
      {/* Panel 1: Primary Status Message */}
      <div className="flex-1 px-2 py-0.5 bg-[#d4d0c8] swing-bevel-sunken truncate text-gray-800">
        <span className="font-semibold text-blue-900 mr-1">▶</span>
        <span>{statusMessage || 'Ready'}</span>
      </div>

      {/* Panel 2: Active Compiled Target */}
      <div className="px-2 py-0.5 bg-[#d4d0c8] swing-bevel-sunken text-center truncate max-w-44">
        {compiledTargetName ? (
          <span className={isOutdated ? 'text-amber-800 font-bold' : 'text-blue-950 font-semibold'}>
            Binary: {compiledTargetName}{isOutdated ? '*' : ''}
          </span>
        ) : (
          <span className="text-gray-500 italic">No Binary</span>
        )}
      </div>

      {/* Panel 3: VM Execution Status */}
      <div className="w-24 px-2 py-0.5 bg-[#d4d0c8] swing-bevel-sunken text-center">
        <span className="font-bold text-[#404040]">VM: {vmStatus}</span>
      </div>

      {/* Panel 4: Cursor Line & Col */}
      <div className="w-24 px-2 py-0.5 bg-[#d4d0c8] swing-bevel-sunken text-center">
        <span>
          Ln {cursorLine}, Col {cursorCol}
        </span>
      </div>

      {/* Panel 5: Insert Mode */}
      <div className="w-12 px-1 py-0.5 bg-[#d4d0c8] swing-bevel-sunken text-center text-gray-700">
        INS
      </div>

      {/* Panel 6: Language Target */}
      <div className="w-32 px-2 py-0.5 bg-[#d4d0c8] swing-bevel-sunken text-center text-gray-700">
        ECMAScript 4
      </div>

      {/* Panel 7: Memory Monitor with GC Button */}
      <div className="w-48 px-1.5 py-0.5 bg-[#d4d0c8] swing-bevel-sunken flex items-center justify-between gap-1">
        <div className="flex-1 h-3 bg-gray-200 border border-gray-400 relative overflow-hidden">
          <div
            className="h-full bg-[#3a6ea5] transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-[10px] text-gray-700 shrink-0">
          {currentKb}K / 64M
        </span>
        <button
          onClick={onTriggerGC}
          title="Force JVM/ES4 Garbage Collection"
          className="px-1 py-0 bg-[#ece9d8] swing-bevel-raised hover:bg-white active:swing-bevel-sunken text-[10px] font-bold text-red-900 cursor-pointer"
        >
          GC
        </button>
      </div>
    </div>
  );
};
