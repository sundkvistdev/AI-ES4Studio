/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ES4 Studio 2002 - Core Type Definitions
 * Scrapped ECMAScript 4 (2002 Draft) Language Architecture
 */

export type FileType = 'es4' | 'es4ir' | 'es4b';

export interface ProjectFile {
  id: string;
  name: string;
  path: string;
  type: FileType;
  content: string; // text content for .es4 and .es4ir
  binaryData?: Uint8Array; // for .es4b
  isModified?: boolean;
  isReadOnly?: boolean;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  files: ProjectFile[];
}

export interface CompilationArtifactInfo {
  sourceFileId: string;
  sourceFileName: string;
  timestamp: string;
  binarySize: number;
  opcodeCount: number;
  isOutdated: boolean;
}

export type TokenType =
  | 'KEYWORD'
  | 'TYPE'
  | 'IDENTIFIER'
  | 'NUMBER'
  | 'STRING'
  | 'BOOLEAN'
  | 'NULL'
  | 'OPERATOR'
  | 'PUNCTUATION'
  | 'COMMENT'
  | 'WHITESPACE'
  | 'UNKNOWN'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
  start: number;
  end: number;
}

export interface Diagnostic {
  id: string;
  severity: 'error' | 'warning' | 'info';
  code: string; // e.g. "ES4-102"
  message: string;
  line: number;
  col: number;
  endLine: number;
  endCol: number;
  file?: string;
}

export interface TechnicalBadge {
  label: string;
  value: string;
  category?: 'keyword' | 'type' | 'scope' | 'storage' | 'spec' | 'modifier' | 'timing' | 'default';
}

export interface ParameterDoc {
  name: string;
  type: string;
  description?: string;
  optional?: boolean;
}

export interface MemberDoc {
  name: string;
  kind: 'method' | 'field';
  type: string;
  modifiers?: string[];
  signature?: string;
}

export interface CodeMagicItem {
  label: string;
  kind: 'keyword' | 'type' | 'function' | 'variable' | 'class' | 'property' | 'field' | 'method' | 'parameter' | 'package' | 'snippet';
  detail: string;
  documentation: string;
  insertText: string;
  signature?: string;
  packageName?: string;
  returnType?: string;
  modifiers?: string[];
  sortText?: string;
}

export interface HoverInfo {
  token: string;
  kind: 'keyword' | 'type' | 'function' | 'method' | 'variable' | 'parameter' | 'field' | 'class' | 'package' | 'import' | 'builtin' | 'literal' | 'diagnostic';
  title: string;
  signature?: string;
  packageName?: string;
  enclosingScope?: string;
  modifiers?: string[];
  typeInfo?: string;
  returnType?: string;
  parameters?: ParameterDoc[];
  members?: MemberDoc[];
  technicalBadges?: TechnicalBadge[];
  documentation?: string;
  specNote?: string;
  declaredAt?: string;
  diagnostic?: Diagnostic;
}

export interface CompilerDebugFlags {
  emitDebugSymbols: boolean; // -g : Keep source lines, symbol names and comments
  optimizePeephole: boolean; // -O1: Dead code removal and constant propagation
  strictTypeChecking: boolean; // --strict: Strict typing diagnostics
  pedanticWarnings: boolean; // -Wall: Draft 2002 conformance warnings
  vmTraceCycles: boolean; // --trace: Emit instruction-by-instruction VM trace logs
  vmBreakOnError: boolean; // -b: Pause execution on error instead of instant halt
  inDepthHelp?: boolean; // In-depth Help (CodeMagic) - spawns Pinny assistant
}

// Bytecode Opcodes (Binary standard for ES4 VM)
export enum OpCode {
  NOP = 0x00,
  PUSH_CONST = 0x01,
  PUSH_NULL = 0x02,
  PUSH_BOOL = 0x03,
  PUSH_INT = 0x04,
  LOAD_LOCAL = 0x05,
  STORE_LOCAL = 0x06,
  LOAD_GLOBAL = 0x07,
  STORE_GLOBAL = 0x08,
  
  // Arithmetic & Bitwise
  ADD = 0x10,
  SUB = 0x11,
  MUL = 0x12,
  DIV = 0x13,
  MOD = 0x14,
  NEG = 0x15,
  BIT_AND = 0x16,
  BIT_OR = 0x17,
  BIT_XOR = 0x18,

  // Comparison & Logical
  EQ = 0x20,
  NEQ = 0x21,
  LT = 0x22,
  LTE = 0x23,
  GT = 0x24,
  GTE = 0x25,
  NOT = 0x26,

  // Control Flow
  JUMP = 0x30,
  JUMP_IF_FALSE = 0x31,
  JUMP_IF_TRUE = 0x32,

  // Functions & Methods
  CALL = 0x40,
  RETURN = 0x41,

  // ES4 Builtins & Object model
  PRINT = 0x50,
  ASSERT = 0x51,
  DUMP = 0x52,
  CLOCK = 0x53,
  CAST = 0x54,
  TYPEOF = 0x55,
  
  NEW_OBJ = 0x60,
  GET_PROP = 0x61,
  SET_PROP = 0x62,
  NEW_ARRAY = 0x63,
  GET_ELEM = 0x64,
  SET_ELEM = 0x65,

  HALT = 0xFF,
}

// Intermediate Representation (JSON AST / IR)
export interface IRInstruction {
  op: string; // mnemonic, e.g. "PUSH_CONST", "ADD"
  opcode: number;
  arg?: number | string | boolean | null;
  line?: number;
  comment?: string;
}

export interface IRConstant {
  index: number;
  type: 'string' | 'int' | 'double' | 'boolean' | 'null';
  value: string | number | boolean | null;
}

export interface IRSymbol {
  name: string;
  type: string;
  scope: 'global' | 'local' | 'method' | 'class';
  index: number;
}

export interface ES4IR {
  format: 'ES4_INTERMEDIATE_REPRESENTATION';
  version: '0.4.2-2002';
  sourceFile: string;
  timestamp: string;
  constants: IRConstant[];
  symbols: IRSymbol[];
  instructions: IRInstruction[];
  metadata: {
    classesCount: number;
    functionsCount: number;
    totalInstructions: number;
    optimizationLevel: number;
    strictMode: boolean;
  };
}

export interface DisassembledInstruction {
  offset: number;
  bytes: number[];
  mnemonic: string;
  argDisplay?: string;
  comment?: string;
  line?: number;
}

// VM Runtime Types
export type VMValue =
  | { type: 'int'; value: number }
  | { type: 'double'; value: number }
  | { type: 'string'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'null'; value: null }
  | { type: 'object'; value: Record<string, VMValue>; className?: string }
  | { type: 'array'; value: VMValue[] }
  | { type: 'function'; value: Function; className?: string };

export interface CallFrame {
  functionName: string;
  returnIP: number;
  localBase: number;
  locals: Record<string, VMValue>;
}

export interface VMState {
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'HALTED' | 'ERROR';
  ip: number;
  cycles: number;
  stack: VMValue[];
  globals: Record<string, VMValue>;
  callStack: CallFrame[];
  heapBytesAllocated: number;
  errorMessage?: string;
  errorLine?: number;
}

export interface VMOutputEntry {
  type: 'stdout' | 'stderr' | 'info' | 'gc';
  text: string;
  timestamp: string;
}
