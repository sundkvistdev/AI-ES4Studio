/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ES4 Studio 2002 - Binary Bytecode Compiler & Disassembler
 * Handles serialization/deserialization between ES4IR and raw binary (.es4b)
 */

import { DisassembledInstruction, ES4IR, IRConstant, IRInstruction, IRSymbol, OpCode } from '../types';

export const ES4_BINARY_MAGIC = new Uint8Array([0x45, 0x53, 0x34, 0x02]); // "ES4\x02"
export const ES4_BINARY_VERSION = 0x0004;

export class BinaryCompiler {
  /**
   * Compiles JSON IR into a binary Uint8Array (.es4b executable)
   */
  public static compileToBinary(ir: ES4IR): Uint8Array {
    const buffer: number[] = [];

    // Helper writer functions
    const writeBytes = (bytes: number[] | Uint8Array) => {
      for (let i = 0; i < bytes.length; i++) {
        buffer.push(bytes[i]);
      }
    };

    const writeUint16 = (val: number) => {
      buffer.push((val >> 8) & 0xff);
      buffer.push(val & 0xff);
    };

    const writeInt32 = (val: number) => {
      buffer.push((val >> 24) & 0xff);
      buffer.push((val >> 16) & 0xff);
      buffer.push((val >> 8) & 0xff);
      buffer.push(val & 0xff);
    };

    const writeFloat64 = (val: number) => {
      const floatBuf = new Float64Array([val]);
      const byteView = new Uint8Array(floatBuf.buffer);
      for (let i = 0; i < 8; i++) {
        buffer.push(byteView[i]);
      }
    };

    const writeString = (str: string) => {
      const encoder = new TextEncoder();
      const encoded = encoder.encode(str);
      writeUint16(encoded.length);
      writeBytes(encoded);
    };

    // 1. Magic header (4 bytes)
    writeBytes(ES4_BINARY_MAGIC);

    // 2. Version (2 bytes)
    writeUint16(ES4_BINARY_VERSION);

    // 3. Constant Pool Section
    writeUint16(ir.constants.length);
    for (const c of ir.constants) {
      switch (c.type) {
        case 'string':
          buffer.push(0x01); // tag string
          writeString(String(c.value));
          break;
        case 'int':
          buffer.push(0x02); // tag int
          writeInt32(Number(c.value) | 0);
          break;
        case 'double':
          buffer.push(0x03); // tag double
          writeFloat64(Number(c.value));
          break;
        case 'boolean':
          buffer.push(0x04); // tag boolean
          buffer.push(c.value ? 1 : 0);
          break;
        case 'null':
        default:
          buffer.push(0x05); // tag null
          break;
      }
    }

    // 4. Symbols Section
    writeUint16(ir.symbols.length);
    for (const s of ir.symbols) {
      writeString(s.name);
      writeString(s.type);
      buffer.push(s.scope === 'global' ? 1 : s.scope === 'class' ? 2 : 3);
      writeInt32(s.index);
    }

    // 5. Bytecode Instruction Section
    writeUint16(ir.instructions.length);
    for (const inst of ir.instructions) {
      buffer.push(inst.opcode & 0xff);

      // 4-byte argument
      const argVal = typeof inst.arg === 'number' ? inst.arg : 0;
      writeInt32(argVal);

      // 2-byte line number mapping
      writeUint16(inst.line || 0);
    }

    return new Uint8Array(buffer);
  }

