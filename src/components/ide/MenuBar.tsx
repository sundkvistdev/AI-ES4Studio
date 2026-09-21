/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ES4 Studio 2002 - Classic Java Swing Menu Bar (JMenuBar)
 */

import React, { useState, useEffect, useRef } from 'react';

interface MenuBarProps {
  onNewFile: () => void;
  onSaveFile: () => void;
  onSelectSample: (id: string) => void;
  onImportBinary: (file: File) => void;
  onExportBinary: () => void;
  onImportIR: (file: File) => void;
  onExportIR: () => void;
  onCompile: () => void;
  onRun: () => void;
  onStep: () => void;
  onPause: () => void;
  onResetVM: () => void;
  onTriggerGC: () => void;
  onClearConsole: () => void;
  onOpenDoc: () => void;
  onOpenAbout: () => void;
  onOpenSettings?: () => void;
  inDepthHelp?: boolean;
  onToggleInDepthHelp?: () => void;
  isVMRunning: boolean;
}

export const MenuBar: React.FC<MenuBarProps> = ({
  onNewFile,
  onSaveFile,
  onSelectSample,
  onImportBinary,
  onExportBinary,
  onImportIR,
  onExportIR,
  onCompile,
  onRun,
  onStep,
  onPause,
  onResetVM,
  onTriggerGC,
  onClearConsole,
  onOpenDoc,
  onOpenAbout,
  onOpenSettings,
  inDepthHelp,
  onToggleInDepthHelp,
  isVMRunning,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const binaryInputRef = useRef<HTMLInputElement>(null);
  const irInputRef = useRef<HTMLInputElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleWindowClick = () => setOpenMenu(null);
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  const handleMenuClick = (e: React.MouseEvent, menuName: string) => {
    e.stopPropagation();
    setOpenMenu(openMenu === menuName ? null : menuName);
  };

  const handleMenuHover = (menuName: string) => {
    if (openMenu !== null) {
      setOpenMenu(menuName);
    }
  };

  return (
    <div className="relative bg-[#d4d0c8] border-b border-[#808080] flex items-center px-1 py-0.5 select-none text-[11px] z-50">
      {/* Hidden File Upload Inputs */}
      <input
        type="file"
        ref={binaryInputRef}
        accept=".es4b,application/octet-stream"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onImportBinary(e.target.files[0]);
          }
        }}
      />
      <input
        type="file"
        ref={irInputRef}
        accept=".json,.es4ir"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onImportIR(e.target.files[0]);
          }
        }}
      />

      {/* File Menu */}
      <div className="relative">
        <button
          onClick={(e) => handleMenuClick(e, 'file')}
          onMouseEnter={() => handleMenuHover('file')}
          className={`px-2 py-0.5 rounded-xs ${
            openMenu === 'file'
              ? 'bg-[#0a246a] text-white'
              : 'hover:bg-[#b8cfe5] text-black'
          }`}
        >
          <span className="underline">F</span>ile
        </button>

        {openMenu === 'file' && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-full mt-0.5 bg-[#d4d0c8] swing-bevel-raised-strong shadow-lg py-0.5 w-56 text-[11px]"
          >
            <div
              className="px-3 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer flex justify-between"
              onClick={() => {
                onNewFile();
                setOpenMenu(null);
              }}
            >
              <span>New ES4 Source File...</span>
              <span className="text-gray-500 hover:text-white text-[10px]">Ctrl+N</span>
            </div>
            <div
              className="px-3 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer flex justify-between"
              onClick={() => {
                onSaveFile();
                setOpenMenu(null);
              }}
            >
              <span>Save Active File</span>
              <span className="text-gray-500 hover:text-white text-[10px]">Ctrl+S</span>
            </div>

            <div className="border-t border-[#808080] border-b border-white my-0.5" />

            <div className="px-3 py-0.5 text-gray-600 font-bold text-[10px]">Sample Projects</div>
            <div
              className="px-4 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer"
              onClick={() => {
                onSelectSample('file_main');
                setOpenMenu(null);
              }}
            >
              Main.es4 (Classes & Types)
            </div>
            <div
              className="px-4 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer"
              onClick={() => {
                onSelectSample('file_quirks');
                setOpenMenu(null);
              }}
            >
              BuggyQuirks.es4 (ES4 Oddities)
            </div>
            <div
              className="px-4 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer"
              onClick={() => {
                onSelectSample('file_fib');
                setOpenMenu(null);
              }}
            >
              Fibonacci.es4 (Cycles Benchmark)
            </div>
            <div
              className="px-4 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer"
              onClick={() => {
                onSelectSample('file_vector');
                setOpenMenu(null);
              }}
            >
              VectorMath.es4 (2D Vectors)
            </div>

            <div className="border-t border-[#808080] border-b border-white my-0.5" />

            <div
              className="px-3 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer"
              onClick={() => {
                onExportBinary();
                setOpenMenu(null);
              }}
            >
              Export Binary (.es4b)...
            </div>
            <div
              className="px-3 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer"
              onClick={() => {
                binaryInputRef.current?.click();
                setOpenMenu(null);
              }}
            >
              Import Binary (.es4b)...
            </div>

            <div className="border-t border-[#808080] border-b border-white my-0.5" />

            <div
              className="px-3 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer"
              onClick={() => {
                onExportIR();
                setOpenMenu(null);
              }}
            >
              Export JSON IR (.es4ir.json)...
            </div>
            <div
              className="px-3 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer"
              onClick={() => {
                irInputRef.current?.click();
                setOpenMenu(null);
              }}
            >
              Import JSON IR (.es4ir.json)...
            </div>
          </div>
        )}
      </div>

      {/* Build Menu */}
      <div className="relative">
        <button
          onClick={(e) => handleMenuClick(e, 'build')}
          onMouseEnter={() => handleMenuHover('build')}
          className={`px-2 py-0.5 rounded-xs ${
            openMenu === 'build'
              ? 'bg-[#0a246a] text-white'
              : 'hover:bg-[#b8cfe5] text-black'
          }`}
        >
          <span className="underline">B</span>uild
        </button>

        {openMenu === 'build' && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-full mt-0.5 bg-[#d4d0c8] swing-bevel-raised-strong shadow-lg py-0.5 w-56 text-[11px]"
          >
            <div
              className="px-3 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer flex justify-between"
              onClick={() => {
                onCompile();
                setOpenMenu(null);
              }}
            >
              <span className="font-semibold">Compile Project</span>
              <span className="text-gray-500 hover:text-white text-[10px]">F7</span>
            </div>
            <div
              className="px-3 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer"
              onClick={() => {
                onCompile();
                setOpenMenu(null);
              }}
            >
              Rebuild to Binary (.es4b)
            </div>
          </div>
        )}
      </div>

      {/* Run Menu */}
      <div className="relative">
        <button
          onClick={(e) => handleMenuClick(e, 'run')}
          onMouseEnter={() => handleMenuHover('run')}
          className={`px-2 py-0.5 rounded-xs ${
            openMenu === 'run'
              ? 'bg-[#0a246a] text-white'
              : 'hover:bg-[#b8cfe5] text-black'
          }`}
        >
          <span className="underline">R</span>un
        </button>

        {openMenu === 'run' && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-full mt-0.5 bg-[#d4d0c8] swing-bevel-raised-strong shadow-lg py-0.5 w-56 text-[11px]"
          >
            <div
              className="px-3 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer flex justify-between font-bold"
              onClick={() => {
                onRun();
                setOpenMenu(null);
              }}
            >
              <span>Execute in ES4 VM</span>
              <span className="text-gray-500 hover:text-white text-[10px]">F5</span>
            </div>
            <div
              className="px-3 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer flex justify-between"
              onClick={() => {
                onStep();
                setOpenMenu(null);
              }}
            >
              <span>Single Step Instruction</span>
              <span className="text-gray-500 hover:text-white text-[10px]">F10</span>
            </div>
            <div
              className={`px-3 py-1 flex justify-between ${
                isVMRunning
                  ? 'hover:bg-[#0a246a] hover:text-white cursor-pointer'
                  : 'text-gray-400 cursor-default'
              }`}
              onClick={() => {
                if (isVMRunning) onPause();
                setOpenMenu(null);
              }}
            >
              <span>Pause VM</span>
              <span className="text-[10px]">Pause</span>
            </div>
            <div
              className="px-3 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer flex justify-between"
              onClick={() => {
                onResetVM();
                setOpenMenu(null);
              }}
            >
              <span>Reset Virtual Machine</span>
              <span className="text-gray-500 hover:text-white text-[10px]">Ctrl+F2</span>
            </div>

            <div className="border-t border-[#808080] border-b border-white my-0.5" />

            <div
              className="px-3 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer"
              onClick={() => {
                onTriggerGC();
                setOpenMenu(null);
              }}
            >
              Run Garbage Collector (GC)
            </div>
          </div>
        )}
      </div>

      {/* Tools Menu */}
      <div className="relative">
        <button
          onClick={(e) => handleMenuClick(e, 'tools')}
          onMouseEnter={() => handleMenuHover('tools')}
          className={`px-2 py-0.5 rounded-xs ${
            openMenu === 'tools'
              ? 'bg-[#0a246a] text-white'
              : 'hover:bg-[#b8cfe5] text-black'
          }`}
        >
          <span className="underline">T</span>ools
        </button>

        {openMenu === 'tools' && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-full mt-0.5 bg-[#d4d0c8] swing-bevel-raised-strong shadow-lg py-0.5 w-56 text-[11px]"
          >
            <div
              className="px-3 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer"
              onClick={() => {
                onClearConsole();
                setOpenMenu(null);
              }}
            >
              Clear Console Output
            </div>
            <div
              className="px-3 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer"
              onClick={() => {
                onTriggerGC();
                setOpenMenu(null);
              }}
            >
              Force Memory Compaction
            </div>

            <div className="border-t border-[#808080] border-b border-white my-0.5" />

            {onToggleInDepthHelp && (
              <div
                className="px-3 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer flex items-center justify-between"
                onClick={() => {
                  onToggleInDepthHelp();
                  setOpenMenu(null);
                }}
              >
                <span>In-depth Help (CodeMagic)</span>
                <span className="font-bold text-[10px]">{inDepthHelp ? '✓' : ''}</span>
              </div>
            )}

            {onOpenSettings && (
              <div
                className="px-3 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer"
                onClick={() => {
                  onOpenSettings();
                  setOpenMenu(null);
                }}
              >
                Settings / Preferences...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Help Menu */}
      <div className="relative">
        <button
          onClick={(e) => handleMenuClick(e, 'help')}
          onMouseEnter={() => handleMenuHover('help')}
          className={`px-2 py-0.5 rounded-xs ${
            openMenu === 'help'
              ? 'bg-[#0a246a] text-white'
              : 'hover:bg-[#b8cfe5] text-black'
          }`}
        >
          <span className="underline">H</span>elp
        </button>

        {openMenu === 'help' && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-full mt-0.5 bg-[#d4d0c8] swing-bevel-raised-strong shadow-lg py-0.5 w-56 text-[11px]"
          >
            <div
              className="px-3 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer font-semibold"
              onClick={() => {
                onOpenDoc();
                setOpenMenu(null);
              }}
            >
              ES4 (2002 Scrapped Draft) Reference
            </div>

            {onToggleInDepthHelp && (
              <div
                className="px-3 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer flex items-center justify-between"
                onClick={() => {
                  onToggleInDepthHelp();
                  setOpenMenu(null);
                }}
              >
                <span>Pinny Assistant (In-depth Help)</span>
                <span className="font-bold text-[10px]">{inDepthHelp ? '✓' : ''}</span>
              </div>
            )}

            <div className="border-t border-[#808080] border-b border-white my-0.5" />
            <div
              className="px-3 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer"
              onClick={() => {
                onOpenAbout();
                setOpenMenu(null);
              }}
            >
              About ES4 Studio 2002...
            </div>
          </div>
        )}
      </div>

      <div className="ml-auto text-[10px] text-[#555] pr-1 font-mono">
        Java 2 Platform, Standard Edition (v1.4.1) [ES4 Target]
      </div>
    </div>
  );
};
