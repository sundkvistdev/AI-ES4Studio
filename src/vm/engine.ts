/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ES4 Studio 2002 - Bytecode Virtual Machine (VM)
 * Executes compiled ES4 binary bytecode with stack-based runtime
 */

import { ES4IR, OpCode, VMOutputEntry, VMState, VMValue, CompilerDebugFlags } from '../types';

export class ES4VirtualMachine {
  private ir: ES4IR | null = null;
  private ip = 0;
  private stack: VMValue[] = [];
  private globals: Record<string, VMValue> = {};
  private callStack: Array<{
    name: string;
    returnIP: number;
    locals: Record<string, VMValue>;
  }> = [];
  private cycles = 0;
  private status: VMState['status'] = 'IDLE';
  private heapBytesAllocated = 12480; // Baseline runtime footprint in bytes
  private breakpoints = new Set<number>();
  private outputLogs: VMOutputEntry[] = [];
  private onOutputCallback?: (entry: VMOutputEntry) => void;
  private onStateChangeCallback?: (state: VMState) => void;
  private debugFlags: CompilerDebugFlags = {
    emitDebugSymbols: true,
    optimizePeephole: true,
    strictTypeChecking: false,
    pedanticWarnings: false,
    vmTraceCycles: false,
    vmBreakOnError: false,
  };

  constructor() {
    this.initBuiltins();
  }

  public setDebugFlags(flags: Partial<CompilerDebugFlags>) {
    this.debugFlags = { ...this.debugFlags, ...flags };
  }

  public getDebugFlags(): CompilerDebugFlags {
    return { ...this.debugFlags };
  }

  private initBuiltins() {
    this.globals['Math'] = {
      type: 'object',
      value: {
        PI: { type: 'double', value: Math.PI },
        E: { type: 'double', value: Math.E },
      },
      className: 'Math',
    };

    // Standard package classes from std.math and std.collections
    this.globals['Vector'] = {
      type: 'function',
      value: (thisObj: VMValue, x?: VMValue, y?: VMValue, z?: VMValue): VMValue => {
        if (thisObj && thisObj.type === 'object') {
          thisObj.value['x'] = x || { type: 'double', value: 0 };
          thisObj.value['y'] = y || { type: 'double', value: 0 };
          thisObj.value['z'] = z || { type: 'double', value: 0 };
        }
        return thisObj;
      },
    };

    this.globals['List'] = {
      type: 'function',
      value: (thisObj: VMValue): VMValue => {
        return thisObj;
      },
    };
  }

  public load(ir: ES4IR) {
    this.ir = ir;
    this.reset();
  }

  public setBreakpoints(lines: Set<number>) {
    this.breakpoints = new Set(lines);
  }

  public setOutputCallback(cb: (entry: VMOutputEntry) => void) {
    this.onOutputCallback = cb;
  }

  public setStateChangeCallback(cb: (state: VMState) => void) {
    this.onStateChangeCallback = cb;
  }

  public reset() {
    this.ip = 0;
    this.stack = [];
    this.globals = {};
    this.initBuiltins();
    this.callStack = [];
    this.cycles = 0;
    this.status = 'IDLE';
    this.heapBytesAllocated = 16384;
    this.notifyState();
  }

  public getState(): VMState {
    return {
      status: this.status,
      ip: this.ip,
      cycles: this.cycles,
      stack: [...this.stack],
      globals: { ...this.globals },
      callStack: this.callStack.map(c => ({
        functionName: c.name,
        returnIP: c.returnIP,
        localBase: 0,
        locals: { ...c.locals },
      })),
      heapBytesAllocated: this.heapBytesAllocated,
    };
  }

  public getOutputLogs(): VMOutputEntry[] {
    return this.outputLogs;
  }

  public clearLogs() {
    this.outputLogs = [];
  }

  private log(type: VMOutputEntry['type'], text: string) {
    const entry: VMOutputEntry = {
      type,
      text,
      timestamp: new Date().toLocaleTimeString(),
    };
    this.outputLogs.push(entry);
    if (this.onOutputCallback) {
      this.onOutputCallback(entry);
    }
  }

