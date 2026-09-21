/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ES4 Studio 2002 - Intermediate Representation (IR) Code Generator
 * Compiles ES4 AST into standard JSON IR format
 */

import { ASTNode } from './parser';
import { ES4IR, IRConstant, IRInstruction, IRSymbol, OpCode, CompilerDebugFlags } from '../types';

export class ES4CodeGen {
  private constants: IRConstant[] = [];
  private symbols: IRSymbol[] = [];
  private instructions: IRInstruction[] = [];
  private constantMap = new Map<string, number>();
  private localScopes: Map<string, number>[] = [];
  private globalScope = new Map<string, number>();
  private currentClass: string | null = null;
  private currentPackage: string | null = null;
  private flags: CompilerDebugFlags;

  constructor(
    private filename: string = 'Main.es4',
    flags?: Partial<CompilerDebugFlags>
  ) {
    this.flags = {
      emitDebugSymbols: true,
      optimizePeephole: true,
      strictTypeChecking: false,
      pedanticWarnings: false,
      vmTraceCycles: false,
      vmBreakOnError: false,
      ...flags,
    };
  }

  public compile(ast: ASTNode): ES4IR {
    this.constants = [];
    this.symbols = [];
    this.instructions = [];
    this.constantMap.clear();
    this.localScopes = [];
    this.globalScope.clear();
    this.currentClass = null;

    if (ast.body && Array.isArray(ast.body)) {
      for (const stmt of ast.body) {
        this.emitStatement(stmt);
      }
    }

    // Emit final halt
    this.emit(OpCode.HALT, 'HALT', undefined, 0, 'Program termination');

    // Run peephole optimizations if -O1 is enabled
    if (this.flags.optimizePeephole) {
      this.runPeepholePass();
    }

    // If debug symbols are disabled (-g omitted), strip line numbers and comments
    if (!this.flags.emitDebugSymbols) {
      this.instructions = this.instructions.map((inst) => ({
        op: inst.op,
        opcode: inst.opcode,
        arg: inst.arg,
      }));
    }

    return {
      format: 'ES4_INTERMEDIATE_REPRESENTATION',
      version: '0.4.2-2002',
      sourceFile: this.filename,
      timestamp: new Date().toISOString(),
      constants: this.constants,
      symbols: this.symbols,
      instructions: this.instructions,
      metadata: {
        classesCount: this.symbols.filter(s => s.scope === 'class').length,
        functionsCount: this.symbols.filter(s => s.scope === 'method' || s.scope === 'local').length,
        totalInstructions: this.instructions.length,
        optimizationLevel: this.flags.optimizePeephole ? 1 : 0,
        strictMode: this.flags.strictTypeChecking,
      },
    };
  }

  private runPeepholePass(): void {
    // Basic peephole: eliminate duplicate consecutive RETURNs or trailing unreachable code
    for (let i = 0; i < this.instructions.length - 1; i++) {
      if (this.instructions[i].op === 'RETURN' && this.instructions[i + 1].op === 'RETURN') {
        this.instructions[i + 1] = {
          op: 'NOP',
          opcode: OpCode.NOP,
          line: this.instructions[i + 1].line,
          comment: 'Optimized dead return',
        };
      }
    }
  }

  private addConstant(type: IRConstant['type'], value: any): number {
    const key = `${type}:${value}`;
    if (this.constantMap.has(key)) {
      return this.constantMap.get(key)!;
    }
    const index = this.constants.length;
    this.constants.push({ index, type, value });
    this.constantMap.set(key, index);
    return index;
  }

  private addOrUpdateSymbol(name: string, type: string, scope: 'global' | 'local' | 'class' | 'method', index: number) {
    const existing = this.symbols.find(s => s.name === name);
    if (existing) {
      existing.type = type;
      existing.scope = scope;
      existing.index = index;
    } else {
      this.symbols.push({ name, type, scope, index });
    }
  }

  private emit(opcode: OpCode, op: string, arg?: any, line?: number, comment?: string): number {
    const index = this.instructions.length;
    this.instructions.push({
      op,
      opcode,
      arg,
      line,
      comment,
    });
    return index;
  }