  /**
   * Deserializes binary .es4b Uint8Array back into an ES4IR structure
   */
  public static parseFromBinary(data: Uint8Array): ES4IR {
    let offset = 0;

    const readUint8 = () => data[offset++];
    const readUint16 = () => {
      const val = (data[offset] << 8) | data[offset + 1];
      offset += 2;
      return val;
    };
    const readInt32 = () => {
      const val =
        (data[offset] << 24) |
        (data[offset + 1] << 16) |
        (data[offset + 2] << 8) |
        data[offset + 3];
      offset += 4;
      return val;
    };
    const readFloat64 = () => {
      const slice = data.slice(offset, offset + 8);
      offset += 8;
      const view = new Float64Array(slice.buffer, slice.byteOffset, 1);
      return view[0];
    };
    const readString = () => {
      const len = readUint16();
      const bytes = data.slice(offset, offset + len);
      offset += len;
      const decoder = new TextDecoder();
      return decoder.decode(bytes);
    };

    // Verify magic
    for (let i = 0; i < 4; i++) {
      if (data[offset + i] !== ES4_BINARY_MAGIC[i]) {
        throw new Error('Invalid ES4 binary format: missing ES4\\x02 magic header');
      }
    }
    offset += 4;

    const version = readUint16();
    if (version !== ES4_BINARY_VERSION) {
      throw new Error(`Unsupported ES4 binary version: 0x${version.toString(16)}. Expected 0x${ES4_BINARY_VERSION.toString(16)}`);
    }

    // Constant Pool
    const constCount = readUint16();
    const constants: IRConstant[] = [];
    for (let i = 0; i < constCount; i++) {
      const tag = readUint8();
      let type: IRConstant['type'] = 'null';
      let value: any = null;

      if (tag === 0x01) {
        type = 'string';
        value = readString();
      } else if (tag === 0x02) {
        type = 'int';
        value = readInt32();
      } else if (tag === 0x03) {
        type = 'double';
        value = readFloat64();
      } else if (tag === 0x04) {
        type = 'boolean';
        value = readUint8() === 1;
      } else if (tag === 0x05) {
        type = 'null';
        value = null;
      }
      constants.push({ index: i, type, value });
    }

    // Symbols
    const symCount = readUint16();
    const symbols: IRSymbol[] = [];
    for (let i = 0; i < symCount; i++) {
      const name = readString();
      const type = readString();
      const scopeTag = readUint8();
      const scope = scopeTag === 1 ? 'global' : scopeTag === 2 ? 'class' : 'local';
      const index = readInt32();
      symbols.push({ name, type, scope, index });
    }

    // Instructions
    const instCount = readUint16();
    const instructions: IRInstruction[] = [];
    for (let i = 0; i < instCount; i++) {
      const opcode = readUint8();
      const arg = readInt32();
      const line = readUint16();
      const opName = OpCode[opcode] || `UNKNOWN_0x${opcode.toString(16)}`;

      instructions.push({
        op: opName,
        opcode,
        arg,
        line,
      });
    }

    return {
      format: 'ES4_INTERMEDIATE_REPRESENTATION',
      version: '0.4.2-2002',
      sourceFile: 'imported.es4b',
      timestamp: new Date().toISOString(),
      constants,
      symbols,
      instructions,
      metadata: {
        classesCount: symbols.filter(s => s.scope === 'class').length,
        functionsCount: symbols.filter(s => s.scope === 'local').length,
        totalInstructions: instructions.length,
        optimizationLevel: 1,
        strictMode: true,
      },
    };
  }

  /**
   * Disassembles IR or binary instructions into formatted assembly text
   */
  public static disassemble(ir: ES4IR): DisassembledInstruction[] {
    const list: DisassembledInstruction[] = [];
    let offset = 0;

    for (let i = 0; i < ir.instructions.length; i++) {
      const inst = ir.instructions[i];
      const numArg = typeof inst.arg === 'number' ? inst.arg : 0;
      const bytes = [inst.opcode, numArg & 0xff];

      let argDisplay = '';
      let comment = inst.comment;

      if (inst.opcode === OpCode.PUSH_CONST && typeof inst.arg === 'number') {
        const c = ir.constants[inst.arg];
        if (c) {
          argDisplay = `#${inst.arg}`;
          comment = `${c.type}: ${JSON.stringify(c.value)}`;
        }
      } else if (
        inst.opcode === OpCode.JUMP ||
        inst.opcode === OpCode.JUMP_IF_FALSE ||
        inst.opcode === OpCode.JUMP_IF_TRUE
      ) {
        argDisplay = `-> [addr ${inst.arg}]`;
      } else if (inst.arg !== undefined && inst.arg !== null) {
        argDisplay = String(inst.arg);
      }

      list.push({
        offset,
        bytes,
        mnemonic: inst.op,
        argDisplay,
        comment,
        line: inst.line,
      });

      offset += 7; // opcode(1) + arg(4) + line(2)
    }

    return list;
  }

  /**
   * Formats a Uint8Array into a classic 16-column hex dump
   */
  public static generateHexDump(data: Uint8Array): string {
    const lines: string[] = [];
    for (let i = 0; i < data.length; i += 16) {
      const chunk = data.slice(i, i + 16);
      const hexParts: string[] = [];
      let ascii = '';

      for (let j = 0; j < 16; j++) {
        if (j < chunk.length) {
          hexParts.push(chunk[j].toString(16).padStart(2, '0').toUpperCase());
          const byte = chunk[j];
          ascii += byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
        } else {
          hexParts.push('  ');
          ascii += ' ';
        }
        if (j === 7) hexParts.push(''); // spacing in middle
      }

      const offsetStr = i.toString(16).padStart(8, '0').toUpperCase();
      lines.push(`${offsetStr}  ${hexParts.join(' ')}  |${ascii}|`);
    }
    return lines.join('\n');
  }
}