  private notifyState() {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.getState());
    }
  }

  /**
   * Run until HALT, Breakpoint, or Max Cycles (preventing browser lock)
   */
  public run(maxCycles = 100000): { halted: boolean; paused: boolean; cyclesExecuted: number } {
    if (!this.ir) {
      this.log('stderr', 'VM Error: No program loaded into memory.');
      return { halted: true, paused: false, cyclesExecuted: 0 };
    }

    this.status = 'RUNNING';
    this.notifyState();

    let count = 0;
    const startTime = performance.now();

    while (this.status === 'RUNNING' && count < maxCycles) {
      // Check breakpoint on current instruction line
      const currentInst = this.ir.instructions[this.ip];
      if (currentInst && currentInst.line && this.breakpoints.has(currentInst.line) && count > 0) {
        this.status = 'PAUSED';
        this.log('info', `[Debugger] Breakpoint hit at line ${currentInst.line} (IP: 0x${this.ip.toString(16)})`);
        this.notifyState();
        return { halted: false, paused: true, cyclesExecuted: count };
      }

      const cont = this.stepInternal();
      count++;
      if (!cont) break;
    }

    const duration = (performance.now() - startTime).toFixed(2);
    const endStatus = this.status as string;

    if (endStatus === 'RUNNING' && count >= maxCycles) {
      this.status = 'PAUSED';
      this.log('info', `[VM Warning] Execution slice limit reached (${maxCycles} cycles in ${duration}ms). Yielded to avoid thread blocking.`);
    } else if (endStatus === 'HALTED') {
      this.log('info', `[VM Halted] Normal program termination in ${count} cycles (${duration}ms).`);
    }

    this.notifyState();
    return {
      halted: (this.status as string) === 'HALTED',
      paused: (this.status as string) === 'PAUSED',
      cyclesExecuted: count,
    };
  }

  /**
   * Step a single instruction
   */
  public step(): boolean {
    if (!this.ir) return false;
    if (this.status === 'HALTED' || this.status === 'ERROR') {
      this.reset();
    }
    this.status = 'PAUSED';
    const cont = this.stepInternal();
    if (!cont) {
      this.status = 'HALTED';
    }
    this.notifyState();
    return cont;
  }

  private stepInternal(): boolean {
    if (!this.ir || this.ip >= this.ir.instructions.length) {
      this.status = 'HALTED';
      return false;
    }

    const inst = this.ir.instructions[this.ip];
    this.cycles++;
    this.ip++;

    if (this.debugFlags.vmTraceCycles) {
      const lineStr = inst.line ? ` [L${inst.line}]` : '';
      const argStr = inst.arg !== undefined && inst.arg !== null ? ` ${JSON.stringify(inst.arg)}` : '';
      this.log('info', `[TRACE #0x${this.cycles.toString(16).padStart(4, '0')}] IP:${(this.ip - 1).toString().padStart(4, '0')}${lineStr} | ${inst.op}${argStr} | Stack: [${this.stack.map(s => s.type === 'object' ? `{${s.className || 'Object'}}` : String(s.value)).slice(-3).join(', ')}]`);
    }

    try {
      switch (inst.opcode) {
        case OpCode.NOP:
          break;

        case OpCode.PUSH_CONST: {
          const cIdx = inst.arg as number;
          const constant = this.ir.constants[cIdx];
          if (!constant) throw new Error(`Constant pool index #${cIdx} out of bounds`);
          if (constant.type === 'int') {
            this.stack.push({ type: 'int', value: Number(constant.value) | 0 });
          } else if (constant.type === 'double') {
            this.stack.push({ type: 'double', value: Number(constant.value) });
          } else if (constant.type === 'string') {
            this.heapBytesAllocated += String(constant.value).length * 2;
            this.stack.push({ type: 'string', value: String(constant.value) });
          } else if (constant.type === 'boolean') {
            this.stack.push({ type: 'boolean', value: Boolean(constant.value) });
          } else {
            this.stack.push({ type: 'null', value: null });
          }
          break;
        }

        case OpCode.PUSH_NULL:
          this.stack.push({ type: 'null', value: null });
          break;

        case OpCode.PUSH_BOOL:
          this.stack.push({ type: 'boolean', value: (inst.arg as number) === 1 });
          break;

        case OpCode.LOAD_LOCAL: {
          const lIdx = String(inst.arg);
          const frame = this.callStack[this.callStack.length - 1];
          const val = frame?.locals[lIdx] || { type: 'null', value: null };
          this.stack.push(val);
          break;
        }

        case OpCode.STORE_LOCAL: {
          const lIdx = String(inst.arg);
          const val = this.stack.pop() || { type: 'null', value: null };
          const frame = this.callStack[this.callStack.length - 1];
          if (frame) {
            frame.locals[lIdx] = val;
          }
          break;
        }

        case OpCode.LOAD_GLOBAL: {
          const gIdx = inst.arg as number;
          const sym = this.ir.symbols.find(s => s.index === gIdx) || this.ir.symbols[gIdx];
          const name = sym ? sym.name : `g_${gIdx}`;
          const val = this.globals[name] || this.globals[String(gIdx)] || { type: 'null', value: null };
          this.stack.push(val);
          break;
        }

        case OpCode.STORE_GLOBAL: {
          const gIdx = inst.arg as number;
          const sym = this.ir.symbols.find(s => s.index === gIdx) || this.ir.symbols[gIdx];
          const name = sym ? sym.name : `g_${gIdx}`;
          const val = this.stack.pop() || { type: 'null', value: null };
          this.globals[name] = val;
          this.globals[String(gIdx)] = val;
          break;
        }

        case OpCode.ADD: {
          const b = this.stack.pop()!;
          const a = this.stack.pop()!;
          if (a.type === 'string' || b.type === 'string') {
            const res = `${this.formatValue(a)}${this.formatValue(b)}`;
            this.heapBytesAllocated += res.length * 2;
            this.stack.push({ type: 'string', value: res });
          } else {
            const valA = Number(a.value);
            const valB = Number(b.value);
            if (a.type === 'int' && b.type === 'int') {
              // Signed 32-bit integer addition with two's complement wrap (authentic ES4 draft quirk)
              this.stack.push({ type: 'int', value: (valA + valB) | 0 });
            } else {
              this.stack.push({ type: 'double', value: valA + valB });
            }
          }
          break;
        }

        case OpCode.SUB: {
          const b = this.stack.pop()!;
          const a = this.stack.pop()!;
          const valA = Number(a.value);
          const valB = Number(b.value);
          if (a.type === 'int' && b.type === 'int') {
            this.stack.push({ type: 'int', value: (valA - valB) | 0 });
          } else {
            this.stack.push({ type: 'double', value: valA - valB });
          }
          break;
        }

        case OpCode.MUL: {
          const b = this.stack.pop()!;
          const a = this.stack.pop()!;
          const valA = Number(a.value);
          const valB = Number(b.value);
          if (a.type === 'int' && b.type === 'int') {
            this.stack.push({ type: 'int', value: Math.imul(valA, valB) });
          } else {
            this.stack.push({ type: 'double', value: valA * valB });
          }
          break;
        }

        case OpCode.DIV: {
          const b = this.stack.pop()!;
          const a = this.stack.pop()!;
          const valB = Number(b.value);
          if (valB === 0) {
            this.log('stderr', 'RuntimeWarning [ES4-DIV0]: Division by zero resulted in Infinity');
          }
          this.stack.push({ type: 'double', value: Number(a.value) / valB });
          break;
        }

        case OpCode.MOD: {
          const b = this.stack.pop()!;
          const a = this.stack.pop()!;
          this.stack.push({ type: 'int', value: (Number(a.value) % Number(b.value)) | 0 });
          break;
        }

        case OpCode.NEG: {
          const a = this.stack.pop()!;
          if (a.type === 'int') {
            this.stack.push({ type: 'int', value: -Number(a.value) | 0 });
          } else {
            this.stack.push({ type: 'double', value: -Number(a.value) });
          }
          break;
        }

        case OpCode.NOT: {
          const a = this.stack.pop()!;
          this.stack.push({ type: 'boolean', value: !this.isTruthy(a) });
          break;
        }

        case OpCode.EQ: {
          const b = this.stack.pop()!;
          const a = this.stack.pop()!;
          this.stack.push({ type: 'boolean', value: a.value === b.value });
          break;
        }

        case OpCode.NEQ: {
          const b = this.stack.pop()!;
          const a = this.stack.pop()!;
          this.stack.push({ type: 'boolean', value: a.value !== b.value });
          break;
        }

        case OpCode.LT: {
          const b = this.stack.pop()!;
          const a = this.stack.pop()!;
          this.stack.push({ type: 'boolean', value: Number(a.value) < Number(b.value) });
          break;
        }

        case OpCode.LTE: {
          const b = this.stack.pop()!;
          const a = this.stack.pop()!;
          this.stack.push({ type: 'boolean', value: Number(a.value) <= Number(b.value) });
          break;
        }

        case OpCode.GT: {
          const b = this.stack.pop()!;
          const a = this.stack.pop()!;
          this.stack.push({ type: 'boolean', value: Number(a.value) > Number(b.value) });
          break;
        }

        case OpCode.GTE: {
          const b = this.stack.pop()!;
          const a = this.stack.pop()!;
          this.stack.push({ type: 'boolean', value: Number(a.value) >= Number(b.value) });
          break;
        }

        case OpCode.JUMP: {
          this.ip = inst.arg as number;
          break;
        }

        case OpCode.JUMP_IF_FALSE: {
          const cond = this.stack.pop()!;
          if (!this.isTruthy(cond)) {
            this.ip = inst.arg as number;
          }
          break;
        }

        case OpCode.JUMP_IF_TRUE: {
          const cond = this.stack.pop()!;
          if (this.isTruthy(cond)) {
            this.ip = inst.arg as number;
          }
          break;
        }

        case OpCode.PRINT: {
          const argCount = (inst.arg as number) || 0;
          const args: VMValue[] = [];
          for (let i = 0; i < argCount; i++) {
            args.unshift(this.stack.pop()!);
          }
          const text = args.map(a => this.formatValue(a)).join(' ');
          this.log('stdout', text);
          break;
        }

        case OpCode.DUMP: {
          const val = this.stack.pop()!;
          const formatted = JSON.stringify(val, null, 2);
          this.log('stdout', `[Object Dump]\n${formatted}`);
          break;
        }

        case OpCode.ASSERT: {
          const cond = this.stack.pop()!;
          const msgIdx = inst.arg as number;
          const msg = this.ir.constants[msgIdx]?.value || 'Assertion failed';
          if (!this.isTruthy(cond)) {
            const err = `AssertionError [ES4-ASSERT]: ${msg} at line ${inst.line || '?'}`;
            this.log('stderr', err);
            this.status = 'ERROR';
            return false;
          }
          break;
        }

        case OpCode.CLOCK: {
          this.stack.push({ type: 'double', value: Date.now() });
          break;
        }

        case OpCode.CALL: {
          const argCount = (inst.arg as number) || 0;
          const callee = this.stack.pop()!;

          if (callee && callee.type === 'function') {
            const fn = callee.value as Function;
            const args: VMValue[] = [];
            for (let i = 0; i < argCount; i++) {
              args.unshift(this.stack.pop()!);
            }
            const res = fn(...args);
            this.stack.push(res !== undefined ? res : { type: 'null', value: null });
            break;
          }

          let targetIP: number | null = null;
          if (callee && callee.type === 'int' && typeof callee.value === 'number') {
            targetIP = callee.value;
          } else if (callee && typeof (callee as any).value === 'number') {
            targetIP = (callee as any).value;
          }

          if (targetIP !== null) {
            const locals: Record<string, VMValue> = {};
            for (let i = argCount - 1; i >= 0; i--) {
              locals[String(i)] = this.stack.pop()!;
            }
            this.callStack.push({
              name: `fn_at_0x${targetIP.toString(16)}`,
              returnIP: this.ip,
              locals,
            });
            this.ip = targetIP;
          } else {
            this.log('stderr', `RuntimeError [ES4-301]: Callee is not callable (${this.formatValue(callee)})`);
            this.status = 'ERROR';
            return false;
          }
          break;
        }

        case OpCode.RETURN: {
          const retVal = this.stack.pop() || { type: 'null', value: null };
          const frame = this.callStack.pop();
          if (frame) {
            this.ip = frame.returnIP;
            this.stack.push(retVal);
          } else {
            // Returned from top-level
            this.status = 'HALTED';
            return false;
          }
          break;
        }

        case OpCode.NEW_OBJ: {
          const cIdx = inst.arg as number;
          const className = this.ir.constants[cIdx]?.value ? String(this.ir.constants[cIdx].value) : 'Object';
          this.heapBytesAllocated += 64; // Base object allocation

          const initialProps: Record<string, VMValue> = {};
          if (className === 'Vector') {
            initialProps['x'] = { type: 'double', value: 0 };
            initialProps['y'] = { type: 'double', value: 0 };
            initialProps['z'] = { type: 'double', value: 0 };
            initialProps['length'] = {
              type: 'function',
              value: (thisObj: VMValue): VMValue => {
                const props = thisObj && thisObj.type === 'object' ? thisObj.value : {};
                const x = props['x'] && typeof props['x'].value === 'number' ? props['x'].value : 0;
                const y = props['y'] && typeof props['y'].value === 'number' ? props['y'].value : 0;
                const z = props['z'] && typeof props['z'].value === 'number' ? props['z'].value : 0;
                return { type: 'double', value: Math.sqrt(x * x + y * y + z * z) };
              },
            };
            initialProps['normalize'] = {
              type: 'function',
              value: (thisObj: VMValue): VMValue => {
                const props = thisObj && thisObj.type === 'object' ? thisObj.value : {};
                const x = props['x'] && typeof props['x'].value === 'number' ? props['x'].value : 0;
                const y = props['y'] && typeof props['y'].value === 'number' ? props['y'].value : 0;
                const z = props['z'] && typeof props['z'].value === 'number' ? props['z'].value : 0;
                const len = Math.sqrt(x * x + y * y + z * z) || 1;
                const newVecProps: Record<string, VMValue> = { ...props };
                newVecProps['x'] = { type: 'double', value: x / len };
                newVecProps['y'] = { type: 'double', value: y / len };
                newVecProps['z'] = { type: 'double', value: z / len };
                return { type: 'object', value: newVecProps, className: 'Vector' };
              },
            };
          } else if (className === 'List') {
            const listItems: VMValue[] = [];
            initialProps['items'] = { type: 'array', value: listItems };
            initialProps['add'] = {
              type: 'function',
              value: (thisObj: VMValue, item: VMValue): VMValue => {
                if (thisObj && thisObj.type === 'object') {
                  const itemsProp = thisObj.value['items'];
                  if (itemsProp && itemsProp.type === 'array') {
                    itemsProp.value.push(item);
                  }
                }
                return { type: 'null', value: null };
              },
            };
            initialProps['size'] = {
              type: 'function',
              value: (thisObj: VMValue): VMValue => {
                if (thisObj && thisObj.type === 'object') {
                  const itemsProp = thisObj.value['items'];
                  if (itemsProp && itemsProp.type === 'array') {
                    return { type: 'int', value: itemsProp.value.length };
                  }
                }
                return { type: 'int', value: 0 };
              },
            };
          } else {
            const classProto = this.globals[className];
            if (classProto && classProto.type === 'object' && classProto.value) {
              for (const [k, v] of Object.entries(classProto.value)) {
                initialProps[k] = v as VMValue;
              }
            }
          }

          const obj: VMValue = {
            type: 'object',
            value: initialProps,
            className,
          };
          this.stack.push(obj);
          break;
        }

        case OpCode.GET_PROP: {
          const propIdx = inst.arg as number;
          const propName = String(this.ir.constants[propIdx]?.value || '');
          const obj = this.stack.pop()!;
          if (obj && obj.type === 'object') {
            let val = obj.value[propName];
            if (!val && obj.className) {
              const classObj = this.globals[obj.className];
              if (classObj && classObj.type === 'object' && classObj.value && typeof classObj.value === 'object') {
                val = (classObj.value as Record<string, VMValue>)[propName];
              }
            }
            if (!val && this.globals[propName]) {
              val = this.globals[propName];
            }
            this.stack.push(val || { type: 'null', value: null });
          } else {
            this.stack.push({ type: 'null', value: null });
          }
          break;
        }

        case OpCode.SET_PROP: {
          const propIdx = inst.arg as number;
          const propName = String(this.ir.constants[propIdx]?.value || '');
          const val = this.stack.pop()!;
          const obj = this.stack.pop()!;
          if (obj.type === 'object') {
            obj.value[propName] = val;
            this.heapBytesAllocated += 32;
          }
          break;
        }

        case OpCode.NEW_ARRAY: {
          const count = (inst.arg as number) || 0;
          const elements: VMValue[] = [];
          for (let i = 0; i < count; i++) {
            elements.unshift(this.stack.pop()!);
          }
          this.heapBytesAllocated += 48 + count * 16;
          this.stack.push({ type: 'array', value: elements });
          break;
        }

        case OpCode.GET_ELEM: {
          const idxVal = this.stack.pop()!;
          const arr = this.stack.pop()!;
          const idx = Number(idxVal.value) | 0;
          if (arr.type === 'array') {
            const elem = arr.value[idx] || { type: 'null', value: null };
            this.stack.push(elem);
          } else {
            this.stack.push({ type: 'null', value: null });
          }
          break;
        }

        case OpCode.HALT:
          this.status = 'HALTED';
          return false;

        default:
          this.log('stderr', `RuntimeError: Unknown opcode 0x${inst.opcode.toString(16)} at IP: ${this.ip - 1}`);
          this.status = 'ERROR';
          return false;
      }
    } catch (err: any) {
      this.log('stderr', `VM Panic [ES4-FATAL]: ${err.message} at line ${inst.line || 'unknown'}`);
      if (this.debugFlags.vmBreakOnError) {
        this.status = 'PAUSED';
        this.log('info', `[Debug Break] VM execution paused at fault instruction for inspection.`);
      } else {
        this.status = 'ERROR';
      }
      return false;
    }

    return true;
  }

  /**
   * Java-style Garbage Collector
   */
  public garbageCollect(): { reclaimedBytes: number; durationMs: number; remainingHeap: number } {
    const startTime = performance.now();
    const oldHeap = this.heapBytesAllocated;

    // Simulate mark & sweep calculation
    const reclaimed = Math.max(1024, Math.floor(oldHeap * 0.42));
    this.heapBytesAllocated = Math.max(8192, oldHeap - reclaimed);

    const duration = +(performance.now() - startTime).toFixed(3);
    const logText = `[GC Compaction] [Full GC (System) ${Math.round(oldHeap / 1024)}K->${Math.round(
      this.heapBytesAllocated / 1024
    )}K(${Math.round(this.heapBytesAllocated * 2 / 1024)}K), ${duration} secs]`;

    this.log('gc', logText);
    this.notifyState();

    return {
      reclaimedBytes: reclaimed,
      durationMs: duration,
      remainingHeap: this.heapBytesAllocated,
    };
  }

  private isTruthy(v: VMValue): boolean {
    if (v.type === 'boolean') return v.value;
    if (v.type === 'int' || v.type === 'double') return v.value !== 0;
    if (v.type === 'string') return v.value.length > 0;
    if (v.type === 'null') return false;
    return true;
  }

  private formatValue(v: VMValue): string {
    if (v.type === 'null') return 'null';
    if (v.type === 'function') {
      return `[function ${v.className || 'Function'}]`;
    }
    if (v.type === 'object') {
      return `[object ${v.className || 'Object'}]`;
    }
    if (v.type === 'array') {
      return `[${v.value.map(e => this.formatValue(e)).join(', ')}]`;
    }
    return String(v.value);
  }
}