  private emitStatement(node: ASTNode) {
    if (!node) return;

    switch (node.type) {
      case 'PackageDeclaration': {
        const prevPkg = this.currentPackage;
        this.currentPackage = node.name || null;
        if (node.body) {
          this.emitStatement(node.body);
        }
        this.currentPackage = prevPkg;
        break;
      }

      case 'ImportDeclaration': {
        if (this.flags.emitDebugSymbols) {
          this.emit(OpCode.NOP, 'NOP', null, node.line, `import ${node.path}${node.isWildcard ? '.*' : ''}`);
        }
        break;
      }

      case 'VariableDeclaration': {
        if (this.currentClass && this.localScopes.length === 0) {
          // Class field declaration - member fields live on instances, not globals
          break;
        }
        const varName = node.name;
        if (this.localScopes.length > 0) {
          const currentLocal = this.localScopes[this.localScopes.length - 1];
          const localIndex = currentLocal.size;
          currentLocal.set(varName, localIndex);
          if (node.initializer) {
            this.emitExpression(node.initializer);
          } else {
            this.emit(OpCode.PUSH_NULL, 'PUSH_NULL', null, node.line);
          }
          this.emit(OpCode.STORE_LOCAL, 'STORE_LOCAL', localIndex, node.line, `var ${varName}`);
        } else {
          let globalIndex = this.globalScope.get(varName);
          if (globalIndex === undefined) {
            globalIndex = this.globalScope.size;
            this.globalScope.set(varName, globalIndex);
          }
          this.addOrUpdateSymbol(varName, node.typeAnnotation || 'any', 'global', globalIndex);
          if (node.initializer) {
            this.emitExpression(node.initializer);
          } else {
            this.emit(OpCode.PUSH_NULL, 'PUSH_NULL', null, node.line);
          }
          this.emit(OpCode.STORE_GLOBAL, 'STORE_GLOBAL', globalIndex, node.line, `var ${varName}`);
        }
        break;
      }

      case 'FunctionDeclaration': {
        const fnName = node.name;
        const isCtor = this.currentClass !== null && fnName === this.currentClass;
        const isMethod = this.currentClass !== null && fnName !== this.currentClass;

        // Jump over function body in normal execution stream
        const jumpOverIdx = this.emit(OpCode.JUMP, 'JUMP', 0, node.line, `Skip function ${fnName}`);
        const fnEntryAddress = this.instructions.length;

        const localMap = new Map<string, number>();

        // For methods and constructors, local 0 is 'this'
        let paramOffset = 0;
        if (isCtor || isMethod) {
          localMap.set('this', 0);
          paramOffset = 1;
        }

        if (node.params && Array.isArray(node.params)) {
          node.params.forEach((param: any, idx: number) => {
            localMap.set(param.name, idx + paramOffset);
          });
        }
        this.localScopes.push(localMap);

        if (node.body) {
          this.emitStatement(node.body);
        }

        if (isCtor) {
          // Constructors implicitly return 'this' (local 0)
          this.emit(OpCode.LOAD_LOCAL, 'LOAD_LOCAL', 0, node.line, 'return this');
          this.emit(OpCode.RETURN, 'RETURN', undefined, node.line);
        } else {
          // Implicit return null for void functions
          this.emit(OpCode.PUSH_NULL, 'PUSH_NULL', null, node.line);
          this.emit(OpCode.RETURN, 'RETURN', undefined, node.line);
        }

        this.localScopes.pop();

        // Backpatch jump over
        this.instructions[jumpOverIdx].arg = this.instructions.length;

        // Register function in global symbols
        let fnIndex = this.globalScope.get(fnName);
        if (fnIndex === undefined) {
          fnIndex = this.globalScope.size;
          this.globalScope.set(fnName, fnIndex);
        }
        this.addOrUpdateSymbol(
          fnName,
          node.returnType || (isCtor ? this.currentClass! : 'void'),
          isMethod ? 'method' : isCtor ? 'class' : 'global',
          fnIndex
        );

        // Store function entry address in global
        const constIdx = this.addConstant('int', fnEntryAddress);
        this.emit(OpCode.PUSH_CONST, 'PUSH_CONST', constIdx, node.line, `Address of ${fnName}`);
        this.emit(OpCode.STORE_GLOBAL, 'STORE_GLOBAL', fnIndex, node.line, `Bind function ${fnName}`);

        // If this is a method of the current class, also bind it to the class prototype in globals
        if (this.currentClass && isMethod) {
          const classIdx = this.globalScope.get(this.currentClass);
          if (classIdx !== undefined) {
            this.emit(OpCode.LOAD_GLOBAL, 'LOAD_GLOBAL', classIdx, node.line, `Class ${this.currentClass}`);
            this.emit(OpCode.PUSH_CONST, 'PUSH_CONST', constIdx, node.line, `Method addr ${fnName}`);
            const propConst = this.addConstant('string', fnName);
            this.emit(OpCode.SET_PROP, 'SET_PROP', propConst, node.line, `.${fnName}`);
          }
        }
        break;
      }

      case 'ClassDeclaration': {
        const className = node.name;
        this.currentClass = className;
        const qualifiedName = this.currentPackage ? `${this.currentPackage}.${className}` : className;

        let classSymIdx = this.globalScope.get(className);
        if (classSymIdx === undefined) {
          classSymIdx = this.globalScope.size;
          this.globalScope.set(className, classSymIdx);
        }
        if (this.currentPackage && !this.globalScope.has(qualifiedName)) {
          this.globalScope.set(qualifiedName, classSymIdx);
        }
        this.addOrUpdateSymbol(className, 'class', 'class', classSymIdx);
        if (this.currentPackage) {
          this.addOrUpdateSymbol(qualifiedName, className, 'class', classSymIdx);
        }

        // Process class members (methods, fields, constructor)
        if (node.members && Array.isArray(node.members)) {
          for (const member of node.members) {
            this.emitStatement(member);
          }
        }

        this.currentClass = null;
        break;
      }

      case 'BlockStatement': {
        if (node.body && Array.isArray(node.body)) {
          for (const stmt of node.body) {
            this.emitStatement(stmt);
          }
        }
        break;
      }

      case 'IfStatement': {
        this.emitExpression(node.test);
        const jumpFalseIdx = this.emit(OpCode.JUMP_IF_FALSE, 'JUMP_IF_FALSE', 0, node.line);
        this.emitStatement(node.consequent);

        if (node.alternate) {
          const jumpOverElseIdx = this.emit(OpCode.JUMP, 'JUMP', 0, node.line);
          this.instructions[jumpFalseIdx].arg = this.instructions.length;
          this.emitStatement(node.alternate);
          this.instructions[jumpOverElseIdx].arg = this.instructions.length;
        } else {
          this.instructions[jumpFalseIdx].arg = this.instructions.length;
        }
        break;
      }

      case 'WhileStatement': {
        const loopStart = this.instructions.length;
        this.emitExpression(node.test);
        const jumpExitIdx = this.emit(OpCode.JUMP_IF_FALSE, 'JUMP_IF_FALSE', 0, node.line);
        this.emitStatement(node.body);
        this.emit(OpCode.JUMP, 'JUMP', loopStart, node.line, 'Loop back');
        this.instructions[jumpExitIdx].arg = this.instructions.length;
        break;
      }

      case 'ForStatement': {
        if (node.init) {
          this.emitStatement(node.init);
        }
        const loopStart = this.instructions.length;
        let jumpExitIdx = -1;
        if (node.test) {
          this.emitExpression(node.test);
          jumpExitIdx = this.emit(OpCode.JUMP_IF_FALSE, 'JUMP_IF_FALSE', 0, node.line);
        }
        if (node.body) {
          this.emitStatement(node.body);
        }
        if (node.update) {
          this.emitExpression(node.update);
        }
        this.emit(OpCode.JUMP, 'JUMP', loopStart, node.line, 'For loop restart');
        if (jumpExitIdx >= 0) {
          this.instructions[jumpExitIdx].arg = this.instructions.length;
        }
        break;
      }

      case 'ReturnStatement': {
        if (node.argument) {
          this.emitExpression(node.argument);
        } else {
          this.emit(OpCode.PUSH_NULL, 'PUSH_NULL', null, node.line);
        }
        this.emit(OpCode.RETURN, 'RETURN', undefined, node.line);
        break;
      }

      case 'AssertStatement': {
        this.emitExpression(node.condition);
        const msgIdx = this.addConstant('string', node.message);
        this.emit(OpCode.ASSERT, 'ASSERT', msgIdx, node.line, `Assert: ${node.message}`);
        break;
      }

      case 'PrintStatement': {
        const count = node.arguments ? node.arguments.length : 0;
        if (node.arguments) {
          for (const arg of node.arguments) {
            this.emitExpression(arg);
          }
        }
        if (node.command === 'dump') {
          this.emit(OpCode.DUMP, 'DUMP', count, node.line);
        } else {
          this.emit(OpCode.PRINT, 'PRINT', count, node.line);
        }
        break;
      }

      case 'ExpressionStatement': {
        if (node.expression) {
          this.emitExpression(node.expression);
        }
        break;
      }

      default:
        break;
    }
  }

