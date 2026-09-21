/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ES4 Studio 2002 - Tabbed Output Panel
 * Console, Compiler Problems, Bytecode Disassembler, Hex Viewer, JSON IR, and VM Inspector
 */

import React, { useState } from 'react';
import { Diagnostic, DisassembledInstruction, ES4IR, VMOutputEntry, VMState } from '../../types';
import { 
  Terminal, 
  AlertTriangle, 
  Binary, 
  FileCode, 
  Cpu, 
  Trash2, 
  Copy, 
  Download,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface OutputTabsProps {
  logs: VMOutputEntry[];
  diagnostics: Diagnostic[];
  disassembly: DisassembledInstruction[];
  hexDump: string;
  ir: ES4IR | null;
  vmState: VMState;
  compiledSourceFileName?: string | null;
  isCompilationOutdated?: boolean;
  onCompileActiveFile?: () => void;
  onClearLogs: () => void;
  onSelectDiagnostic: (diag: Diagnostic) => void;
  onTriggerGC: () => void;
  onExportBinary: () => void;
  onExportIR: () => void;
}

export const OutputTabs: React.FC<OutputTabsProps> = ({
  logs,
  diagnostics,
  disassembly,
  hexDump,
  ir,
  vmState,
  compiledSourceFileName,
  isCompilationOutdated,
  onCompileActiveFile,
  onClearLogs,
  onSelectDiagnostic,
  onTriggerGC,
  onExportBinary,
  onExportIR,
}) => {
  const [activeTab, setActiveTab] = useState<
    'console' | 'problems' | 'disasm' | 'hex' | 'ir' | 'vm'
  >('console');

  const [copied, setCopied] = useState(false);

  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;

  const handleCopyIR = () => {
    if (!ir) return;
    navigator.clipboard.writeText(JSON.stringify(ir, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-64 bg-[#d4d0c8] swing-bevel-sunken flex flex-col select-none text-[11px] overflow-hidden">
      {/* Tab Headers */}
      <div className="bg-[#d4d0c8] border-b border-[#808080] flex items-end px-1 pt-1 gap-0.5 shrink-0">
        {/* Console Tab */}
        <button
          onClick={() => setActiveTab('console')}
          className={`px-3 py-1 flex items-center gap-1 font-semibold rounded-t-xs border-t border-l border-r ${
            activeTab === 'console'
              ? 'bg-white border-t-[#ffffff] border-l-[#ffffff] border-r-[#808080] -mb-[1px] pb-1.5 z-10 text-black'
              : 'bg-[#d4d0c8] border-[#808080] hover:bg-[#ece9d8] text-gray-700'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-blue-900" />
          <span>Console Output</span>
          {logs.length > 0 && (
            <span className="text-[9px] bg-gray-200 px-1 rounded-full text-gray-700">
              {logs.length}
            </span>
          )}
        </button>

        {/* Problems Tab */}
        <button
          onClick={() => setActiveTab('problems')}
          className={`px-3 py-1 flex items-center gap-1 font-semibold rounded-t-xs border-t border-l border-r ${
            activeTab === 'problems'
              ? 'bg-white border-t-[#ffffff] border-l-[#ffffff] border-r-[#808080] -mb-[1px] pb-1.5 z-10 text-black'
              : 'bg-[#d4d0c8] border-[#808080] hover:bg-[#ece9d8] text-gray-700'
          }`}
        >
          <AlertTriangle
            className={`w-3.5 h-3.5 ${
              errorCount > 0
                ? 'text-red-600'
                : warningCount > 0
                ? 'text-amber-600'
                : 'text-gray-500'
            }`}
          />
          <span>Problems</span>
          {(errorCount > 0 || warningCount > 0) && (
            <span
              className={`text-[9px] px-1 rounded-full font-bold ${
                errorCount > 0
                  ? 'bg-red-100 text-red-700 border border-red-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {errorCount}E / {warningCount}W
            </span>
          )}
        </button>

        {/* Bytecode Disassembler Tab */}
        <button
          onClick={() => setActiveTab('disasm')}
          className={`px-3 py-1 flex items-center gap-1 font-semibold rounded-t-xs border-t border-l border-r ${
            activeTab === 'disasm'
              ? 'bg-white border-t-[#ffffff] border-l-[#ffffff] border-r-[#808080] -mb-[1px] pb-1.5 z-10 text-black'
              : 'bg-[#d4d0c8] border-[#808080] hover:bg-[#ece9d8] text-gray-700'
          }`}
        >
          <Binary className="w-3.5 h-3.5 text-indigo-700" />
          <span>Disassembly</span>
          {compiledSourceFileName && (
            <span className={`text-[9px] px-1 rounded-full ${isCompilationOutdated ? 'bg-amber-200 text-amber-900 font-bold' : 'bg-blue-100 text-blue-900'}`}>
              {isCompilationOutdated ? 'outdated' : 'compiled'}
            </span>
          )}
        </button>

        {/* Hex Viewer Tab */}
        <button
          onClick={() => setActiveTab('hex')}
          className={`px-3 py-1 flex items-center gap-1 font-semibold rounded-t-xs border-t border-l border-r ${
            activeTab === 'hex'
              ? 'bg-white border-t-[#ffffff] border-l-[#ffffff] border-r-[#808080] -mb-[1px] pb-1.5 z-10 text-black'
              : 'bg-[#d4d0c8] border-[#808080] hover:bg-[#ece9d8] text-gray-700'
          }`}
        >
          <Binary className="w-3.5 h-3.5 text-slate-700" />
          <span>Hex Dump</span>
        </button>

        {/* JSON IR Tab */}
        <button
          onClick={() => setActiveTab('ir')}
          className={`px-3 py-1 flex items-center gap-1 font-semibold rounded-t-xs border-t border-l border-r ${
            activeTab === 'ir'
              ? 'bg-white border-t-[#ffffff] border-l-[#ffffff] border-r-[#808080] -mb-[1px] pb-1.5 z-10 text-black'
              : 'bg-[#d4d0c8] border-[#808080] hover:bg-[#ece9d8] text-gray-700'
          }`}
        >
          <FileCode className="w-3.5 h-3.5 text-purple-700" />
          <span>Intermediate Rep (IR)</span>
        </button>

        {/* VM Inspector Tab */}
        <button
          onClick={() => setActiveTab('vm')}
          className={`px-3 py-1 flex items-center gap-1 font-semibold rounded-t-xs border-t border-l border-r ${
            activeTab === 'vm'
              ? 'bg-white border-t-[#ffffff] border-l-[#ffffff] border-r-[#808080] -mb-[1px] pb-1.5 z-10 text-black'
              : 'bg-[#d4d0c8] border-[#808080] hover:bg-[#ece9d8] text-gray-700'
          }`}
        >
          <Cpu className="w-3.5 h-3.5 text-teal-800" />
          <span>VM Inspector</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 bg-white overflow-hidden">
        {/* 1. Console Output View */}
        {activeTab === 'console' && (
          <div className="flex flex-col h-full">
            <div className="bg-[#ece9d8] px-2 py-0.5 border-b border-[#d0ceb6] flex justify-between items-center text-[10px] text-[#404040]">
              <span className="font-semibold text-gray-700">Console Log Output</span>
              <button
                onClick={onClearLogs}
                title="Clear Output"
                className="px-1.5 py-0.5 bg-[#d4d0c8] swing-bevel-raised hover:bg-[#ece9d8] active:swing-bevel-sunken flex items-center gap-1 text-[10px]"
              >
                <Trash2 className="w-3 h-3 text-red-700" />
                <span>Clear</span>
              </button>
            </div>

            <div className="flex-1 overflow-auto p-1.5 font-mono text-[11px] leading-[17px] bg-[#fafafa]">
              {logs.length === 0 ? (
                <div className="text-gray-400 italic">
                  [Program output will appear here. Press 'Run (F5)' or 'Step (F10)'.]
                </div>
              ) : (
                logs.map((log, idx) => {
                  let color = 'text-black';
                  if (log.type === 'stderr') color = 'text-red-700 font-semibold';
                  else if (log.type === 'info') color = 'text-blue-800';
                  else if (log.type === 'gc') color = 'text-purple-800 font-semibold';

                  return (
                    <div key={idx} className={`flex items-start gap-2 ${color}`}>
                      <span className="text-gray-400 text-[10px] select-none shrink-0">
                        [{log.timestamp}]
                      </span>
                      <span className="whitespace-pre-wrap">{log.text}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 2. Compiler Problems View */}
        {activeTab === 'problems' && (
          <div className="flex flex-col h-full">
            <div className="bg-[#ece9d8] px-2 py-0.5 border-b border-[#d0ceb6] flex justify-between items-center text-[10px] text-[#404040]">
              <span>
                Diagnostics ({diagnostics.length} item{diagnostics.length === 1 ? '' : 's'})
              </span>
            </div>

            <div className="flex-1 overflow-auto">
              {diagnostics.length === 0 ? (
                <div className="flex items-center gap-2 p-4 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span>No syntax or type errors detected in active file.</span>
                </div>
              ) : (
                <table className="w-full text-left font-mono text-[11px] border-collapse">
                  <thead className="bg-[#f0eed8] border-b border-[#c0beb6] text-gray-700 text-[10px]">
                    <tr>
                      <th className="p-1 w-16">Severity</th>
                      <th className="p-1 w-24">Code</th>
                      <th className="p-1">Description</th>
                      <th className="p-1 w-20">Line : Col</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagnostics.map((d) => (
                      <tr
                        key={d.id}
                        onClick={() => onSelectDiagnostic(d)}
                        className="hover:bg-[#f0f4f8] cursor-pointer border-b border-gray-100"
                      >
                        <td className="p-1">
                          {d.severity === 'error' ? (
                            <span className="text-red-600 font-bold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Error
                            </span>
                          ) : (
                            <span className="text-amber-600 font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Warn
                            </span>
                          )}
                        </td>
                        <td className="p-1 text-blue-900 font-semibold">[{d.code}]</td>
                        <td className="p-1 text-gray-800">{d.message}</td>
                        <td className="p-1 text-gray-500">
                          {d.line}:{d.col}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* 3. Disassembler View */}
        {activeTab === 'disasm' && (
          <div className="flex flex-col h-full">
            <div className="bg-[#ece9d8] px-2 py-1 border-b border-[#d0ceb6] flex justify-between items-center text-[10px]">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-800">
                  Target: <span className="font-mono text-blue-900 font-bold">{compiledSourceFileName || '(No active binary)'}</span>
                </span>
                {compiledSourceFileName && (
                  <span className="text-gray-500 font-mono">
                    ({disassembly.length} opcodes)
                  </span>
                )}
                {isCompilationOutdated && (
                  <span className="bg-amber-100 border border-amber-300 text-amber-900 px-1.5 py-0.5 rounded-xs font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-700" />
                    <span>File modified since build</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {onCompileActiveFile && (
                  <button
                    onClick={onCompileActiveFile}
                    className="px-2 py-0.5 bg-[#d4d0c8] swing-bevel-raised hover:bg-[#ece9d8] active:swing-bevel-sunken flex items-center gap-1 text-[10px] text-blue-950 font-bold"
                  >
                    <RefreshCw className="w-3 h-3 text-blue-800" />
                    <span>Compile Active File (F7)</span>
                  </button>
                )}
                <button
                  onClick={onExportBinary}
                  disabled={disassembly.length === 0}
                  className="px-2 py-0.5 bg-[#d4d0c8] swing-bevel-raised hover:bg-[#ece9d8] active:swing-bevel-sunken flex items-center gap-1 text-[10px] disabled:opacity-40"
                >
                  <Download className="w-3 h-3 text-indigo-700" />
                  <span>Export .es4b</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-1.5 font-mono text-[11px] bg-[#ffffff]">
              {disassembly.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2 p-4">
                  <div>No bytecode is currently compiled for this project.</div>
                  {onCompileActiveFile && (
                    <button
                      onClick={onCompileActiveFile}
                      className="px-3 py-1 bg-[#d4d0c8] swing-bevel-raised hover:bg-[#ece9d8] text-xs font-bold text-blue-900"
                    >
                      Compile Active File Now (F7)
                    </button>
                  )}
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#f0eed8] border-b border-[#c0beb6] text-gray-700 text-[10px]">
                    <tr>
                      <th className="p-1 w-16">Offset</th>
                      <th className="p-1 w-28">Raw Bytes</th>
                      <th className="p-1 w-32">Mnemonic</th>
                      <th className="p-1 w-32">Operand</th>
                      <th className="p-1">Comment / Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {disassembly.map((inst, idx) => {
                      const isCurrentIP = vmState.ip === idx;
                      return (
                        <tr
                          key={idx}
                          className={`border-b border-gray-100 ${
                            isCurrentIP ? 'bg-[#fffae6] font-bold text-blue-900' : 'hover:bg-[#f8f8f8]'
                          }`}
                        >
                          <td className="p-1 text-gray-500">
                            {isCurrentIP && <span className="text-yellow-600 mr-1">▶</span>}
                            0x{inst.offset.toString(16).padStart(4, '0')}
                          </td>
                          <td className="p-1 text-gray-400">
                            {inst.bytes.map((b) => b.toString(16).padStart(2, '0')).join(' ')}
                          </td>
                          <td className="p-1 font-semibold text-blue-800">{inst.mnemonic}</td>
                          <td className="p-1 text-teal-800">{inst.argDisplay || ''}</td>
                          <td className="p-1 text-gray-500 italic">{inst.comment || ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* 4. Hex Dump View */}
        {activeTab === 'hex' && (
          <div className="flex flex-col h-full">
            <div className="bg-[#ece9d8] px-2 py-0.5 border-b border-[#d0ceb6] flex justify-between items-center text-[10px]">
              <span className="text-gray-700 font-mono">
                Hex Dump {compiledSourceFileName ? `(${compiledSourceFileName}.es4b)` : ''}
              </span>
              <button
                onClick={onExportBinary}
                disabled={!hexDump}
                className="px-1.5 py-0.5 bg-[#d4d0c8] swing-bevel-raised hover:bg-[#ece9d8] active:swing-bevel-sunken flex items-center gap-1 text-[10px] disabled:opacity-40"
              >
                <Download className="w-3 h-3 text-slate-700" />
                <span>Download Binary</span>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-1.5 font-mono text-[11px] leading-[18px] bg-white text-gray-800 whitespace-pre">
              {hexDump || '[Compile active file to generate binary hex dump]'}
            </div>
          </div>
        )}

        {/* 5. JSON IR View */}
        {activeTab === 'ir' && (
          <div className="flex flex-col h-full">
            <div className="bg-[#ece9d8] px-2 py-0.5 border-b border-[#d0ceb6] flex justify-between items-center text-[10px]">
              <span className="text-gray-700 font-mono">
                Intermediate Representation (IR) {compiledSourceFileName ? `(${compiledSourceFileName})` : ''}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopyIR}
                  disabled={!ir}
                  className="px-1.5 py-0.5 bg-[#d4d0c8] swing-bevel-raised hover:bg-[#ece9d8] active:swing-bevel-sunken flex items-center gap-1 text-[10px] disabled:opacity-40"
                >
                  <Copy className="w-3 h-3 text-purple-700" />
                  <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
                </button>
                <button
                  onClick={onExportIR}
                  disabled={!ir}
                  className="px-1.5 py-0.5 bg-[#d4d0c8] swing-bevel-raised hover:bg-[#ece9d8] active:swing-bevel-sunken flex items-center gap-1 text-[10px] disabled:opacity-40"
                >
                  <Download className="w-3 h-3 text-purple-700" />
                  <span>Export JSON</span>
                </button>
              </div>
            </div>

            <pre className="flex-1 overflow-auto p-2 font-mono text-[11px] leading-[16px] bg-[#ffffff] text-gray-800">
              {ir ? JSON.stringify(ir, null, 2) : '// No Intermediate Representation compiled yet.'}
            </pre>
          </div>
        )}

        {/* 6. VM Inspector & Heap View */}
        {activeTab === 'vm' && (
          <div className="flex flex-col h-full">
            <div className="bg-[#ece9d8] px-2 py-0.5 border-b border-[#d0ceb6] flex justify-between items-center text-[10px]">
              <div className="flex items-center gap-3">
                <span className="font-bold">
                  Status: <span className="text-blue-800">{vmState.status}</span>
                </span>
                <span>
                  Target: <span className="font-mono text-indigo-900 font-semibold">{compiledSourceFileName || 'None'}</span>
                </span>
                <span>
                  IP: <code className="text-teal-800">0x{vmState.ip.toString(16)}</code>
                </span>
                <span>
                  Cycles: <code className="text-purple-800">{vmState.cycles}</code>
                </span>
                <span>
                  Heap: <code>{Math.round(vmState.heapBytesAllocated / 1024)} KB</code>
                </span>
              </div>
              <button
                onClick={onTriggerGC}
                className="px-1.5 py-0.5 bg-[#d4d0c8] swing-bevel-raised hover:bg-[#f0dfdf] active:swing-bevel-sunken flex items-center gap-1 text-[10px] text-red-900"
              >
                <Trash2 className="w-3 h-3 text-red-700" />
                <span>Run Garbage Collection</span>
              </button>
            </div>

            <div className="flex-1 grid grid-cols-3 gap-1 overflow-hidden p-1 font-mono text-[11px]">
              {/* Stack Inspector */}
              <div className="border border-gray-300 flex flex-col overflow-hidden">
                <div className="bg-[#ece9d8] p-1 font-bold text-gray-700 border-b border-gray-300 text-[10px]">
                  Operand Stack ({vmState.stack.length})
                </div>
                <div className="flex-1 overflow-auto p-1 bg-gray-50">
                  {vmState.stack.length === 0 ? (
                    <span className="text-gray-400 italic">(Empty Stack)</span>
                  ) : (
                    vmState.stack.map((item, idx) => (
                      <div key={idx} className="flex justify-between py-0.5 border-b border-gray-200">
                        <span className="text-gray-400">[{idx}]</span>
                        <span className="font-semibold text-blue-900">{JSON.stringify(item.value)}</span>
                        <span className="text-teal-700 text-[9px]">({item.type})</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Globals Inspector */}
              <div className="border border-gray-300 flex flex-col overflow-hidden">
                <div className="bg-[#ece9d8] p-1 font-bold text-gray-700 border-b border-gray-300 text-[10px]">
                  Global Variables ({Object.keys(vmState.globals).length})
                </div>
                <div className="flex-1 overflow-auto p-1 bg-gray-50">
                  {Object.keys(vmState.globals).length === 0 ? (
                    <span className="text-gray-400 italic">(No globals defined)</span>
                  ) : (
                    Object.entries(vmState.globals).map(([k, v]) => (
                      <div key={k} className="flex justify-between py-0.5 border-b border-gray-200">
                        <span className="font-bold text-gray-700">{k}:</span>
                        <span className="text-blue-900 truncate max-w-[120px]">
                          {JSON.stringify(v.value)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Call Stack Inspector */}
              <div className="border border-gray-300 flex flex-col overflow-hidden">
                <div className="bg-[#ece9d8] p-1 font-bold text-gray-700 border-b border-gray-300 text-[10px]">
                  Call Frames ({vmState.callStack.length})
                </div>
                <div className="flex-1 overflow-auto p-1 bg-gray-50">
                  {vmState.callStack.length === 0 ? (
                    <span className="text-gray-400 italic">(Top-level execution frame)</span>
                  ) : (
                    vmState.callStack.map((frame, idx) => (
                      <div key={idx} className="py-0.5 border-b border-gray-200">
                        <div className="font-semibold text-purple-900">{frame.functionName}</div>
                        <div className="text-[10px] text-gray-500">
                          Return IP: 0x{frame.returnIP.toString(16)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
