/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ES4 Studio 2002 - ECMAScript 4 Developer Workbench
 * Classic 2002 IDE Architecture with Full Multi-Project Support
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Project, 
  ProjectFile, 
  Diagnostic, 
  ES4IR, 
  DisassembledInstruction, 
  VMState, 
  VMOutputEntry, 
  CompilerDebugFlags,
  CompilationArtifactInfo
} from './types';
import { SAMPLE_PROJECTS } from './samples/sampleCode';
import { ES4Parser } from './compiler/parser';
import { ES4CodeGen } from './compiler/codegen';
import { BinaryCompiler } from './compiler/binary';
import { ES4VirtualMachine } from './vm/engine';
import { MenuBar } from './components/ide/MenuBar';
import { ToolBar } from './components/ide/ToolBar';
import { ProjectExplorer } from './components/ide/ProjectExplorer';
import { OutputTabs } from './components/ide/OutputTabs';
import { StatusBar } from './components/ide/StatusBar';
import { CodeEditor } from './components/editor/CodeEditor';
import { AboutDialog, ES4DocDialog, NewFileDialog, SettingsDialog } from './components/ide/VintageDialog';
import { Pinny } from './components/assistant/Pinny';
import { X, FileText, Binary as BinaryIcon, FileCode } from 'lucide-react';