  private emitExpression(node: ASTNode) {
    if (!node) return;

    switch (node.type) {
      case 'Literal': {
        const val = node.value;
        if (val === null) {
          this.emit(OpCode.PUSH_NULL, 'PUSH_NULL', null, node.line);
        } else if (typeof val === 'boolean') {
          this.emit(OpCode.PUSH_BOOL, 'PUSH_BOOL', val ? 1 : 0, node.line);
        } else if (typeof val === 'number') {
          const type = Number.isInteger(val) ? 'int' : 'double';
          const idx = this.addConstant(type, val);
          this.emit(OpCode.PUSH_CONST, 'PUSH_CONST', idx, node.line, `${val}`);
        } else if (typeof val === 'string') {
          const idx = this.addConstant('string', val);
          this.emit(OpCode.PUSH_CONST, 'PUSH_CONST', idx, node.line, `"${val}"`);
        }
        break;
      }

      case 'ThisExpression': {
        this.emit(OpCode.LOAD_LOCAL, 'LOAD_LOCAL', 0, node.line, 'this');
        break;
      }

      case 'Identifier': {
        const name = node.name;
        if (name === 'this') {
          this.emit(OpCode.LOAD_LOCAL, 'LOAD_LOCAL', 0, node.line, 'this');
          break;
        }
        // Check local scope first
        let foundLocal = false;
        for (let i = this.localScopes.length - 1; i >= 0; i--) {
          const scope = this.localScopes[i];
          if (scope.has(name)) {
            const idx = scope.get(name)!;
            this.emit(OpCode.LOAD_LOCAL, 'LOAD_LOCAL', idx, node.line, name);
            foundLocal = true;
            break;
          }
        }
        if (!foundLocal) {
          if (this.globalScope.has(name)) {
            const idx = this.globalScope.get(name)!;
            this.emit(OpCode.LOAD_GLOBAL, 'LOAD_GLOBAL', idx, node.line, name);
          } else {
            // Builtin check or fallback
            if (name === 'clock') {
              this.emit(OpCode.CLOCK, 'CLOCK', undefined, node.line);
            } else {
              // Lazy register global
              const idx = this.globalScope.size;
              this.globalScope.set(name, idx);
              this.emit(OpCode.LOAD_GLOBAL, 'LOAD_GLOBAL', idx, node.line, name);
            }
          }
        }
        break;
      }

      case 'BinaryExpression': {
        this.emitExpression(node.left);
        this.emitExpression(node.right);
        switch (node.operator) {
          case '+': this.emit(OpCode.ADD, 'ADD', undefined, node.line); break;
          case '-': this.emit(OpCode.SUB, 'SUB', undefined, node.line); break;
          case '*': this.emit(OpCode.MUL, 'MUL', undefined, node.line); break;
          case '/': this.emit(OpCode.DIV, 'DIV', undefined, node.line); break;
          case '%': this.emit(OpCode.MOD, 'MOD', undefined, node.line); break;
          case '==': this.emit(OpCode.EQ, 'EQ', undefined, node.line); break;
          case '!=': this.emit(OpCode.NEQ, 'NEQ', undefined, node.line); break;
          case '<': this.emit(OpCode.LT, 'LT', undefined, node.line); break;
          case '<=': this.emit(OpCode.LTE, 'LTE', undefined, node.line); break;
          case '>': this.emit(OpCode.GT, 'GT', undefined, node.line); break;
          case '>=': this.emit(OpCode.GTE, 'GTE', undefined, node.line); break;
          default: break;
        }
        break;
      }

      case 'UnaryExpression': {
        this.emitExpression(node.argument);
        if (node.operator === '-') {
          this.emit(OpCode.NEG, 'NEG', undefined, node.line);
        } else if (node.operator === '!') {
          this.emit(OpCode.NOT, 'NOT', undefined, node.line);
        }
        break;
      }

      case 'AssignmentExpression': {
        if (node.left.type === 'Identifier') {
          this.emitExpression(node.right);
          const name = node.left.name;
          let foundLocal = false;
          for (let i = this.localScopes.length - 1; i >= 0; i--) {
            const scope = this.localScopes[i];
            if (scope.has(name)) {
              const idx = scope.get(name)!;
              this.emit(OpCode.STORE_LOCAL, 'STORE_LOCAL', idx, node.line, name);
              foundLocal = true;
              break;
            }
          }
          if (!foundLocal) {
            let idx = this.globalScope.get(name);
            if (idx === undefined) {
              idx = this.globalScope.size;
              this.globalScope.set(name, idx);
            }
            this.emit(OpCode.STORE_GLOBAL, 'STORE_GLOBAL', idx, node.line, name);
          }
        } else if (node.left.type === 'MemberExpression') {
          // Push target object first, then value
          this.emitExpression(node.left.object);
          this.emitExpression(node.right);
          const propIdx = this.addConstant('string', node.left.property);
          this.emit(OpCode.SET_PROP, 'SET_PROP', propIdx, node.line, `.${node.left.property}`);
        }
        break;
      }

      case 'CallExpression': {
        if (node.callee && node.callee.type === 'MemberExpression') {
          // Method invocation: receiver is passed as local 0 ('this')
          this.emitExpression(node.callee.object);
          const argCount = node.arguments ? node.arguments.length : 0;
          if (node.arguments) {
            for (const arg of node.arguments) {
              this.emitExpression(arg);
            }
          }
          const methodName = node.callee.property;
          const fnIdx = this.globalScope.get(methodName);
          if (fnIdx !== undefined) {
            this.emit(OpCode.LOAD_GLOBAL, 'LOAD_GLOBAL', fnIdx, node.line, `Method ${methodName}`);
          } else {
            // Dynamic member property lookup
            this.emitExpression(node.callee.object);
            const propIdx = this.addConstant('string', methodName);
            this.emit(OpCode.GET_PROP, 'GET_PROP', propIdx, node.line, `.${methodName}`);
          }
          // argCount + 1 accounts for receiver object passed as local 0
          this.emit(OpCode.CALL, 'CALL', argCount + 1, node.line);
        } else {
          const argCount = node.arguments ? node.arguments.length : 0;
          if (node.arguments) {
            for (const arg of node.arguments) {
              this.emitExpression(arg);
            }
          }
          this.emitExpression(node.callee);
          this.emit(OpCode.CALL, 'CALL', argCount, node.line);
        }
        break;
      }

      case 'MemberExpression': {
        this.emitExpression(node.object);
        const propIdx = this.addConstant('string', node.property);
        this.emit(OpCode.GET_PROP, 'GET_PROP', propIdx, node.line, `.${node.property}`);
        break;
      }

      case 'NewExpression': {
        const className = node.callee;
        const shortName = className.includes('.') ? className.split('.').pop()! : className;
        const classConstIdx = this.addConstant('string', shortName);
        // 1. Create fresh instance
        this.emit(OpCode.NEW_OBJ, 'NEW_OBJ', classConstIdx, node.line, `new ${className}`);

        // 2. If constructor exists, invoke it with the new object as 'this'
        let ctorIdx = this.globalScope.get(className);
        if (ctorIdx === undefined && shortName !== className) {
          ctorIdx = this.globalScope.get(shortName);
        }
        if (ctorIdx !== undefined) {
          const argCount = node.arguments ? node.arguments.length : 0;
          if (node.arguments) {
            for (const arg of node.arguments) {
              this.emitExpression(arg);
            }
          }
          this.emit(OpCode.LOAD_GLOBAL, 'LOAD_GLOBAL', ctorIdx, node.line, `${className} ctor`);
          this.emit(OpCode.CALL, 'CALL', argCount + 1, node.line);
        }
        break;
      }

      case 'ArrayLiteral': {
        const count = node.elements ? node.elements.length : 0;
        if (node.elements) {
          for (const el of node.elements) {
            this.emitExpression(el);
          }
        }
        this.emit(OpCode.NEW_ARRAY, 'NEW_ARRAY', count, node.line);
        break;
      }

      case 'IndexExpression': {
        this.emitExpression(node.object);
        this.emitExpression(node.index);
        this.emit(OpCode.GET_ELEM, 'GET_ELEM', undefined, node.line);
        break;
      }

      case 'UpdateExpression': {
        if (node.argument.type === 'Identifier') {
          const name = node.argument.name;
          this.emitExpression(node.argument);
          const oneIdx = this.addConstant('int', 1);
          this.emit(OpCode.PUSH_CONST, 'PUSH_CONST', oneIdx, node.line);
          if (node.operator === '++') {
            this.emit(OpCode.ADD, 'ADD', undefined, node.line);
          } else {
            this.emit(OpCode.SUB, 'SUB', undefined, node.line);
          }
          // Store back
          let foundLocal = false;
          for (let i = this.localScopes.length - 1; i >= 0; i--) {
            if (this.localScopes[i].has(name)) {
              this.emit(OpCode.STORE_LOCAL, 'STORE_LOCAL', this.localScopes[i].get(name)!, node.line);
              foundLocal = true;
              break;
            }
          }
          if (!foundLocal) {
            const idx = this.globalScope.get(name) || 0;
            this.emit(OpCode.STORE_GLOBAL, 'STORE_GLOBAL', idx, node.line);
          }
        }
        break;
      }

      default:
        break;
    }
  }
}
