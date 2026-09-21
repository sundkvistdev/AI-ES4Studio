/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ES4 Studio 2002 - Classic IDE Toolbar
 */

import React from 'react';
import { 
  Play, 
  StepForward, 
  Pause, 
  RotateCcw, 
  Save, 
  FilePlus, 
  Binary, 
  Cpu, 
  FileCode, 
  RefreshCw,
  Settings
} from 'lucide-react';
import { CompilerDebugFlags } from '../../types';

interface ToolBarProps {
  onNewFile: () => void;
  onSaveFile: () => void;
  onCompile: () => void;
  onRebuild: () => void;
  onRun: () => void;
  onStep: () => void;
  onPause: () => void;
  onResetVM: () => void;
  onExportBinary: () => void;
  onExportIR: () => void;
  isVMRunning: boolean;
  hasBinary: boolean;
  debugFlags: CompilerDebugFlags;
  onToggleDebugFlag: (flag: keyof CompilerDebugFlags) => void;
  onOpenSettings?: () => void;
}

export const ToolBar: React.FC<ToolBarProps> = ({
  onNewFile,
  onSaveFile,
  onCompile,
  onRebuild,
  onRun,
  onStep,
  onPause,
  onResetVM,
  onExportBinary,
  onExportIR,
  isVMRunning,
  hasBinary,
  debugFlags,
  onToggleDebugFlag,
  onOpenSettings,
}) => {
  return (
    <div className="bg-[#d4d0c8] border-b border-[#808080] px-1.5 py-1 flex items-center gap-1 select-none overflow-x-auto">
      {/* File Controls */}
      <button
        onClick={onNewFile}
        title="New File (Ctrl+N)"
        className="px-2 py-0.5 flex items-center gap-1 bg-[#d4d0c8] swing-bevel-raised hover:bg-[#ece9d8] active:swing-bevel-sunken text-[11px]"
      >
        <FilePlus className="w-3.5 h-3.5 text-blue-800" />
        <span>New</span>
      </button>

      <button
        onClick={onSaveFile}
        title="Save File (Ctrl+S)"
        className="px-2 py-0.5 flex items-center gap-1 bg-[#d4d0c8] swing-bevel-raised hover:bg-[#ece9d8] active:swing-bevel-sunken text-[11px]"
      >
        <Save className="w-3.5 h-3.5 text-blue-900" />
        <span>Save</span>
      </button>

      {/* Toolbar Divider */}
      <div className="w-[2px] h-5 border-l border-[#808080] border-r border-white mx-1" />

      {/* Build Controls */}
      <button
        onClick={onCompile}
        title="Compile active file to ES4 binary bytecode (F7)"
        className="px-2.5 py-0.5 flex items-center gap-1.5 bg-[#d4d0c8] swing-bevel-raised hover:bg-[#ece9d8] active:swing-bevel-sunken text-[11px] font-bold text-blue-950"
      >
        <Cpu className="w-3.5 h-3.5 text-blue-700" />
        <span>Compile (F7)</span>
      </button>

      <button
        onClick={onRebuild}
        title="Clean build artifacts and compile active file"
        className="px-2 py-0.5 flex items-center gap-1 bg-[#d4d0c8] swing-bevel-raised hover:bg-[#ece9d8] active:swing-bevel-sunken text-[11px] text-gray-800"
      >
        <RefreshCw className="w-3.5 h-3.5 text-slate-700" />
        <span>Rebuild</span>
      </button>

      {/* Toolbar Divider */}
      <div className="w-[2px] h-5 border-l border-[#808080] border-r border-white mx-1" />

      {/* Run & Debug Controls */}
      <button
        onClick={onRun}
        disabled={isVMRunning}
        title="Execute program in ES4 VM (F5)"
        className={`px-2.5 py-0.5 flex items-center gap-1.5 text-[11px] font-bold ${
          isVMRunning
            ? 'opacity-50 cursor-not-allowed bg-[#c0bcb4] swing-bevel-sunken text-gray-500'
            : 'bg-[#d4d0c8] swing-bevel-raised hover:bg-[#e4edd8] text-green-800 active:swing-bevel-sunken'
        }`}
      >
        <Play className="w-3.5 h-3.5 fill-green-700 text-green-700" />
        <span>Run (F5)</span>
      </button>

      <button
        onClick={onStep}
        title="Step single instruction (F10)"
        className="px-2 py-0.5 flex items-center gap-1 bg-[#d4d0c8] swing-bevel-raised hover:bg-[#ece9d8] active:swing-bevel-sunken text-[11px] text-blue-900"
      >
        <StepForward className="w-3.5 h-3.5 text-blue-700" />
        <span>Step (F10)</span>
      </button>

      <button
        onClick={onPause}
        disabled={!isVMRunning}
        title="Pause VM Execution"
        className={`px-2 py-0.5 flex items-center gap-1 text-[11px] ${
          !isVMRunning
            ? 'opacity-40 cursor-not-allowed bg-[#c0bcb4] swing-bevel-sunken'
            : 'bg-[#d4d0c8] swing-bevel-raised hover:bg-[#ece9d8] active:swing-bevel-sunken text-amber-900'
        }`}
      >
        <Pause className="w-3.5 h-3.5 text-amber-700" />
        <span>Pause</span>
      </button>

      <button
        onClick={onResetVM}
        title="Reset VM State & Registers"
        className="px-2 py-0.5 flex items-center gap-1 bg-[#d4d0c8] swing-bevel-raised hover:bg-[#ece9d8] active:swing-bevel-sunken text-[11px]"
      >
        <RotateCcw className="w-3.5 h-3.5 text-gray-700" />
        <span>Reset VM</span>
      </button>

      {/* Toolbar Divider */}
      <div className="w-[2px] h-5 border-l border-[#808080] border-r border-white mx-1" />

      {/* Compiler & VM Flags Bar */}
      <div className="flex items-center gap-1 bg-[#cecac2] px-1.5 py-0.5 border border-[#9c9890] rounded-xs">
        <span className="text-[10px] font-bold text-[#555] uppercase tracking-tight">Flags:</span>
        
        {/* Flag: -g Debug Symbols */}
        <button
          onClick={() => onToggleDebugFlag('emitDebugSymbols')}
          title="-g: Emit debug symbols and line numbers in bytecode"
          className={`px-1.5 py-0.5 font-mono text-[10px] font-bold ${
            debugFlags.emitDebugSymbols
              ? 'bg-[#0a246a] text-white swing-bevel-sunken'
              : 'bg-[#d4d0c8] text-gray-700 swing-bevel-raised hover:bg-[#ece9d8]'
          }`}
        >
          -g
        </button>

        {/* Flag: -O1 Peephole Optimization */}
        <button
          onClick={() => onToggleDebugFlag('optimizePeephole')}
          title="-O1: Enable bytecode peephole optimization"
          className={`px-1.5 py-0.5 font-mono text-[10px] font-bold ${
            debugFlags.optimizePeephole
              ? 'bg-[#0a246a] text-white swing-bevel-sunken'
              : 'bg-[#d4d0c8] text-gray-700 swing-bevel-raised hover:bg-[#ece9d8]'
          }`}
        >
          -O1
        </button>

        {/* Flag: --strict Type Checking */}
        <button
          onClick={() => onToggleDebugFlag('strictTypeChecking')}
          title="--strict: Require explicit type annotations on declarations"
          className={`px-1.5 py-0.5 font-mono text-[10px] font-bold ${
            debugFlags.strictTypeChecking
              ? 'bg-[#804000] text-white swing-bevel-sunken'
              : 'bg-[#d4d0c8] text-gray-700 swing-bevel-raised hover:bg-[#ece9d8]'
          }`}
        >
          strict
        </button>

        {/* Flag: --trace VM Cycle Trace */}
        <button
          onClick={() => onToggleDebugFlag('vmTraceCycles')}
          title="--trace: Log IP opcode instruction details on every VM cycle"
          className={`px-1.5 py-0.5 font-mono text-[10px] font-bold ${
            debugFlags.vmTraceCycles
              ? 'bg-[#006020] text-white swing-bevel-sunken'
              : 'bg-[#d4d0c8] text-gray-700 swing-bevel-raised hover:bg-[#ece9d8]'
          }`}
        >
          trace
        </button>

        {/* Flag: -b Break on Error */}
        <button
          onClick={() => onToggleDebugFlag('vmBreakOnError')}
          title="-b: Break into debugger pause on runtime errors"
          className={`px-1.5 py-0.5 font-mono text-[10px] font-bold ${
            debugFlags.vmBreakOnError
              ? 'bg-[#800000] text-white swing-bevel-sunken'
              : 'bg-[#d4d0c8] text-gray-700 swing-bevel-raised hover:bg-[#ece9d8]'
          }`}
        >
          break
        </button>
      </div>

      {/* Toolbar Divider */}
      <div className="w-[2px] h-5 border-l border-[#808080] border-r border-white mx-1" />

      {/* Export Controls */}
      <button
        onClick={onExportBinary}
        disabled={!hasBinary}
        title="Export compiled binary (.es4b)"
        className={`px-2 py-0.5 flex items-center gap-1 text-[11px] ${
          hasBinary
            ? 'bg-[#d4d0c8] swing-bevel-raised hover:bg-[#ece9d8] active:swing-bevel-sunken text-indigo-900'
            : 'opacity-40 cursor-not-allowed bg-[#c0bcb4] swing-bevel-sunken text-gray-500'
        }`}
      >
        <Binary className="w-3.5 h-3.5 text-indigo-700" />
        <span>Export .es4b</span>
      </button>

      <button
        onClick={onExportIR}
        title="Export JSON Intermediate Representation (.es4ir.json)"
        className="px-2 py-0.5 flex items-center gap-1 bg-[#d4d0c8] swing-bevel-raised hover:bg-[#ece9d8] active:swing-bevel-sunken text-[11px] text-purple-900"
      >
        <FileCode className="w-3.5 h-3.5 text-purple-700" />
        <span>Export IR</span>
      </button>

      {/* Toolbar Divider */}
      <div className="w-[2px] h-5 border-l border-[#808080] border-r border-white mx-1" />

      {/* Settings Checkbox: In-depth Help (CodeMagic) */}
      <label 
        title="Toggle Pinny, the interactive 2002 CodeMagic™ desktop assistant"
        className="flex items-center gap-1.5 bg-[#ffffe6] px-2 py-0.5 border border-[#908860] rounded-xs cursor-pointer text-[11px] font-semibold text-[#503500] hover:bg-[#ffffcc] select-none shrink-0"
      >
        <input
          type="checkbox"
          checked={Boolean(debugFlags.inDepthHelp)}
          onChange={() => onToggleDebugFlag('inDepthHelp')}
          className="cursor-pointer accent-[#e53935]"
        />
        <span>In-depth Help (CodeMagic)</span>
      </label>

      {onOpenSettings && (
        <button
          onClick={onOpenSettings}
          title="Open IDE Settings & Compiler Flags"
          className="px-2 py-0.5 flex items-center gap-1 bg-[#d4d0c8] swing-bevel-raised hover:bg-[#ece9d8] active:swing-bevel-sunken text-[11px] text-gray-800 shrink-0"
        >
          <Settings className="w-3.5 h-3.5 text-gray-700" />
          <span>Settings...</span>
        </button>
      )}
    </div>
  );
};