export default function App() {
  // Multi-Project State
  const [projects, setProjects] = useState<Project[]>(SAMPLE_PROJECTS);
  const [activeProjectId, setActiveProjectId] = useState<string>(SAMPLE_PROJECTS[0].id);

  // Active Project Reference
  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectId) || projects[0];
  }, [projects, activeProjectId]);

  const files = activeProject.files;

  // Active Document Tab State
  const [activeFileId, setActiveFileId] = useState<string>(SAMPLE_PROJECTS[0].files[0]?.id || 'file_main');
  const [openFileIds, setOpenFileIds] = useState<string[]>([
    SAMPLE_PROJECTS[0].files[0]?.id || 'file_main',
    SAMPLE_PROJECTS[0].files[1]?.id || 'file_quirks'
  ]);

  // Compiler Flags
  const [debugFlags, setDebugFlags] = useState<CompilerDebugFlags>({
    emitDebugSymbols: true,
    optimizePeephole: true,
    strictTypeChecking: false,
    pedanticWarnings: false,
    vmTraceCycles: false,
    vmBreakOnError: false,
    inDepthHelp: false,
  });

  // Editor Cursor & Gutter
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);
  const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [statusMessage, setStatusMessage] = useState('Ready (ES4 Studio 2002 initialized)');

  // Compiler Artifact State
  const [compiledArtifact, setCompiledArtifact] = useState<CompilationArtifactInfo | null>(null);
  const [ir, setIR] = useState<ES4IR | null>(null);
  const [binaryData, setBinaryData] = useState<Uint8Array | null>(null);
  const [disassembly, setDisassembly] = useState<DisassembledInstruction[]>([]);
  const [hexDump, setHexDump] = useState<string>('');

  // VM Engine
  const vmRef = useRef<ES4VirtualMachine>(new ES4VirtualMachine());
  const [vmState, setVMState] = useState<VMState>(vmRef.current.getState());
  const [logs, setLogs] = useState<VMOutputEntry[]>([]);
  const [activeExecutionLine, setActiveExecutionLine] = useState<number | undefined>(undefined);

  // Dialogs
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Toggle debug or assistant flags
  const handleToggleDebugFlag = useCallback((flag: keyof CompilerDebugFlags) => {
    setDebugFlags((prev) => {
      const next = { ...prev, [flag]: !prev[flag] };
      vmRef.current.setDebugFlags(next);
      if (flag === 'inDepthHelp') {
        setStatusMessage(next.inDepthHelp ? 'In-depth Help (CodeMagic) enabled: Pinny has arrived!' : 'In-depth Help disabled.');
      } else {
        setStatusMessage(`Flag ${flag} set to ${next[flag]}`);
      }
      return next;
    });
  }, []);

  // Current active file
  const activeFile = useMemo(() => {
    return files.find((f) => f.id === activeFileId) || files[0];
  }, [files, activeFileId]);

  // Setup VM output and state listeners
  useEffect(() => {
    const vm = vmRef.current;
    vm.setOutputCallback((entry) => {
      setLogs((prev) => [...prev, entry]);
    });
    vm.setStateChangeCallback((state) => {
      setVMState(state);
    });
  }, []);

  // Update files in the active project helper
  const setFiles = useCallback((updater: (prevFiles: ProjectFile[]) => ProjectFile[]) => {
    setProjects((prevProjects) =>
      prevProjects.map((p) => {
        if (p.id === activeProjectId) {
          return { ...p, files: updater(p.files) };
        }
        return p;
      })
    );
  }, [activeProjectId]);

  // Handle active file content changes
  const handleContentChange = (newContent: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === activeFileId
          ? { ...f, content: newContent, isModified: true }
          : f
      )
    );

    // If active file was compiled, mark the artifact as outdated
    if (compiledArtifact && compiledArtifact.sourceFileId === activeFileId) {
      setCompiledArtifact((prev) => (prev ? { ...prev, isOutdated: true } : null));
    }
  };

  // Toggle Breakpoint on gutter
  const handleToggleBreakpoint = (line: number) => {
    setBreakpoints((prev) => {
      const next = new Set(prev);
      if (next.has(line)) {
        next.delete(line);
        setStatusMessage(`Removed breakpoint at line ${line}`);
      } else {
        next.add(line);
        setStatusMessage(`Set breakpoint at line ${line}`);
      }
      vmRef.current.setBreakpoints(next);
      return next;
    });
  };

  // Switch Project
  const handleSelectProject = (projectId: string) => {
    const proj = projects.find((p) => p.id === projectId);
    if (!proj) return;
    setActiveProjectId(projectId);

    const main = proj.files.find((f) => f.name === 'Main.es4') || proj.files[0];
    if (main) {
      setActiveFileId(main.id);
      setOpenFileIds([main.id]);
    } else {
      setOpenFileIds([]);
    }

    // Reset old compilation state so that no stale instructions persist across projects
    setIR(null);
    setBinaryData(null);
    setDisassembly([]);
    setHexDump('');
    setCompiledArtifact(null);
    setDiagnostics([]);
    vmRef.current.reset();
    setStatusMessage(`Switched project to: ${proj.name}`);
  };

  // Create New Project
  const handleCreateProject = (name: string) => {
    const newProjId = `proj_${Date.now()}`;
    const starterFile: ProjectFile = {
      id: `file_${Date.now()}_main`,
      name: 'Main.es4',
      path: 'src/Main.es4',
      type: 'es4',
      content: `// ====================================\n// ${name} - ECMAScript 4 Application\n// ====================================\n\npackage ${name.toLowerCase().replace(/[^a-z0-9]/g, '')} {\n  class Application {\n    public var title: string = "${name}";\n\n    public function run(): void {\n      print("Running " + this.title);\n    }\n  }\n\n  var app: Application = new Application();\n  app.run();\n}\n`,
    };

    const newProject: Project = {
      id: newProjId,
      name,
      description: 'User Created Project',
      files: [starterFile],
    };

    setProjects((prev) => [...prev, newProject]);
    setActiveProjectId(newProjId);
    setActiveFileId(starterFile.id);
    setOpenFileIds([starterFile.id]);

    // Reset artifacts
    setIR(null);
    setBinaryData(null);
    setDisassembly([]);
    setHexDump('');
    setCompiledArtifact(null);
    setDiagnostics([]);
    vmRef.current.reset();
    setStatusMessage(`Created project "${name}".`);
  };

  // Delete Project
  const handleDeleteProject = (projId: string) => {
    if (projects.length <= 1) {
      alert("Cannot delete the only project in the workspace.");
      return;
    }
    const remaining = projects.filter((p) => p.id !== projId);
    setProjects(remaining);
    if (activeProjectId === projId) {
      handleSelectProject(remaining[0].id);
    }
    setStatusMessage(`Deleted project.`);
  };

  // Compile Target File
  const handleCompile = useCallback((target?: ProjectFile) => {
    const fileToCompile = target || ((activeFile && activeFile.type === 'es4') ? activeFile : files.find((f) => f.type === 'es4'));
    if (!fileToCompile) {
      setStatusMessage('No ES4 source file available to compile.');
      return;
    }

    setStatusMessage(`Compiling ${fileToCompile.name}...`);

    try {
      // 1. Parse AST
      const parser = new ES4Parser(fileToCompile.content);
      const parseResult = parser.parse();
      setDiagnostics(parseResult.diagnostics);

      const hasFatalErrors = parseResult.diagnostics.some((d) => d.severity === 'error');
      if (hasFatalErrors) {
        setStatusMessage(
          `Build FAILED: ${parseResult.diagnostics.filter((d) => d.severity === 'error').length} error(s) in ${fileToCompile.name}`
        );
        return;
      }

      // 2. Generate JSON IR
      const codeGen = new ES4CodeGen(fileToCompile.name, debugFlags);
      const generatedIR = codeGen.compile(parseResult.ast);
      setIR(generatedIR);

      // 3. Compile to Binary Bytecode
      const binary = BinaryCompiler.compileToBinary(generatedIR);
      setBinaryData(binary);

      // 4. Disassemble & Hex Dump
      const disasm = BinaryCompiler.disassemble(generatedIR);
      setDisassembly(disasm);
      const hex = BinaryCompiler.generateHexDump(binary);
      setHexDump(hex);

      // 5. Load into VM
      vmRef.current.load(generatedIR);

      // 6. Update artifact info
      const binName = fileToCompile.name.replace('.es4', '.es4b');
      const irName = fileToCompile.name.replace('.es4', '.es4ir.json');

      setCompiledArtifact({
        sourceFileId: fileToCompile.id,
        sourceFileName: fileToCompile.name,
        timestamp: new Date().toLocaleTimeString(),
        binarySize: binary.length,
        opcodeCount: disasm.length,
        isOutdated: false,
      });

      // 7. Update Project Files in Explorer
      setFiles((prev) => {
        const withoutOld = prev.filter((f) => f.name !== binName && f.name !== irName);
        return [
          ...withoutOld.map((f) => f.id === fileToCompile.id ? { ...f, isModified: false } : f),
          {
            id: `bin_${Date.now()}`,
            name: binName,
            path: `bin/${binName}`,
            type: 'es4b',
            content: '',
            binaryData: binary,
          },
          {
            id: `ir_${Date.now()}`,
            name: irName,
            path: `bin/${irName}`,
            type: 'es4ir',
            content: JSON.stringify(generatedIR, null, 2),
          },
        ];
      });

      setStatusMessage(
        `Build SUCCESS: ${fileToCompile.name} -> ${binName} (${binary.length} bytes, ${disasm.length} opcodes)`
      );
    } catch (err: any) {
      setStatusMessage(`Compiler Error: ${err.message}`);
    }
  }, [activeFile, files, debugFlags, setFiles]);

  // Clean Rebuild
  const handleRebuild = useCallback(() => {
    // Clear old assembly completely
    setIR(null);
    setBinaryData(null);
    setDisassembly([]);
    setHexDump('');
    setCompiledArtifact(null);
    vmRef.current.reset();
    setStatusMessage('Cleaned build artifacts. Rebuilding...');
    handleCompile();
  }, [handleCompile]);

  // Run in VM
  const handleRun = useCallback(() => {
    if (!ir || activeFile?.isModified || compiledArtifact?.sourceFileId !== activeFile?.id) {
      handleCompile();
    }
    setStatusMessage('Executing program in ES4 VM...');
    const result = vmRef.current.run();

    if (result.halted) {
      setStatusMessage(`VM Execution Finished in ${result.cyclesExecuted} cycles.`);
      setActiveExecutionLine(undefined);
    } else if (result.paused) {
      setStatusMessage(`VM Paused at Breakpoint.`);
      const state = vmRef.current.getState();
      if (ir && ir.instructions[state.ip]) {
        setActiveExecutionLine(ir.instructions[state.ip].line);
      }
    }
  }, [ir, activeFile, compiledArtifact, handleCompile]);

  // Step single instruction
  const handleStep = useCallback(() => {
    if (!ir || compiledArtifact?.sourceFileId !== activeFile?.id) {
      handleCompile();
    }
    const cont = vmRef.current.step();
    const state = vmRef.current.getState();
    if (ir && ir.instructions[state.ip]) {
      setActiveExecutionLine(ir.instructions[state.ip].line);
    }
    setStatusMessage(`Stepped to IP 0x${state.ip.toString(16)} (Cycle #${state.cycles})`);
  }, [ir, activeFile, compiledArtifact, handleCompile]);

  // Pause VM
  const handlePause = useCallback(() => {
    setStatusMessage('VM Execution Paused by user.');
  }, []);

  // Reset VM
  const handleResetVM = useCallback(() => {
    vmRef.current.reset();
    setActiveExecutionLine(undefined);
    setStatusMessage('VM Reset. Stack and registers cleared.');
  }, []);

  // Force Garbage Collection
  const handleTriggerGC = useCallback(() => {
    const gcResult = vmRef.current.garbageCollect();
    setStatusMessage(
      `Garbage Collection: ${Math.round(gcResult.reclaimedBytes / 1024)} KB freed in ${gcResult.durationMs}ms.`
    );
  }, []);

  // Export Binary (.es4b)
  const handleExportBinary = () => {
    if (!binaryData) {
      handleCompile();
    }
    const targetBinary = binaryData || (ir ? BinaryCompiler.compileToBinary(ir) : null);
    if (!targetBinary) return;

    const blob = new Blob([targetBinary as BlobPart], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile ? activeFile.name.replace('.es4', '.es4b') : 'program.es4b';
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage(`Exported binary executable to ${a.download}`);
  };

  // Import Binary (.es4b)
  const handleImportBinary = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      const parsedIR = BinaryCompiler.parseFromBinary(uint8);

      setBinaryData(uint8);
      setIR(parsedIR);
      const disasm = BinaryCompiler.disassemble(parsedIR);
      setDisassembly(disasm);
      setHexDump(BinaryCompiler.generateHexDump(uint8));
      vmRef.current.load(parsedIR);

      setCompiledArtifact({
        sourceFileId: 'imported',
        sourceFileName: file.name,
        timestamp: new Date().toLocaleTimeString(),
        binarySize: uint8.length,
        opcodeCount: disasm.length,
        isOutdated: false,
      });

      const newFile: ProjectFile = {
        id: `imported_bin_${Date.now()}`,
        name: file.name,
        path: `bin/${file.name}`,
        type: 'es4b',
        content: '',
        binaryData: uint8,
      };

      setFiles((prev) => [...prev, newFile]);
      setActiveFileId(newFile.id);
      if (!openFileIds.includes(newFile.id)) {
        setOpenFileIds((prev) => [...prev, newFile.id]);
      }

      setStatusMessage(`Imported binary: ${file.name} (${uint8.length} bytes)`);
    } catch (err: any) {
      alert(`Failed to import binary: ${err.message}`);
    }
  };

  // Export JSON IR
  const handleExportIR = () => {
    if (!ir) {
      handleCompile();
    }
    if (!ir) return;
    const blob = new Blob([JSON.stringify(ir, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile ? activeFile.name.replace('.es4', '.es4ir.json') : 'program.es4ir.json';
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage(`Exported JSON IR to ${a.download}`);
  };

  // Import JSON IR
  const handleImportIR = async (file: File) => {
    try {
      const text = await file.text();
      const parsedIR: ES4IR = JSON.parse(text);
      setIR(parsedIR);

      const binary = BinaryCompiler.compileToBinary(parsedIR);
      setBinaryData(binary);
      const disasm = BinaryCompiler.disassemble(parsedIR);
      setDisassembly(disasm);
      setHexDump(BinaryCompiler.generateHexDump(binary));
      vmRef.current.load(parsedIR);

      setCompiledArtifact({
        sourceFileId: 'imported_ir',
        sourceFileName: file.name,
        timestamp: new Date().toLocaleTimeString(),
        binarySize: binary.length,
        opcodeCount: disasm.length,
        isOutdated: false,
      });

      const newFile: ProjectFile = {
        id: `imported_ir_${Date.now()}`,
        name: file.name,
        path: `bin/${file.name}`,
        type: 'es4ir',
        content: text,
      };

      setFiles((prev) => [...prev, newFile]);
      setActiveFileId(newFile.id);
      if (!openFileIds.includes(newFile.id)) {
        setOpenFileIds((prev) => [...prev, newFile.id]);
      }

      setStatusMessage(`Imported JSON IR: ${file.name}`);
    } catch (err: any) {
      alert(`Failed to import JSON IR: ${err.message}`);
    }
  };

  // File Creation
  const handleCreateFile = (name: string) => {
    const newFile: ProjectFile = {
      id: `file_${Date.now()}`,
      name,
      path: `src/${name}`,
      type: 'es4',
      content: `// ====================================\n// ${name} - ECMAScript 4 Unit\n// ====================================\n\npackage app {\n  var message: string = "Hello from ${name}";\n  print(message);\n}\n`,
    };

    setFiles((prev) => [...prev, newFile]);
    setActiveFileId(newFile.id);
    setOpenFileIds((prev) => [...prev, newFile.id]);
    setStatusMessage(`Created new file ${name}`);
  };

  // File Deletion
  const handleDeleteFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setOpenFileIds((prev) => prev.filter((fid) => fid !== id));
    if (activeFileId === id) {
      const remaining = files.filter((f) => f.id !== id);
      if (remaining.length > 0) {
        setActiveFileId(remaining[0].id);
      }
    }
    setStatusMessage(`Deleted file from project.`);
  };

  // Select Sample File
  const handleSelectSample = (sampleId: string) => {
    const found = files.find((f) => f.id === sampleId);
    if (found) {
      setActiveFileId(found.id);
      if (!openFileIds.includes(found.id)) {
        setOpenFileIds((prev) => [...prev, found.id]);
      }
      setStatusMessage(`Opened ${found.name}`);
      if (found.type === 'es4') {
        handleCompile(found);
      }
    }
  };

  // Select Diagnostic Item to Jump Cursor
  const handleSelectDiagnostic = (diag: Diagnostic) => {
    setCursorLine(diag.line);
    setCursorCol(diag.col);
    setStatusMessage(`[${diag.code}] ${diag.message} at line ${diag.line}:${diag.col}`);
  };

  // Initial compile on startup
  useEffect(() => {
    const initialMain = files.find((f) => f.name === 'Main.es4') || files.find((f) => f.type === 'es4');
    if (initialMain) {
      handleCompile(initialMain);
    }
  }, []);

  // Keyboard Shortcuts (F5 Run, F7 Compile, Shift+F7 Rebuild, F10 Step, Ctrl+S Save)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault();
        handleRun();
      } else if (e.key === 'F7') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRebuild();
        } else {
          handleCompile();
        }
      } else if (e.key === 'F10') {
        e.preventDefault();
        handleStep();
      } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        setFiles((prev) =>
          prev.map((f) => (f.id === activeFileId ? { ...f, isModified: false } : f))
        );
        setStatusMessage(`Saved ${activeFile?.name}`);
      } else if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        setNewFileOpen(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleRun, handleCompile, handleRebuild, handleStep, activeFileId, activeFile, setFiles]);

  const isCurrentFileOutdated = Boolean(
    compiledArtifact?.isOutdated || 
    (compiledArtifact && activeFile && compiledArtifact.sourceFileId !== activeFile.id) ||
    activeFile?.isModified
  );

  return (
    <div className="flex flex-col w-screen h-screen bg-[#d4d0c8] select-none overflow-hidden font-sans text-[11px]">
      {/* Title Bar */}
      <div className="swing-titlebar px-2 py-1 flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-1.5 font-bold tracking-wide">
          <span className="text-sm">☕</span>
          <span>ES4 Studio 2002</span>
          <span className="text-gray-300 font-normal">
            - [{activeProject.name}] {activeFile ? activeFile.name : ''}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAboutOpen(true)}
            className="px-1.5 py-0.5 bg-[#d4d0c8] swing-bevel-raised hover:bg-white text-black text-[10px] font-bold"
          >
            About
          </button>
        </div>
      </div>

      {/* Menu Bar */}
      <MenuBar
        onNewFile={() => setNewFileOpen(true)}
        onSaveFile={() => {
          setFiles((prev) =>
            prev.map((f) => (f.id === activeFileId ? { ...f, isModified: false } : f))
          );
          setStatusMessage(`Saved ${activeFile?.name}`);
        }}
        onSelectSample={handleSelectSample}
        onImportBinary={handleImportBinary}
        onExportBinary={handleExportBinary}
        onImportIR={handleImportIR}
        onExportIR={handleExportIR}
        onCompile={handleCompile}
        onRun={handleRun}
        onStep={handleStep}
        onPause={handlePause}
        onResetVM={handleResetVM}
        onTriggerGC={handleTriggerGC}
        onClearConsole={() => {
          vmRef.current.clearLogs();
          setLogs([]);
          setStatusMessage('Console cleared');
        }}
        onOpenDoc={() => setDocOpen(true)}
        onOpenAbout={() => setAboutOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        inDepthHelp={debugFlags.inDepthHelp}
        onToggleInDepthHelp={() => handleToggleDebugFlag('inDepthHelp')}
        isVMRunning={vmState.status === 'RUNNING'}
      />

      {/* Tool Bar */}
      <ToolBar
        onNewFile={() => setNewFileOpen(true)}
        onSaveFile={() => {
          setFiles((prev) =>
            prev.map((f) => (f.id === activeFileId ? { ...f, isModified: false } : f))
          );
          setStatusMessage(`Saved ${activeFile?.name}`);
        }}
        onCompile={() => handleCompile()}
        onRebuild={handleRebuild}
        onRun={handleRun}
        onStep={handleStep}
        onPause={handlePause}
        onResetVM={handleResetVM}
        onExportBinary={handleExportBinary}
        onExportIR={handleExportIR}
        isVMRunning={vmState.status === 'RUNNING'}
        hasBinary={Boolean(binaryData)}
        debugFlags={debugFlags}
        onToggleDebugFlag={handleToggleDebugFlag}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Primary Workspace Area */}
      <div className="flex-1 flex overflow-hidden p-1 gap-1">
        {/* Left: Project Explorer */}
        <ProjectExplorer
          projects={projects}
          activeProjectId={activeProjectId}
          files={files}
          activeFileId={activeFileId}
          onSelectProject={handleSelectProject}
          onCreateProject={handleCreateProject}
          onDeleteProject={handleDeleteProject}
          onSelectFile={(id) => {
            setActiveFileId(id);
            if (!openFileIds.includes(id)) {
              setOpenFileIds((prev) => [...prev, id]);
            }
          }}
          onNewFile={() => setNewFileOpen(true)}
          onDeleteFile={handleDeleteFile}
        />

        {/* Center/Right: Editor & Output Split */}
        <div className="flex-1 flex flex-col overflow-hidden gap-1">
          {/* Document Tabs */}
          <div className="bg-[#d4d0c8] flex items-end px-1 pt-1 gap-0.5 shrink-0 overflow-x-auto border-b border-[#808080]">
            {openFileIds.map((fid) => {
              const file = files.find((f) => f.id === fid);
              if (!file) return null;
              const isActive = fid === activeFileId;

              return (
                <div
                  key={fid}
                  onClick={() => setActiveFileId(fid)}
                  className={`flex items-center gap-1.5 px-3 py-1 font-semibold rounded-t-xs border-t border-l border-r cursor-pointer ${
                    isActive
                      ? 'bg-white border-t-[#ffffff] border-l-[#ffffff] border-r-[#808080] -mb-[1px] pb-1.5 z-10 text-black'
                      : 'bg-[#d4d0c8] border-[#808080] hover:bg-[#ece9d8] text-gray-700'
                  }`}
                >
                  {file.type === 'es4' ? (
                    <FileText className="w-3.5 h-3.5 text-blue-800" />
                  ) : file.type === 'es4b' ? (
                    <BinaryIcon className="w-3.5 h-3.5 text-indigo-700" />
                  ) : (
                    <FileCode className="w-3.5 h-3.5 text-purple-700" />
                  )}
                  <span>{file.name}</span>
                  {file.isModified && <span className="text-red-600 font-bold">*</span>}
                  {openFileIds.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenFileIds((prev) => prev.filter((id) => id !== fid));
                        if (activeFileId === fid) {
                          const rest = openFileIds.filter((id) => id !== fid);
                          if (rest.length > 0) setActiveFileId(rest[0]);
                        }
                      }}
                      className="ml-1 hover:bg-gray-300 rounded-xs p-0.5"
                    >
                      <X className="w-2.5 h-2.5 text-gray-600" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Active Editor or Binary Viewer */}
          <div className="flex-1 flex overflow-hidden">
            {activeFile?.type === 'es4' ? (
              <CodeEditor
                value={activeFile.content}
                onChange={handleContentChange}
                breakpoints={breakpoints}
                onToggleBreakpoint={handleToggleBreakpoint}
                onDiagnosticsUpdate={setDiagnostics}
                onCursorChange={(line, col) => {
                  setCursorLine(line);
                  setCursorCol(col);
                }}
                onCompileRequest={handleCompile}
                onRunRequest={handleRun}
                activeExecutionLine={activeExecutionLine}
              />
            ) : activeFile?.type === 'es4b' ? (
              <div className="flex-1 bg-white p-3 font-mono text-[11px] overflow-auto swing-bevel-sunken">
                <div className="font-bold text-gray-800 border-b pb-1 mb-2 flex items-center justify-between">
                  <span>Binary Bytecode Executable ({activeFile.name})</span>
                  <button
                    onClick={handleExportBinary}
                    className="px-2 py-0.5 bg-[#d4d0c8] swing-bevel-raised hover:bg-white text-xs"
                  >
                    Export Binary File
                  </button>
                </div>
                <pre className="text-gray-700 leading-tight">
                  {activeFile.binaryData
                    ? BinaryCompiler.generateHexDump(activeFile.binaryData)
                    : hexDump || '[Compile an ES4 file to populate binary bytecode]'}
                </pre>
              </div>
            ) : (
              <div className="flex-1 bg-white p-3 font-mono text-[11px] overflow-auto swing-bevel-sunken">
                <div className="font-bold text-gray-800 border-b pb-1 mb-2 flex items-center justify-between">
                  <span>Intermediate Representation ({activeFile?.name})</span>
                  <button
                    onClick={handleExportIR}
                    className="px-2 py-0.5 bg-[#d4d0c8] swing-bevel-raised hover:bg-white text-xs"
                  >
                    Export JSON IR
                  </button>
                </div>
                <pre className="text-purple-900 leading-tight">
                  {activeFile?.content || (ir ? JSON.stringify(ir, null, 2) : '[Compile an ES4 file to populate JSON IR]')}
                </pre>
              </div>
            )}
          </div>

          {/* Bottom Output Tabs */}
          <OutputTabs
            logs={logs}
            diagnostics={diagnostics}
            disassembly={disassembly}
            hexDump={hexDump}
            ir={ir}
            vmState={vmState}
            compiledSourceFileName={compiledArtifact?.sourceFileName}
            isCompilationOutdated={isCurrentFileOutdated}
            onCompileActiveFile={() => handleCompile()}
            onClearLogs={() => {
              vmRef.current.clearLogs();
              setLogs([]);
            }}
            onSelectDiagnostic={handleSelectDiagnostic}
            onTriggerGC={handleTriggerGC}
            onExportBinary={handleExportBinary}
            onExportIR={handleExportIR}
          />
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar
        statusMessage={statusMessage}
        cursorLine={cursorLine}
        cursorCol={cursorCol}
        heapBytes={vmState.heapBytesAllocated}
        onTriggerGC={handleTriggerGC}
        vmStatus={vmState.status}
        compiledTargetName={compiledArtifact?.sourceFileName}
        isOutdated={isCurrentFileOutdated}
      />

      {/* Dialogs */}
      <NewFileDialog
        isOpen={newFileOpen}
        onClose={() => setNewFileOpen(false)}
        onCreate={handleCreateFile}
      />

      <ES4DocDialog
        isOpen={docOpen}
        onClose={() => setDocOpen(false)}
      />

      <AboutDialog
        isOpen={aboutOpen}
        onClose={() => setAboutOpen(false)}
      />

      <SettingsDialog
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        debugFlags={debugFlags}
        onToggleFlag={handleToggleDebugFlag}
      />

      {/* Pinny: The Annoying Desktop Assistant (Appears when In-depth Help (CodeMagic) is enabled) */}
      {debugFlags.inDepthHelp && (
        <Pinny
          onDisableHelp={() => handleToggleDebugFlag('inDepthHelp')}
          diagnosticCount={diagnostics.filter((d) => d.severity === 'error').length}
          statusMessage={statusMessage}
        />
      )}
    </div>
  );
}
