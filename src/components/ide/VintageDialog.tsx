/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ES4 Studio 2002 - Classic Swing Modal Dialogs (JDialog / JOptionPane)
 */

import React, { useState } from 'react';
import { X, Info, BookOpen, FilePlus } from 'lucide-react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export const SwingDialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  width = 'w-[520px]',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 select-none">
      <div
        className={`${width} bg-[#d4d0c8] swing-bevel-raised-strong shadow-2xl p-1 text-[11px]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Vintage Windows / Swing Titlebar */}
        <div className="swing-titlebar px-2 py-1 flex items-center justify-between">
          <span className="font-bold tracking-wide">{title}</span>
          <button
            onClick={onClose}
            className="w-4 h-4 bg-[#d4d0c8] swing-bevel-raised hover:bg-[#ece9d8] active:swing-bevel-sunken flex items-center justify-center text-black font-bold text-xs"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Dialog Body */}
        <div className="p-3 bg-[#ece9d8] border border-[#808080] m-1 swing-bevel-sunken">
          {children}
        </div>
      </div>
    </div>
  );
};

// New File Dialog
export const NewFileDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onCreate: (fileName: string) => void;
}> = ({ isOpen, onClose, onCreate }) => {
  const [fileName, setFileName] = useState('NewModule.es4');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fileName.trim()) {
      let finalName = fileName.trim();
      if (!finalName.endsWith('.es4')) {
        finalName += '.es4';
      }
      onCreate(finalName);
      onClose();
    }
  };

  return (
    <SwingDialog isOpen={isOpen} onClose={onClose} title="New ES4 Source File">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <FilePlus className="w-6 h-6 text-blue-800 shrink-0" />
          <div>
            <div className="font-bold">Create New ECMAScript 4 Compilation Unit</div>
            <div className="text-gray-600 text-[10px]">
              Specify the file name. The extension '.es4' will be appended automatically.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <label className="w-20 font-semibold">File Name:</label>
          <input
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="flex-1 px-2 py-1 bg-white border border-[#808080] swing-bevel-sunken outline-none font-mono"
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-gray-300">
          <button
            type="submit"
            className="px-4 py-1 bg-[#d4d0c8] swing-bevel-raised hover:bg-white active:swing-bevel-sunken font-bold"
          >
            OK
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1 bg-[#d4d0c8] swing-bevel-raised hover:bg-white active:swing-bevel-sunken"
          >
            Cancel
          </button>
        </div>
      </form>
    </SwingDialog>
  );
};

// ES4 Reference & Quirks Documentation Dialog
export const ES4DocDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  return (
    <SwingDialog
      isOpen={isOpen}
      onClose={onClose}
      title="ECMAScript 4 (2002 Scrapped Draft) Reference Manual"
      width="w-[640px]"
    >
      <div className="flex flex-col gap-2 max-h-[440px] overflow-y-auto pr-1">
        <div className="flex items-center gap-2 border-b border-gray-300 pb-2">
          <BookOpen className="w-6 h-6 text-amber-800 shrink-0" />
          <div>
            <div className="font-bold text-sm">ECMAScript 4 Specification Draft (circa 2002)</div>
            <div className="text-gray-600 text-[10px]">
              The scrapped evolution of JS featuring static types, class systems, and infamous strictness quirks.
            </div>
          </div>
        </div>

        <div className="space-y-2 mt-1">
          <div>
            <h4 className="font-bold text-blue-900">1. Primitive & Strong Typing</h4>
            <p className="text-gray-700">
              ES4 proposed strict primitive types: <code className="bg-gray-200 px-1">int</code> (32-bit signed),{' '}
              <code className="bg-gray-200 px-1">uint</code> (32-bit unsigned),{' '}
              <code className="bg-gray-200 px-1">double</code> (64-bit IEEE 754),{' '}
              <code className="bg-gray-200 px-1">string</code>, and{' '}
              <code className="bg-gray-200 px-1">boolean</code>. Variable declaration format:
              <pre className="bg-white p-1 border border-gray-300 my-1 font-mono text-[10px]">
                var counter: int = 10;{'\n'}const PI: double = 3.14159;{'\n'}var title: string = "Workbench";
              </pre>
            </p>
          </div>

          <div>
            <h4 className="font-bold text-blue-900">2. Classes, Fields & Constructors</h4>
            <p className="text-gray-700">
              Constructors bear the same name as the class. Fields require static types:
              <pre className="bg-white p-1 border border-gray-300 my-1 font-mono text-[10px]">
                class Point &#123;{'\n'}  var x: int;{'\n'}  var y: int;{'\n'}  function Point(x: int, y: int) &#123; this.x = x; this.y = y; &#125;{'\n'}&#125;
              </pre>
            </p>
          </div>

          <div>
            <h4 className="font-bold text-red-900">3. Built-in Scrapped Quirks & Bugs (By Design)</h4>
            <ul className="list-disc pl-4 space-y-1 text-gray-700">
              <li>
                <strong>32-Bit Integer Wrapping:</strong> Integer arithmetic is strictly signed 32-bit. Exceeding{' '}
                <code className="bg-gray-200 px-0.5">2,147,483,647</code> wraps around to negative values via two's complement.
              </li>
              <li>
                <strong>Semicolon Ambiguity Trap:</strong> Unlike modern JS, the ES4 2002 draft strictly enforced semicolons at statement boundaries. Omitting one produces diagnostic <code className="bg-gray-200 px-0.5">[ES4-102]</code>.
              </li>
              <li>
                <strong>Narrowing Truncation:</strong> Assigning a floating-point number to an <code className="bg-gray-200 px-0.5">int</code> generates diagnostic <code className="bg-gray-200 px-0.5">[ES4-203]</code>.
              </li>
              <li>
                <strong>Variable Shadowing Conflict:</strong> Declaring an identifier inside a function that matches an outer scope triggers <code className="bg-gray-200 px-0.5">[ES4-409]</code> requiring explicit override or namespace qualification.
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-blue-900">4. Bytecode & Intermediate Representation</h4>
            <p className="text-gray-700">
              Source code compiles down to an intermediate JSON AST (<code className="bg-gray-200 px-1">.es4ir.json</code>) and then serialized into true binary bytecode (<code className="bg-gray-200 px-1">.es4b</code>) with magic header <code className="bg-gray-200 px-1">0x45 0x53 0x34 0x02</code>, readable by the embedded virtual machine.
            </p>
          </div>
        </div>

        <div className="flex justify-end mt-3 pt-2 border-t border-gray-300">
          <button
            onClick={onClose}
            className="px-4 py-1 bg-[#d4d0c8] swing-bevel-raised hover:bg-white active:swing-bevel-sunken font-bold"
          >
            Close Reference
          </button>
        </div>
      </div>
    </SwingDialog>
  );
};

// Settings / Preferences Dialog
export const SettingsDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  debugFlags: import('../../types').CompilerDebugFlags;
  onToggleFlag: (flag: keyof import('../../types').CompilerDebugFlags) => void;
}> = ({ isOpen, onClose, debugFlags, onToggleFlag }) => {
  return (
    <SwingDialog isOpen={isOpen} onClose={onClose} title="IDE & Compiler Settings">
      <div className="flex flex-col gap-3">
        <div className="border-b border-[#808080] pb-1.5">
          <div className="font-bold text-sm text-[#0a246a]">Preferences & CodeMagic™ Configuration</div>
          <div className="text-gray-600 text-[10px]">
            Configure interactive workspace features and compiler execution flags.
          </div>
        </div>

        {/* Assistant & Help Section */}
        <div className="bg-[#fffde8] border border-[#d4cf96] p-2 rounded-xs swing-bevel-sunken">
          <div className="font-bold text-[#805000] text-[11px] mb-1">Desktop Assistant</div>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={debugFlags.inDepthHelp}
              onChange={() => onToggleFlag('inDepthHelp')}
              className="mt-0.5"
            />
            <div>
              <span className="font-bold text-black text-[11px]">
                In-depth Help (CodeMagic)
              </span>
              <p className="text-gray-600 text-[10px]">
                Spawns Pinny, your animated 2002 CodeMagic™ desktop assistant, providing live interactive tips and unrequested commentary.
              </p>
            </div>
          </label>
        </div>

        {/* Compiler Flags Section */}
        <div className="bg-white border border-[#808080] p-2 rounded-xs swing-bevel-sunken flex flex-col gap-1.5">
          <div className="font-bold text-gray-700 text-[11px] mb-0.5">Compiler & VM Diagnostics</div>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={debugFlags.emitDebugSymbols}
              onChange={() => onToggleFlag('emitDebugSymbols')}
            />
            <span>Emit debug symbols (-g)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={debugFlags.optimizePeephole}
              onChange={() => onToggleFlag('optimizePeephole')}
            />
            <span>Peephole bytecode optimization (-O1)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={debugFlags.strictTypeChecking}
              onChange={() => onToggleFlag('strictTypeChecking')}
            />
            <span>Strict type enforcement (--strict)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={debugFlags.vmTraceCycles}
              onChange={() => onToggleFlag('vmTraceCycles')}
            />
            <span>Trace VM cycles into console log (--trace)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={debugFlags.vmBreakOnError}
              onChange={() => onToggleFlag('vmBreakOnError')}
            />
            <span>Break on runtime exception (-b)</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-1 border-t border-gray-300">
          <button
            onClick={onClose}
            className="px-4 py-1 bg-[#d4d0c8] swing-bevel-raised hover:bg-white active:swing-bevel-sunken font-bold"
          >
            OK
          </button>
        </div>
      </div>
    </SwingDialog>
  );
};

// About Dialog
export const AboutDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  return (
    <SwingDialog isOpen={isOpen} onClose={onClose} title="About ES4 Studio 2002">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#3a6ea5] flex items-center justify-center text-white font-bold text-xl swing-bevel-raised">
            ☕
          </div>
          <div>
            <div className="font-bold text-base text-[#0a246a]">ES4 Studio 2002</div>
            <div className="text-gray-600 text-[10px]">
              Release 1.4.0_02 (Build 20020920-ES4)
            </div>
            <div className="text-gray-600 text-[10px]">
              Java™ 2 Platform, Standard Edition / NetBeans Swing Architecture
            </div>
          </div>
        </div>

        <p className="text-gray-700 leading-relaxed border-t border-b border-gray-300 py-2">
          An authentic 2002 developer environment engineered for the scrapped ECMAScript 4 standard.
          Features embedded recursive descent lexer & parser, CodeMagic™ live completion, JSON Intermediate Representation, true binary bytecode compiler, and virtual machine.
        </p>

        <div className="text-[10px] text-gray-500">
          Licensed under Apache-2.0. Compliant with proposed ECMA TC39 Task Group 1 (1999-2003 drafts).
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-1 bg-[#d4d0c8] swing-bevel-raised hover:bg-white active:swing-bevel-sunken font-bold"
          >
            OK
          </button>
        </div>
      </div>
    </SwingDialog>
  );
};
