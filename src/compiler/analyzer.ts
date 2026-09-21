/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ES4 Studio 2002 - Advanced Semantic Analyzer, Context-Aware CodeMagic & Hover Engine
 * Grounded in ECMAScript 4 (Draft Oct 2002) Language Specification
 * Featuring Structured Technical Inspection, Standard Packages & Modules
 */

import { CodeMagicItem, HoverInfo, Diagnostic, TechnicalBadge, ParameterDoc, MemberDoc } from '../types';

export interface SemanticSymbol {
  name: string;
  kind: 'class' | 'method' | 'function' | 'variable' | 'parameter' | 'field' | 'type' | 'package';
  type: string;
  signature?: string;
  documentation?: string;
  line: number;
  col: number;
  className?: string; // If method or field
  packageName?: string;
  modifiers?: string[];
  isStatic?: boolean;
  isPrivate?: boolean;
  isOverride?: boolean;
  isConst?: boolean;
  params?: { name: string; type: string; doc?: string }[];
  returnType?: string;
  slotIndex?: number;
}

export interface ClassDefinition {
  name: string;
  packageName?: string;
  line: number;
  doc?: string;
  extendsClass?: string;
  modifiers?: string[];
  fields: SemanticSymbol[];
  methods: SemanticSymbol[];
  constructorParams?: { name: string; type: string; doc?: string }[];
}

export interface PackageDefinition {
  name: string;
  doc?: string;
  classes: Map<string, ClassDefinition>;
  functions: Map<string, SemanticSymbol>;
}

export interface ImportDirective {
  path: string;
  isWildcard: boolean;
  alias?: string;
  line: number;
}

export interface ScopeContext {
  enclosingClass?: string;
  enclosingFunction?: string;
  packageName?: string;
  localVars: SemanticSymbol[];
  parameters: SemanticSymbol[];
}

// Built-in documentation for ECMAScript 4 Draft keywords with technical specs
export const ES4_KEYWORD_DOCS: Record<string, { title: string; desc: string; spec: string; example: string; category: string }> = {
  package: {
    title: 'package (Namespace Package)',
    desc: 'Declares an explicit modular namespace container that isolates global symbol scopes.',
    spec: 'ECMAScript 4 Draft (Oct 2002) Section 12.1 - Packages and Namespaces',
    example: 'package std.math {\n  public class Vector { ... }\n}',
    category: 'Modular System',
  },
  import: {
    title: 'import (Package Import Directive)',
    desc: 'Imports exported classes, functions, or entire packages into the local lexical scope.',
    spec: 'ECMAScript 4 Draft (Oct 2002) Section 12.3 - Import Directives',
    example: 'import std.math.Vector;\nimport std.collections.*;',
    category: 'Modular System',
  },
  as: {
    title: 'as (Import / Type Alias)',
    desc: 'Specifies a local alias for an imported module or provides explicit type coercion.',
    spec: 'ECMAScript 4 Draft Section 12.3.2 - Aliased Imports',
    example: 'import std.collections.Map as HashMap;',
    category: 'Modular System',
  },
  class: {
    title: 'class (Class Definition)',
    desc: 'Declares an object type with single inheritance, typed fields, and method dispatch tables.',
    spec: 'ECMAScript 4 Draft (Oct 2002) Section 11.1 - Class Declarations',
    example: 'class Rectangle extends Shape { ... }',
    category: 'Object Oriented',
  },
  function: {
    title: 'function (Function Declaration)',
    desc: 'Defines a named callable routine with typed parameter constraints and return value signatures.',
    spec: 'ECMAScript 4 Draft (Oct 2002) Section 10.3 - Typed Functions',
    example: 'function calculate(x: int, y: int): int { return x + y; }',
    category: 'Routines',
  },
  var: {
    title: 'var (Mutable Variable)',
    desc: 'Declares a mutable storage slot within the local register frame or global symbol table.',
    spec: 'ECMAScript 4 Draft (Oct 2002) Section 8.2 - Variable Declarations',
    example: 'var count: int = 0;',
    category: 'Storage Declarations',
  },
  const: {
    title: 'const (Compile-Time Constant)',
    desc: 'Declares an immutable symbol that cannot be modified after initial assignment.',
    spec: 'ECMAScript 4 Draft (Oct 2002) Section 8.3 - Constant Declarations',
    example: 'const MAX_CONNECTIONS: int = 100;',
    category: 'Storage Declarations',
  },
  override: {
    title: 'override (Virtual Method Override)',
    desc: 'Explicit modifier indicating that a member method overrides a virtual method in a superclass.',
    spec: 'ECMAScript 4 Draft (Oct 2002) Section 11.4 - Method Modifiers',
    example: 'override function toString(): string { return "Custom"; }',
    category: 'Member Modifiers',
  },
  public: {
    title: 'public (Unrestricted Visibility)',
    desc: 'Grants universal access to the member from any scope across packages.',
    spec: 'ECMAScript 4 Draft Section 11.2 - Access Control',
    example: 'public var title: string;',
    category: 'Access Modifiers',
  },
  private: {
    title: 'private (Class Scope Visibility)',
    desc: 'Restricts member access strictly to methods declared directly within the containing class.',
    spec: 'ECMAScript 4 Draft Section 11.2 - Access Control',
    example: 'private var secretKey: string;',
    category: 'Access Modifiers',
  },
  protected: {
    title: 'protected (Family Visibility)',
    desc: 'Limits member access to the declaring class and any classes deriving from it.',
    spec: 'ECMAScript 4 Draft Section 11.2 - Access Control',
    example: 'protected var refCount: int;',
    category: 'Access Modifiers',
  },
  static: {
    title: 'static (Class Level Member)',
    desc: 'Binds the member to the constructor object itself rather than individual instances.',
    spec: 'ECMAScript 4 Draft Section 11.3 - Static Members',
    example: 'public static function create(): MyClass { ... }',
    category: 'Member Modifiers',
  },
  type: {
    title: 'type (Type Definition Alias)',
    desc: 'Defines a named type alias or structural type constraint.',
    spec: 'ECMAScript 4 Draft (Oct 2002) Section 4.5 - Type Definitions',
    example: 'type Coordinate = double;',
    category: 'Type System',
  },
  assert: {
    title: 'assert (Runtime Assertion)',
    desc: 'Evaluates a boolean condition at runtime; halts VM execution if false.',
    spec: 'ECMAScript 4 Draft Diagnostic Specification (Section 14)',
    example: 'assert(total >= 0, "Total must be non-negative");',
    category: 'Diagnostics',
  },
  int: {
    title: 'int (32-Bit Signed Integer)',
    desc: 'Hardware-mapped 32-bit two\'s-complement integer with wrap-around arithmetic (-2,147,483,648 to 2,147,483,647).',
    spec: 'ECMAScript 4 Draft (Oct 2002) Section 3.2.1 - Fast Numeric Types',
    example: 'var x: int = 42;',
    category: 'Primitive Types',
  },
  uint: {
    title: 'uint (32-Bit Unsigned Integer)',
    desc: 'Hardware-mapped 32-bit unsigned integer (0 to 4,294,967,295).',
    spec: 'ECMAScript 4 Draft (Oct 2002) Section 3.2.2 - Unsigned Types',
    example: 'var index: uint = 0x80000000;',
    category: 'Primitive Types',
  },
  double: {
    title: 'double (64-Bit Floating Point)',
    desc: 'Standard IEEE-754 double precision floating point number (default numeric type).',
    spec: 'ECMAScript 4 Draft (Oct 2002) Section 3.2.3 - Floating-point Types',
    example: 'var pi: double = 3.141592653589793;',
    category: 'Primitive Types',
  },
  string: {
    title: 'string (Primitive String)',
    desc: 'UTF-16 sequence of characters with standard string prototype methods.',
    spec: 'ECMAScript 4 Draft (Oct 2002) Section 3.3 - Strings',
    example: 'var name: string = "ES4";',
    category: 'Primitive Types',
  },
  boolean: {
    title: 'boolean (Boolean Flag)',
    desc: 'Logical truth value consisting solely of true or false.',
    spec: 'ECMAScript 4 Draft (Oct 2002) Section 3.1 - Booleans',
    example: 'var active: boolean = true;',
    category: 'Primitive Types',
  },
  void: {
    title: 'void (Empty Return Type)',
    desc: 'Specifies that a function returns no value.',
    spec: 'ECMAScript 4 Draft (Oct 2002) Section 3.6 - Void Type',
    example: 'function logMessage(msg: string): void { ... }',
    category: 'Primitive Types',
  },
  print: {
    title: 'print (Built-in Output)',
    desc: 'Prints values directly to the ES4 Virtual Machine standard output console.',
    spec: 'ECMAScript 4 Draft Runtime Environment Host API',
    example: 'print("Result:", 42);',
    category: 'Built-in I/O',
  },
  dump: {
    title: 'dump (Built-in Heap Inspector)',
    desc: 'Inspects and outputs the internal memory representation and properties of an object.',
    spec: 'ECMAScript 4 Draft VM Debugger API',
    example: 'dump(myObject);',
    category: 'Built-in I/O',
  },
  clock: {
    title: 'clock (High-Resolution Timer)',
    desc: 'Returns the execution timestamp in high-resolution milliseconds from program start.',
    spec: 'ECMAScript 4 Draft Benchmark API',
    example: 'var t0: double = clock();',
    category: 'Built-in Timing',
  },
  this: {
    title: 'this (Instance Self Reference)',
    desc: 'Refers to the current class instance within non-static methods or constructors.',
    spec: 'ECMAScript 4 Draft Section 9.1',
    example: 'this.width = w;',
    category: 'Context',
  },
  return: {
    title: 'return (Exit Function)',
    desc: 'Exits from the current function, optionally returning an evaluated value.',
    spec: 'ECMAScript 4 Draft Section 9.5',
    example: 'return result;',
    category: 'Control Flow',
  },
  new: {
    title: 'new (Instantiate Class)',
    desc: 'Allocates a new heap instance of a class and invokes its constructor method.',
    spec: 'ECMAScript 4 Draft Section 9.3',
    example: 'var v: Vector = new Vector(1.0, 2.0, 3.0);',
    category: 'Object Allocation',
  },
  for: {
    title: 'for (Iteration Loop)',
    desc: 'Initializes and executes an indexed, condition-tested loop or for..in iteration over object keys.',
    spec: 'ECMA-262 3rd/4th Edition Section 12.6.3',
    example: 'for (var i: int = 0; i < len; i++) { ... }',
    category: 'Control Flow',
  },
  while: {
    title: 'while (Pre-Condition Loop)',
    desc: 'Repeatedly executes a statement block while the boolean condition evaluates to true.',
    spec: 'ECMA-262 3rd/4th Edition Section 12.6.2',
    example: 'while (hasMore) { process(); }',
    category: 'Control Flow',
  },
  do: {
    title: 'do..while (Post-Condition Loop)',
    desc: 'Executes a statement block at least once, repeating until the boolean condition evaluates to false.',
    spec: 'ECMA-262 3rd/4th Edition Section 12.6.1',
    example: 'do { step(); } while (condition);',
    category: 'Control Flow',
  },
  switch: {
    title: 'switch (Multi-Branch Dispatch)',
    desc: 'Evaluates an expression and matches its value against case clauses for branching execution.',
    spec: 'ECMA-262 3rd/4th Edition Section 12.11',
    example: 'switch (opcode) { case 1: handleOne(); break; default: handleDefault(); }',
    category: 'Control Flow',
  },
  case: {
    title: 'case (Branch Label)',
    desc: 'Defines a comparison target value within a switch statement block.',
    spec: 'ECMA-262 3rd/4th Edition Section 12.11',
    example: 'case OpCode.ADD: return a + b;',
    category: 'Control Flow',
  },
  default: {
    title: 'default (Fallback Branch)',
    desc: 'Specifies fallback execution in a switch statement when no case clause matches.',
    spec: 'ECMA-262 3rd/4th Edition Section 12.11',
    example: 'default: return null;',
    category: 'Control Flow',
  },
  break: {
    title: 'break (Loop/Switch Exit)',
    desc: 'Terminates execution of the innermost loop or switch statement.',
    spec: 'ECMA-262 3rd/4th Edition Section 12.8',
    example: 'break;',
    category: 'Control Flow',
  },
  continue: {
    title: 'continue (Loop Step)',
    desc: 'Skips the remaining statements of the current iteration and advances the innermost loop.',
    spec: 'ECMA-262 3rd/4th Edition Section 12.7',
    example: 'continue;',
    category: 'Control Flow',
  },
  try: {
    title: 'try (Guarded Block)',
    desc: 'Defines a guarded statement block to capture and handle runtime exceptions with catch and finally.',
    spec: 'ECMA-262 3rd/4th Edition Section 12.14',
    example: 'try { compute(); } catch (e: Exception) { log(e); }',
    category: 'Exception Handling',
  },
  catch: {
    title: 'catch (Exception Handler)',
    desc: 'Catches and binds an exception thrown inside a try block.',
    spec: 'ECMA-262 3rd/4th Edition Section 12.14',
    example: 'catch (e: Exception) { ... }',
    category: 'Exception Handling',
  },
  finally: {
    title: 'finally (Guaranteed Cleanup)',
    desc: 'Statement block guaranteed to execute regardless of whether an exception occurred or was handled.',
    spec: 'ECMA-262 3rd/4th Edition Section 12.14',
    example: 'finally { stream.close(); }',
    category: 'Exception Handling',
  },
  throw: {
    title: 'throw (Raise Exception)',
    desc: 'Halts current execution path and signals an exceptional runtime condition or error object.',
    spec: 'ECMA-262 3rd/4th Edition Section 12.13',
    example: 'throw new Exception("Index out of bounds");',
    category: 'Exception Handling',
  },
  namespace: {
    title: 'namespace (Explicit Identifier Domain)',
    desc: 'Declares an explicit visibility namespace for method and property qualification with the :: operator.',
    spec: 'ECMAScript 4 Draft Section 5 - Namespaces',
    example: 'namespace internal_api = "urn:myapp:internal";',
    category: 'Namespaces',
  },
  is: {
    title: 'is (Runtime Type Check)',
    desc: 'Evaluates whether an expression evaluates to an instance of the specified nominal type.',
    spec: 'ECMAScript 4 Draft Section 6.2 - Type Operators',
    example: 'if (obj is Vector) { ... }',
    category: 'Type Operators',
  },
  instanceof: {
    title: 'instanceof (Prototype / Class Check)',
    desc: 'Tests whether the prototype property of a constructor appears anywhere in the prototype chain of an object.',
    spec: 'ECMA-262 3rd Edition Section 11.8.6',
    example: 'if (x instanceof Array) { ... }',
    category: 'Type Operators',
  },
  typeof: {
    title: 'typeof (Type Query)',
    desc: 'Returns a string indicating the type of the unevaluated operand.',
    spec: 'ECMA-262 3rd Edition Section 11.4.3',
    example: 'typeof val === "string"',
    category: 'Type Operators',
  },
  delete: {
    title: 'delete (Remove Property)',
    desc: 'Removes a dynamic property from an object.',
    spec: 'ECMA-262 3rd Edition Section 11.4.1',
    example: 'delete obj.temp;',
    category: 'Object Mutation',
  },
  Reflect: {
    title: 'Reflect (Runtime Reflection API)',
    desc: 'Standard reflection namespace providing runtime introspection of objects, types, fields, and slots.',
    spec: 'ECMAScript 4 Reflection Model (std.lang.Reflect)',
    example: 'var info = Reflect.describeType(v);',
    category: 'Reflection',
  },
};

// Standard Built-in Packages Specification (ECMA-262 4th Edition standard libraries)
export const ES4_STANDARD_PACKAGES: Record<string, {
  name: string;
  doc: string;
  classes: Record<string, {
    name: string;
    doc: string;
    ctorParams: { name: string; type: string; doc?: string }[];
    fields: { name: string; type: string; isStatic?: boolean; doc?: string }[];
    methods: { name: string; signature: string; returnType: string; params: { name: string; type: string }[]; isStatic?: boolean; doc?: string }[];
  }>;
}> = {
  'std.math': {
    name: 'std.math',
    doc: 'Standard high-performance mathematical functions, vector math, matrices, and numeric constants.',
    classes: {
      Vector: {
        name: 'Vector',
        doc: 'High-speed 3-dimensional Euclidean vector with linear algebra operations.',
        ctorParams: [
          { name: 'x', type: 'double', doc: 'X coordinate' },
          { name: 'y', type: 'double', doc: 'Y coordinate' },
          { name: 'z', type: 'double', doc: 'Z coordinate (defaults to 0.0)' },
        ],
        fields: [
          { name: 'x', type: 'double', doc: 'X-axis component' },
          { name: 'y', type: 'double', doc: 'Y-axis component' },
          { name: 'z', type: 'double', doc: 'Z-axis component' },
        ],
        methods: [
          { name: 'length', signature: 'length(): double', returnType: 'double', params: [], doc: 'Calculates the Euclidean magnitude of the vector.' },
          { name: 'normalize', signature: 'normalize(): Vector', returnType: 'Vector', params: [], doc: 'Returns a unit-length vector pointing in the same direction.' },
          { name: 'dot', signature: 'dot(other: Vector): double', returnType: 'double', params: [{ name: 'other', type: 'Vector' }], doc: 'Computes the scalar dot product between two vectors.' },
          { name: 'cross', signature: 'cross(other: Vector): Vector', returnType: 'Vector', params: [{ name: 'other', type: 'Vector' }], doc: 'Computes the orthogonal cross product vector.' },
          { name: 'add', signature: 'add(other: Vector): Vector', returnType: 'Vector', params: [{ name: 'other', type: 'Vector' }], doc: 'Returns vector sum (this + other).' },
          { name: 'scale', signature: 'scale(factor: double): Vector', returnType: 'Vector', params: [{ name: 'factor', type: 'double' }], doc: 'Multiplies all vector components by scalar factor.' },
          { name: 'distanceTo', signature: 'distanceTo(other: Vector): double', returnType: 'double', params: [{ name: 'other', type: 'Vector' }], doc: 'Calculates Euclidean distance to target vector.' },
        ],
      },
      Point: {
        name: 'Point',
        doc: '2-dimensional Cartesian point representation.',
        ctorParams: [
          { name: 'x', type: 'double', doc: 'Horizontal coordinate' },
          { name: 'y', type: 'double', doc: 'Vertical coordinate' },
        ],
        fields: [
          { name: 'x', type: 'double', doc: 'Horizontal X position' },
          { name: 'y', type: 'double', doc: 'Vertical Y position' },
        ],
        methods: [
          { name: 'distanceTo', signature: 'distanceTo(target: Point): double', returnType: 'double', params: [{ name: 'target', type: 'Point' }], doc: 'Calculates straight line distance to target point.' },
          { name: 'translate', signature: 'translate(dx: double, dy: double): Point', returnType: 'Point', params: [{ name: 'dx', type: 'double' }, { name: 'dy', type: 'double' }], doc: 'Returns a new point shifted by delta x and y.' },
        ],
      },
      Matrix: {
        name: 'Matrix',
        doc: '2D rectangular numeric matrix for transformations and linear algebraic systems.',
        ctorParams: [
          { name: 'rows', type: 'int', doc: 'Number of rows' },
          { name: 'cols', type: 'int', doc: 'Number of columns' },
        ],
        fields: [
          { name: 'rows', type: 'int', doc: 'Row dimension' },
          { name: 'cols', type: 'int', doc: 'Column dimension' },
        ],
        methods: [
          { name: 'get', signature: 'get(row: int, col: int): double', returnType: 'double', params: [{ name: 'row', type: 'int' }, { name: 'col', type: 'int' }], doc: 'Gets element at (row, col).' },
          { name: 'set', signature: 'set(row: int, col: int, val: double): void', returnType: 'void', params: [{ name: 'row', type: 'int' }, { name: 'col', type: 'int' }, { name: 'val', type: 'double' }], doc: 'Sets element value at (row, col).' },
          { name: 'multiply', signature: 'multiply(other: Matrix): Matrix', returnType: 'Matrix', params: [{ name: 'other', type: 'Matrix' }], doc: 'Matrix dot multiplication (this * other).' },
          { name: 'identity', signature: 'static identity(size: int): Matrix', returnType: 'Matrix', params: [{ name: 'size', type: 'int' }], isStatic: true, doc: 'Generates an identity matrix of size N x N.' },
        ],
      },
      Complex: {
        name: 'Complex',
        doc: 'Complex number representation with real and imaginary components.',
        ctorParams: [
          { name: 'real', type: 'double', doc: 'Real component' },
          { name: 'imag', type: 'double', doc: 'Imaginary component' },
        ],
        fields: [
          { name: 'real', type: 'double', doc: 'Real part' },
          { name: 'imag', type: 'double', doc: 'Imaginary part' },
        ],
        methods: [
          { name: 'magnitude', signature: 'magnitude(): double', returnType: 'double', params: [], doc: 'Calculates absolute magnitude |z|.' },
          { name: 'add', signature: 'add(other: Complex): Complex', returnType: 'Complex', params: [{ name: 'other', type: 'Complex' }], doc: 'Sums two complex numbers.' },
        ],
      },
    },
  },
  'std.io': {
    name: 'std.io',
    doc: 'Input/output stream formatting, console logging, and string encoding facilities.',
    classes: {
      Console: {
        name: 'Console',
        doc: 'Standard console I/O stream controller.',
        ctorParams: [],
        fields: [],
        methods: [
          { name: 'print', signature: 'static print(...args: any[]): void', returnType: 'void', params: [{ name: 'args', type: 'any[]' }], isStatic: true, doc: 'Writes arguments without trailing newline.' },
          { name: 'println', signature: 'static println(...args: any[]): void', returnType: 'void', params: [{ name: 'args', type: 'any[]' }], isStatic: true, doc: 'Writes arguments followed by newline.' },
          { name: 'error', signature: 'static error(...args: any[]): void', returnType: 'void', params: [{ name: 'args', type: 'any[]' }], isStatic: true, doc: 'Outputs formatted error message to standard error.' },
          { name: 'warn', signature: 'static warn(...args: any[]): void', returnType: 'void', params: [{ name: 'args', type: 'any[]' }], isStatic: true, doc: 'Outputs warning diagnostic notice.' },
        ],
      },
      Stream: {
        name: 'Stream',
        doc: 'Buffered character output stream.',
        ctorParams: [{ name: 'bufferSize', type: 'int', doc: 'Initial buffer size in bytes' }],
        fields: [{ name: 'isOpen', type: 'boolean', doc: 'Whether the stream is open' }],
        methods: [
          { name: 'write', signature: 'write(data: string): void', returnType: 'void', params: [{ name: 'data', type: 'string' }], doc: 'Appends data to stream buffer.' },
          { name: 'flush', signature: 'flush(): void', returnType: 'void', params: [], doc: 'Flushes internal buffer to underlying device.' },
          { name: 'close', signature: 'close(): void', returnType: 'void', params: [], doc: 'Closes stream and releases resources.' },
        ],
      },
      Formatter: {
        name: 'Formatter',
        doc: 'String and numeric formatting utility.',
        ctorParams: [],
        fields: [],
        methods: [
          { name: 'hex', signature: 'static hex(val: int): string', returnType: 'string', params: [{ name: 'val', type: 'int' }], isStatic: true, doc: 'Formats an integer as a 0x hex string.' },
          { name: 'bin', signature: 'static bin(val: int): string', returnType: 'string', params: [{ name: 'val', type: 'int' }], isStatic: true, doc: 'Formats an integer as binary digits.' },
        ],
      },
    },
  },
  'std.collections': {
    name: 'std.collections',
    doc: 'Fast strongly-typed and dynamic collections (List, Map, Set, Stack).',
    classes: {
      List: {
        name: 'List',
        doc: 'Indexed ordered sequence collection with dynamic resizing.',
        ctorParams: [{ name: 'initialCapacity', type: 'int', doc: 'Preallocated slot capacity' }],
        fields: [{ name: 'length', type: 'int', doc: 'Current element count' }],
        methods: [
          { name: 'add', signature: 'add(item: any): void', returnType: 'void', params: [{ name: 'item', type: 'any' }], doc: 'Appends item to the end of the list.' },
          { name: 'get', signature: 'get(index: int): any', returnType: 'any', params: [{ name: 'index', type: 'int' }], doc: 'Retrieves element at zero-based index.' },
          { name: 'set', signature: 'set(index: int, item: any): void', returnType: 'void', params: [{ name: 'index', type: 'int' }, { name: 'item', type: 'any' }], doc: 'Overwrites element at index.' },
          { name: 'removeAt', signature: 'removeAt(index: int): any', returnType: 'any', params: [{ name: 'index', type: 'int' }], doc: 'Removes and returns element at index.' },
          { name: 'size', signature: 'size(): int', returnType: 'int', params: [], doc: 'Returns the number of elements in the list.' },
          { name: 'clear', signature: 'clear(): void', returnType: 'void', params: [], doc: 'Removes all elements from the list.' },
        ],
      },
      Map: {
        name: 'Map',
        doc: 'Hash map associative dictionary storing key-value pairs.',
        ctorParams: [],
        fields: [],
        methods: [
          { name: 'put', signature: 'put(key: any, value: any): void', returnType: 'void', params: [{ name: 'key', type: 'any' }, { name: 'value', type: 'any' }], doc: 'Associates key with specified value.' },
          { name: 'get', signature: 'get(key: any): any', returnType: 'any', params: [{ name: 'key', type: 'any' }], doc: 'Returns value associated with key, or null.' },
          { name: 'has', signature: 'has(key: any): boolean', returnType: 'boolean', params: [{ name: 'key', type: 'any' }], doc: 'Tests if key exists in the map.' },
          { name: 'remove', signature: 'remove(key: any): any', returnType: 'any', params: [{ name: 'key', type: 'any' }], doc: 'Removes key mapping and returns old value.' },
          { name: 'size', signature: 'size(): int', returnType: 'int', params: [], doc: 'Returns count of key-value pairs.' },
        ],
      },
      Set: {
        name: 'Set',
        doc: 'Unique item collection where duplicates are rejected.',
        ctorParams: [],
        fields: [],
        methods: [
          { name: 'add', signature: 'add(item: any): boolean', returnType: 'boolean', params: [{ name: 'item', type: 'any' }], doc: 'Adds item; returns true if newly inserted.' },
          { name: 'has', signature: 'has(item: any): boolean', returnType: 'boolean', params: [{ name: 'item', type: 'any' }], doc: 'Checks if item exists in the set.' },
          { name: 'delete', signature: 'delete(item: any): boolean', returnType: 'boolean', params: [{ name: 'item', type: 'any' }], doc: 'Removes item from set.' },
          { name: 'size', signature: 'size(): int', returnType: 'int', params: [], doc: 'Returns element count.' },
        ],
      },
      Stack: {
        name: 'Stack',
        doc: 'Last-In First-Out (LIFO) stack collection.',
        ctorParams: [],
        fields: [],
        methods: [
          { name: 'push', signature: 'push(item: any): void', returnType: 'void', params: [{ name: 'item', type: 'any' }], doc: 'Pushes item onto stack top.' },
          { name: 'pop', signature: 'pop(): any', returnType: 'any', params: [], doc: 'Pops and returns topmost item.' },
          { name: 'peek', signature: 'peek(): any', returnType: 'any', params: [], doc: 'Inspects topmost item without removing it.' },
          { name: 'isEmpty', signature: 'isEmpty(): boolean', returnType: 'boolean', params: [], doc: 'Returns true if stack is empty.' },
        ],
      },
    },
  },
  'std.lang': {
    name: 'std.lang',
    doc: 'Core language primitives, root Object model, and runtime exception hierarchies.',
    classes: {
      Object: {
        name: 'Object',
        doc: 'The universal base class of the ECMAScript 4 type hierarchy.',
        ctorParams: [],
        fields: [],
        methods: [
          { name: 'toString', signature: 'toString(): string', returnType: 'string', params: [], doc: 'Returns string representation of this instance.' },
          { name: 'hasOwnProperty', signature: 'hasOwnProperty(prop: string): boolean', returnType: 'boolean', params: [{ name: 'prop', type: 'string' }], doc: 'Tests if object possesses own property.' },
        ],
      },
      Exception: {
        name: 'Exception',
        doc: 'Base class for all recoverable runtime exceptions.',
        ctorParams: [{ name: 'message', type: 'string', doc: 'Error message description' }],
        fields: [{ name: 'message', type: 'string', doc: 'Exception message string' }],
        methods: [
          { name: 'getMessage', signature: 'getMessage(): string', returnType: 'string', params: [], doc: 'Returns the exception diagnostic message.' },
        ],
      },
      AssertionError: {
        name: 'AssertionError',
        doc: 'Thrown by the runtime when an assert statement fails.',
        ctorParams: [{ name: 'message', type: 'string', doc: 'Assertion failure explanation' }],
        fields: [{ name: 'message', type: 'string', doc: 'Failure reason' }],
        methods: [],
      },
      Reflect: {
        name: 'Reflect',
        doc: 'ECMAScript 4 reflection services for runtime introspection of objects, classes, and traits.',
        ctorParams: [],
        fields: [],
        methods: [
          { name: 'describeType', signature: 'static describeType(val: any): Object', returnType: 'Object', params: [{ name: 'val', type: 'any' }], isStatic: true, doc: 'Returns complete reflection metadata (type name, class, methods, properties, traits).' },
          { name: 'has', signature: 'static has(target: Object, prop: string): boolean', returnType: 'boolean', params: [{ name: 'target', type: 'Object' }, { name: 'prop', type: 'string' }], isStatic: true, doc: 'Returns true if target contains the specified property.' },
          { name: 'get', signature: 'static get(target: Object, prop: string): any', returnType: 'any', params: [{ name: 'target', type: 'Object' }, { name: 'prop', type: 'string' }], isStatic: true, doc: 'Gets the property value from target.' },
          { name: 'set', signature: 'static set(target: Object, prop: string, val: any): boolean', returnType: 'boolean', params: [{ name: 'target', type: 'Object' }, { name: 'prop', type: 'string' }, { name: 'val', type: 'any' }], isStatic: true, doc: 'Sets the property value on target.' },
          { name: 'ownKeys', signature: 'static ownKeys(target: Object): Array', returnType: 'Array', params: [{ name: 'target', type: 'Object' }], isStatic: true, doc: 'Returns an array of own property keys.' },
          { name: 'deleteProperty', signature: 'static deleteProperty(target: Object, prop: string): boolean', returnType: 'boolean', params: [{ name: 'target', type: 'Object' }, { name: 'prop', type: 'string' }], isStatic: true, doc: 'Deletes property from target.' },
        ],
      },
    },
  },
};

// Built-in Math library documentation
export const ES4_MATH_MEMBERS: Record<string, { signature: string; doc: string; kind: 'function' | 'property'; returnType: string; params: { name: string; type: string }[] }> = {
  PI: { signature: 'const Math.PI: double = 3.141592653589793', doc: 'Ratio of the circumference of a circle to its diameter.', kind: 'property', returnType: 'double', params: [] },
  E: { signature: 'const Math.E: double = 2.718281828459045', doc: 'Base of the natural logarithms.', kind: 'property', returnType: 'double', params: [] },
  abs: { signature: 'Math.abs(x: double): double', doc: 'Returns the absolute value of a number.', kind: 'function', returnType: 'double', params: [{ name: 'x', type: 'double' }] },
  floor: { signature: 'Math.floor(x: double): int', doc: 'Returns the largest integer less than or equal to a given number.', kind: 'function', returnType: 'int', params: [{ name: 'x', type: 'double' }] },
  ceil: { signature: 'Math.ceil(x: double): int', doc: 'Returns the smallest integer greater than or equal to a given number.', kind: 'function', returnType: 'int', params: [{ name: 'x', type: 'double' }] },
  round: { signature: 'Math.round(x: double): int', doc: 'Returns the value of a number rounded to the nearest integer.', kind: 'function', returnType: 'int', params: [{ name: 'x', type: 'double' }] },
  min: { signature: 'Math.min(a: double, b: double): double', doc: 'Returns the smallest of two numbers.', kind: 'function', returnType: 'double', params: [{ name: 'a', type: 'double' }, { name: 'b', type: 'double' }] },
  max: { signature: 'Math.max(a: double, b: double): double', doc: 'Returns the largest of two numbers.', kind: 'function', returnType: 'double', params: [{ name: 'a', type: 'double' }, { name: 'b', type: 'double' }] },
  sqrt: { signature: 'Math.sqrt(x: double): double', doc: 'Returns the square root of a number.', kind: 'function', returnType: 'double', params: [{ name: 'x', type: 'double' }] },
  pow: { signature: 'Math.pow(base: double, exp: double): double', doc: 'Returns the base to the exponent power.', kind: 'function', returnType: 'double', params: [{ name: 'base', type: 'double' }, { name: 'exp', type: 'double' }] },
  sin: { signature: 'Math.sin(rad: double): double', doc: 'Returns the sine of a number in radians.', kind: 'function', returnType: 'double', params: [{ name: 'rad', type: 'double' }] },
  cos: { signature: 'Math.cos(rad: double): double', doc: 'Returns the cosine of a number in radians.', kind: 'function', returnType: 'double', params: [{ name: 'rad', type: 'double' }] },
  tan: { signature: 'Math.tan(rad: double): double', doc: 'Returns the tangent of a number in radians.', kind: 'function', returnType: 'double', params: [{ name: 'rad', type: 'double' }] },
  random: { signature: 'Math.random(): double', doc: 'Returns a pseudo-random number between 0.0 and 1.0.', kind: 'function', returnType: 'double', params: [] },
};

// Built-in Array methods
export const ES4_ARRAY_MEMBERS: Record<string, { signature: string; doc: string; kind: 'function' | 'property'; returnType: string; params: { name: string; type: string }[] }> = {
  length: { signature: 'var Array.length: int', doc: 'Returns or sets the number of elements in the array.', kind: 'property', returnType: 'int', params: [] },
  push: { signature: 'Array.push(...items: any[]): int', doc: 'Appends new elements to an array, and returns the new length.', kind: 'function', returnType: 'int', params: [{ name: 'items', type: 'any[]' }] },
  pop: { signature: 'Array.pop(): any', doc: 'Removes the last element from an array and returns it.', kind: 'function', returnType: 'any', params: [] },
  slice: { signature: 'Array.slice(start: int, end?: int): Array', doc: 'Returns a shallow copy of a portion of an array into a new array.', kind: 'function', returnType: 'Array', params: [{ name: 'start', type: 'int' }, { name: 'end', type: 'int' }] },
  join: { signature: 'Array.join(separator?: string): string', doc: 'Joins all elements of an array into a string separated by specified delimiter.', kind: 'function', returnType: 'string', params: [{ name: 'separator', type: 'string' }] },
  indexOf: { signature: 'Array.indexOf(item: any): int', doc: 'Returns the first index at which a given element can be found, or -1.', kind: 'function', returnType: 'int', params: [{ name: 'item', type: 'any' }] },
  concat: { signature: 'Array.concat(...arrays: any[]): Array', doc: 'Combines two or more arrays and returns a new array.', kind: 'function', returnType: 'Array', params: [{ name: 'arrays', type: 'any[]' }] },
  reverse: { signature: 'Array.reverse(): Array', doc: 'Reverses an array in place.', kind: 'function', returnType: 'Array', params: [] },
};

// Built-in String methods
export const ES4_STRING_MEMBERS: Record<string, { signature: string; doc: string; kind: 'function' | 'property'; returnType: string; params: { name: string; type: string }[] }> = {
  length: { signature: 'var String.length: int', doc: 'Returns the length of the string in 16-bit code units.', kind: 'property', returnType: 'int', params: [] },
  charAt: { signature: 'String.charAt(index: int): string', doc: 'Returns the character at the specified index.', kind: 'function', returnType: 'string', params: [{ name: 'index', type: 'int' }] },
  charCodeAt: { signature: 'String.charCodeAt(index: int): int', doc: 'Returns the numeric Unicode value of the character at the given index.', kind: 'function', returnType: 'int', params: [{ name: 'index', type: 'int' }] },
  indexOf: { signature: 'String.indexOf(searchValue: string, fromIndex?: int): int', doc: 'Returns the index of the first occurrence of the specified substring.', kind: 'function', returnType: 'int', params: [{ name: 'searchValue', type: 'string' }, { name: 'fromIndex', type: 'int' }] },
  substring: { signature: 'String.substring(start: int, end?: int): string', doc: 'Returns the subset of a string between one index and another.', kind: 'function', returnType: 'string', params: [{ name: 'start', type: 'int' }, { name: 'end', type: 'int' }] },
  toLowerCase: { signature: 'String.toLowerCase(): string', doc: 'Returns the calling string value converted to lower case.', kind: 'function', returnType: 'string', params: [] },
  toUpperCase: { signature: 'String.toUpperCase(): string', doc: 'Returns the calling string value converted to upper case.', kind: 'function', returnType: 'string', params: [] },
  split: { signature: 'String.split(separator: string): Array', doc: 'Divides a String into an ordered list of substrings and returns them in an Array.', kind: 'function', returnType: 'Array', params: [{ name: 'separator', type: 'string' }] },
  trim: { signature: 'String.trim(): string', doc: 'Removes whitespace from both ends of a string.', kind: 'function', returnType: 'string', params: [] },
};

export class SemanticAnalyzer {
  private packages: Map<string, PackageDefinition> = new Map();
  private imports: ImportDirective[] = [];
  private classes: Map<string, ClassDefinition> = new Map();
  private functions: Map<string, SemanticSymbol> = new Map();
  private globalVars: Map<string, SemanticSymbol> = new Map();
  private lines: string[] = [];
  private currentPackage: string | null = null;

  constructor(private code: string) {
    this.analyze();
  }

  public analyze(): void {
    this.packages.clear();
    this.imports = [];
    this.classes.clear();
    this.functions.clear();
    this.globalVars.clear();
    this.lines = this.code.split('\n');
    this.currentPackage = null;

    // Pre-populate standard packages
    for (const [pkgName, pkgData] of Object.entries(ES4_STANDARD_PACKAGES)) {
      const pkgDef: PackageDefinition = {
        name: pkgName,
        doc: pkgData.doc,
        classes: new Map(),
        functions: new Map(),
      };
      for (const [clsName, clsData] of Object.entries(pkgData.classes)) {
        pkgDef.classes.set(clsName, {
          name: clsName,
          packageName: pkgName,
          line: 1,
          doc: clsData.doc,
          constructorParams: clsData.ctorParams,
          fields: clsData.fields.map(f => ({
            name: f.name,
            kind: 'field',
            type: f.type,
            signature: `${f.isStatic ? 'static ' : ''}${f.name}: ${f.type}`,
            documentation: f.doc,
            line: 1,
            col: 1,
            className: clsName,
            packageName: pkgName,
            isStatic: f.isStatic,
          })),
          methods: clsData.methods.map(m => ({
            name: m.name,
            kind: 'method',
            type: m.returnType,
            signature: m.signature,
            documentation: m.doc,
            line: 1,
            col: 1,
            className: clsName,
            packageName: pkgName,
            isStatic: m.isStatic,
            returnType: m.returnType,
            params: m.params,
          })),
        });
      }
      this.packages.set(pkgName, pkgDef);
    }

    let currentClass: ClassDefinition | null = null;
    let braceDepth = 0;
    let classBraceDepth = 0;
    let packageBraceDepth = 0;

    for (let lineIdx = 0; lineIdx < this.lines.length; lineIdx++) {
      const rawLine = this.lines[lineIdx];
      const lineNum = lineIdx + 1;
      const trimmed = rawLine.trim();

      // Track braces
      const openBraces = (rawLine.match(/\{/g) || []).length;
      const closeBraces = (rawLine.match(/\}/g) || []).length;

      // 1. Detect Package Directive: package com.example.math [; | {]
      const pkgMatch = trimmed.match(/^package(?:\s+([a-zA-Z_$][a-zA-Z0-9_$.]*))?(?:\s*\{|\s*;)?$/);
      if (pkgMatch) {
        const pkgName = pkgMatch[1] || '';
        this.currentPackage = pkgName;
        if (!this.packages.has(pkgName)) {
          this.packages.set(pkgName, {
            name: pkgName,
            classes: new Map(),
            functions: new Map(),
          });
        }
        if (trimmed.includes('{')) {
          packageBraceDepth = braceDepth + openBraces;
        }
      }

      // Check if package block ended
      if (this.currentPackage && packageBraceDepth > 0 && braceDepth + openBraces - closeBraces < packageBraceDepth) {
        this.currentPackage = null;
        packageBraceDepth = 0;
      }

      // 2. Detect Import Directives: import std.math.Vector [as Vec]; or import std.math.*;
      const importMatch = trimmed.match(/^import\s+([a-zA-Z0-9_$.*]+)(?:\s+as\s+([a-zA-Z_$][a-zA-Z0-9_$]*))?\s*;?$/);
      if (importMatch) {
        const fullPath = importMatch[1];
        const alias = importMatch[2];
        const isWildcard = fullPath.endsWith('.*');
        const path = isWildcard ? fullPath.slice(0, -2) : fullPath;
        this.imports.push({ path, isWildcard, alias, line: lineNum });
      }

      // 3. Detect Class Declarations: [public|private] class Name [extends Super]
      const classMatch = trimmed.match(/^(?:(public|private|protected)\s+)?class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)(?:\s+extends\s+([a-zA-Z_$][a-zA-Z0-9_$.]*))?/);
      if (classMatch) {
        const modifier = classMatch[1];
        const className = classMatch[2];
        const extendsClass = classMatch[3];
        currentClass = {
          name: className,
          packageName: this.currentPackage || undefined,
          line: lineNum,
          extendsClass,
          modifiers: modifier ? [modifier] : ['public'],
          fields: [],
          methods: [],
        };
        this.classes.set(className, currentClass);
        if (this.currentPackage) {
          const qualifiedName = `${this.currentPackage}.${className}`;
          this.classes.set(qualifiedName, currentClass);
          const pkgDef = this.packages.get(this.currentPackage);
          if (pkgDef) {
            pkgDef.classes.set(className, currentClass);
          }
        }
        classBraceDepth = braceDepth + openBraces;
      }

      // Check if we exited current class
      if (currentClass && braceDepth + openBraces - closeBraces < classBraceDepth) {
        currentClass = null;
      }

      // 4. Class Constructor & Method Declarations
      const methodMatch = trimmed.match(/^(?:(public|private|protected)\s+)?(?:(static)\s+)?(?:(override)\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\((.*?)\)(?:\s*:\s*([a-zA-Z_$][a-zA-Z0-9_$.]*))?/);
      if (methodMatch) {
        const visibility = methodMatch[1] || 'public';
        const isStatic = methodMatch[2] === 'static';
        const isOverride = !!methodMatch[3];
        const name = methodMatch[4];
        const paramsStr = methodMatch[5];
        const returnType = methodMatch[6] || 'void';

        const params: { name: string; type: string; doc?: string }[] = [];
        if (paramsStr && paramsStr.trim()) {
          const rawParams = paramsStr.split(',');
          for (const p of rawParams) {
            const parts = p.trim().split(':');
            params.push({
              name: parts[0].trim(),
              type: parts[1] ? parts[1].trim() : 'any',
            });
          }
        }

        const modifiers: string[] = [visibility];
        if (isStatic) modifiers.push('static');
        if (isOverride) modifiers.push('override');

        const symbol: SemanticSymbol = {
          name,
          kind: currentClass ? (name === currentClass.name ? 'method' : 'method') : 'function',
          type: returnType,
          signature: `${currentClass ? `${currentClass.name}.` : ''}${name}(${params.map(p => `${p.name}: ${p.type}`).join(', ')}): ${returnType}`,
          line: lineNum,
          col: rawLine.indexOf(name) + 1,
          className: currentClass ? currentClass.name : undefined,
          packageName: this.currentPackage || undefined,
          modifiers,
          isStatic,
          isPrivate: visibility === 'private',
          isOverride,
          params,
          returnType,
        };

        if (currentClass) {
          if (name === currentClass.name) {
            currentClass.constructorParams = params;
          }
          currentClass.methods.push(symbol);
        } else {
          this.functions.set(name, symbol);
          if (this.currentPackage) {
            const pkgDef = this.packages.get(this.currentPackage);
            if (pkgDef) pkgDef.functions.set(name, symbol);
          }
        }
      }

      // 5. Class Fields & Global Variables: [public|private] [static] (var|const) name: type [= expr]
      const varMatch = trimmed.match(/^(?:(public|private|protected)\s+)?(?:(static)\s+)?(var|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)(?:\s*:\s*([a-zA-Z_$][a-zA-Z0-9_$.]*))?(?:\s*=\s*(.*?))?;?$/);
      if (varMatch) {
        const visibility = varMatch[1] || 'public';
        const isStatic = varMatch[2] === 'static';
        const isConst = varMatch[3] === 'const';
        const name = varMatch[4];
        let type = varMatch[5];
        const initExpr = varMatch[6];
        if (!type && initExpr) {
          type = this.inferTypeFromExpression(initExpr);
        }
        if (!type) type = 'any';

        const modifiers: string[] = [visibility];
        if (isStatic) modifiers.push('static');
        if (isConst) modifiers.push('const');

        const symbol: SemanticSymbol = {
          name,
          kind: currentClass ? 'field' : 'variable',
          type,
          signature: `${isConst ? 'const' : 'var'} ${currentClass ? `${currentClass.name}.` : ''}${name}: ${type}`,
          line: lineNum,
          col: rawLine.indexOf(name) + 1,
          className: currentClass ? currentClass.name : undefined,
          packageName: this.currentPackage || undefined,
          modifiers,
          isStatic,
          isPrivate: visibility === 'private',
          isConst,
        };

        if (currentClass) {
          currentClass.fields.push(symbol);
        } else if (braceDepth === 0) {
          this.globalVars.set(name, symbol);
        }
      }

      braceDepth += (openBraces - closeBraces);
    }
  }

  // Heuristic static type inference from initializers
  public inferTypeFromExpression(expr: string): string {
    const clean = expr.trim();
    if (!clean) return 'any';

    const newMatch = clean.match(/^new\s+([a-zA-Z_$][a-zA-Z0-9_$.]*)/);
    if (newMatch) {
      const cls = newMatch[1];
      return cls.includes('.') ? cls.split('.').pop()! : cls;
    }

    if (/^["'].*["']$/.test(clean)) return 'string';
    if (/^\d+\.\d+$/.test(clean)) return 'double';
    if (/^\d+$/.test(clean)) return 'int';
    if (clean === 'true' || clean === 'false') return 'boolean';
    if (clean.startsWith('[') && clean.endsWith(']')) return 'Array';
    if (clean.startsWith('{') && clean.endsWith('}')) return 'Object';
    if (clean.startsWith('Math.')) {
      const m = clean.replace(/^Math\./, '').split('(')[0].trim();
      return ES4_MATH_MEMBERS[m]?.returnType || 'double';
    }
    if (clean.startsWith('clock(')) return 'double';

    return 'any';
  }

  // Get active scope at line & column
  public getScopeAt(line: number, col: number): ScopeContext {
    let enclosingClass: string | undefined;
    let enclosingFunction: string | undefined;
    let activePackage: string | undefined;
    const localVars: SemanticSymbol[] = [];
    const parameters: SemanticSymbol[] = [];

    let currentClass: string | undefined;
    let currentFunc: SemanticSymbol | undefined;
    let funcStartLine = 0;
    let funcBraceDepth = 0;
    let braceDepth = 0;

    for (let idx = 0; idx < this.lines.length; idx++) {
      const lineNum = idx + 1;
      const rawLine = this.lines[idx];
      const trimmed = rawLine.trim();

      const openBraces = (rawLine.match(/\{/g) || []).length;
      const closeBraces = (rawLine.match(/\}/g) || []).length;

      // Package detect
      const pkgMatch = trimmed.match(/^package(?:\s+([a-zA-Z_$][a-zA-Z0-9_$.]*))?/);
      if (pkgMatch && pkgMatch[1]) {
        activePackage = pkgMatch[1];
      }

      // Class detect
      const classMatch = trimmed.match(/^class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      if (classMatch) {
        currentClass = classMatch[1];
      }

      // Function detect
      const funcMatch = trimmed.match(/^.*?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\((.*?)\)(?:\s*:\s*([a-zA-Z_$][a-zA-Z0-9_$.]*))?/);
      if (funcMatch) {
        const name = funcMatch[1];
        const paramsStr = funcMatch[2];
        const returnType = funcMatch[3] || 'void';
        const params: { name: string; type: string }[] = [];
        if (paramsStr) {
          paramsStr.split(',').forEach(p => {
            const parts = p.trim().split(':');
            if (parts[0]) {
              params.push({ name: parts[0].trim(), type: parts[1]?.trim() || 'any' });
            }
          });
        }
        currentFunc = {
          name,
          kind: 'function',
          type: returnType,
          line: lineNum,
          col: 1,
          params,
        };
        funcStartLine = lineNum;
        funcBraceDepth = braceDepth + openBraces;
      }

      // Check if cursor is at or before this line
      if (lineNum <= line) {
        enclosingClass = currentClass;
        if (currentFunc) {
          enclosingFunction = currentFunc.name;
          if (currentFunc.params) {
            currentFunc.params.forEach((p, pIdx) => {
              parameters.push({
                name: p.name,
                kind: 'parameter',
                type: p.type,
                signature: `(parameter) ${p.name}: ${p.type}`,
                line: funcStartLine,
                col: 1,
                slotIndex: pIdx + (currentClass ? 1 : 0),
              });
            });
          }
        }

        // Variable declared before cursor line (both inside functions or at top-level)
        const varMatch = rawLine.match(/(?:var|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)(?:\s*:\s*([a-zA-Z_$][a-zA-Z0-9_$.]*))?(?:\s*=\s*([^;]+))?/);
        if (varMatch) {
          const varName = varMatch[1];
          if (lineNum < line || (lineNum === line && col > rawLine.indexOf(varName) + varName.length)) {
            const isConst = rawLine.includes('const ' + varName);
            let vType = varMatch[2];
            const initExpr = varMatch[3];
            if (!vType && initExpr) {
              vType = this.inferTypeFromExpression(initExpr);
            }
            if (!vType) vType = 'any';

            localVars.push({
              name: varName,
              kind: 'variable',
              type: vType,
              signature: `(${currentFunc ? 'local' : 'global'} ${isConst ? 'const' : 'var'}) ${varName}: ${vType}`,
              line: lineNum,
              col: rawLine.indexOf(varName) + 1,
              isConst,
              slotIndex: localVars.length + parameters.length + (currentClass ? 1 : 0),
            });
          }
        }
      }

      braceDepth += (openBraces - closeBraces);
      if (currentFunc && braceDepth < funcBraceDepth) {
        currentFunc = undefined;
      }
    }

    return { enclosingClass, enclosingFunction, packageName: activePackage, localVars, parameters };
  }

  // Helper to split a member chain `a.b().c` by unnested dots
  private splitDottedChain(chain: string): string[] {
    const segments: string[] = [];
    let current = '';
    let parenDepth = 0;
    let bracketDepth = 0;
    for (let i = 0; i < chain.length; i++) {
      const ch = chain[i];
      if (ch === '(') parenDepth++;
      else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
      else if (ch === '[') bracketDepth++;
      else if (ch === ']') bracketDepth = Math.max(0, bracketDepth - 1);
      else if (ch === '.' && parenDepth === 0 && bracketDepth === 0) {
        if (current.trim()) segments.push(current.trim());
        current = '';
        continue;
      }
      current += ch;
    }
    if (current.trim()) segments.push(current.trim());
    return segments;
  }

  // Resolve type of an expression in the current scope
  public resolveExpressionType(
    expr: string,
    scope: ScopeContext
  ): { type: string; isStatic?: boolean; isPackage?: boolean } {
    let clean = expr.trim();
    if (!clean) return { type: 'any' };

    // Strip outer parentheses
    while (clean.startsWith('(') && clean.endsWith(')')) {
      clean = clean.slice(1, -1).trim();
    }

    // Literals
    if (/^["'].*["']$/.test(clean)) return { type: 'string' };
    if (/^\d+\.\d+$/.test(clean)) return { type: 'double' };
    if (/^\d+$/.test(clean)) return { type: 'int' };
    if (clean === 'true' || clean === 'false') return { type: 'boolean' };
    if (clean === 'null' || clean === 'undefined') return { type: 'any' };
    if (clean.startsWith('[') && clean.endsWith(']')) return { type: 'Array' };
    if (clean.startsWith('{') && clean.endsWith('}')) return { type: 'Object' };

    // new Constructor(...)
    if (clean.startsWith('new ')) {
      const match = clean.match(/^new\s+([a-zA-Z_$][a-zA-Z0-9_$.]*)/);
      if (match) {
        const clsName = match[1];
        const shortName = clsName.includes('.') ? clsName.split('.').pop()! : clsName;
        return { type: shortName };
      }
    }

    // Builtin singletons
    if (clean === 'Math') return { type: 'Math', isStatic: true };
    if (clean === 'Console') return { type: 'Console', isStatic: true };
    if (clean === 'Reflect') return { type: 'Reflect', isStatic: true };
    if (clean === 'Object') return { type: 'Object', isStatic: true };
    if (clean === 'Array') return { type: 'Array', isStatic: true };
    if (clean === 'String') return { type: 'String', isStatic: true };

    // Builtin packages
    if (clean === 'std') return { type: 'std', isPackage: true };
    if (this.packages.has(clean) || ES4_STANDARD_PACKAGES[clean]) {
      return { type: clean, isPackage: true };
    }

    // Split dotted chain
    const segments = this.splitDottedChain(clean);
    if (segments.length > 1) {
      let currentInfo = this.resolveExpressionType(segments[0], scope);
      for (let i = 1; i < segments.length; i++) {
        let seg = segments[i].trim();
        const isCall = seg.endsWith(')');
        const memberName = isCall ? seg.slice(0, seg.indexOf('(')).trim() : seg;
        currentInfo = this.resolveMemberType(currentInfo.type, memberName, currentInfo.isStatic);
      }
      return currentInfo;
    }

    // Base identifier
    const id = clean.replace(/\(.*?\)$/, '').trim();

    // this & super
    if (id === 'this' && scope.enclosingClass) {
      return { type: scope.enclosingClass };
    }
    if (id === 'super' && scope.enclosingClass) {
      const cls = this.classes.get(scope.enclosingClass);
      return { type: cls?.extendsClass || 'Object' };
    }

    // Local variables
    const local = scope.localVars.find(v => v.name === id);
    if (local && local.type && local.type !== 'any') {
      return { type: local.type };
    }

    // Parameters
    const param = scope.parameters.find(p => p.name === id);
    if (param && param.type && param.type !== 'any') {
      return { type: param.type };
    }

    // Class fields & methods
    if (scope.enclosingClass) {
      const cls = this.classes.get(scope.enclosingClass);
      if (cls) {
        const field = cls.fields.find(f => f.name === id);
        if (field && field.type && field.type !== 'any') {
          return { type: field.type };
        }
        const method = cls.methods.find(m => m.name === id);
        if (method && method.type && method.type !== 'any') {
          return { type: method.type };
        }
      }
    }

    // Global variables
    const gVar = this.globalVars.get(id);
    if (gVar && gVar.type && gVar.type !== 'any') {
      return { type: gVar.type };
    }

    // Global functions
    const gFn = this.functions.get(id);
    if (gFn && gFn.type && gFn.type !== 'any') {
      return { type: gFn.type };
    }

    // Classes (Static access)
    if (this.classes.has(id)) {
      return { type: id, isStatic: true };
    }
    for (const pkg of Object.values(ES4_STANDARD_PACKAGES)) {
      if (pkg.classes[id]) {
        return { type: id, isStatic: true };
      }
    }

    // Name-based inference heuristics (e.g. `v`, `vec`, `pt`, `str`)
    const lower = id.toLowerCase();
    if (lower === 'v' || lower.startsWith('vec') || lower.includes('vector')) return { type: 'Vector' };
    if (lower === 'p' || lower.startsWith('pt') || lower.includes('point')) return { type: 'Point' };
    if (lower === 'm' || lower.startsWith('mat') || lower.includes('matrix')) return { type: 'Matrix' };
    if (lower.startsWith('list')) return { type: 'List' };
    if (lower.startsWith('map')) return { type: 'Map' };
    if (lower.startsWith('set')) return { type: 'Set' };
    if (lower.startsWith('stack')) return { type: 'Stack' };
    if (lower.startsWith('str') || lower.includes('text') || lower.includes('name') || lower.includes('msg')) return { type: 'string' };
    if (lower.startsWith('arr') || lower.includes('items') || lower.includes('list')) return { type: 'Array' };

    return { type: 'any' };
  }

  // Resolve return or field type of a member
  public resolveMemberType(
    typeName: string,
    memberName: string,
    isStatic?: boolean
  ): { type: string; isStatic?: boolean } {
    const shortType = typeName.includes('.') ? typeName.split('.').pop()! : typeName;

    if (shortType === 'Math') {
      const m = ES4_MATH_MEMBERS[memberName];
      if (m) return { type: m.returnType };
    }
    if (shortType === 'Array') {
      const m = ES4_ARRAY_MEMBERS[memberName];
      if (m) return { type: m.returnType };
    }
    if (shortType === 'string' || shortType === 'String') {
      const m = ES4_STRING_MEMBERS[memberName];
      if (m) return { type: m.returnType };
    }

    // Standard package classes
    for (const [_, pkgData] of Object.entries(ES4_STANDARD_PACKAGES)) {
      const cls = pkgData.classes[shortType];
      if (cls) {
        const field = cls.fields.find(f => f.name === memberName);
        if (field) return { type: field.type };
        const method = cls.methods.find(m => m.name === memberName);
        if (method) return { type: method.returnType };
      }
    }

    // User classes
    const userClass = this.classes.get(shortType) || this.classes.get(typeName);
    if (userClass) {
      const field = userClass.fields.find(f => f.name === memberName && (!isStatic || f.isStatic));
      if (field) return { type: field.type };
      const method = userClass.methods.find(m => m.name === memberName && (!isStatic || m.isStatic));
      if (method) return { type: method.returnType || 'void' };

      if (userClass.extendsClass) {
        return this.resolveMemberType(userClass.extendsClass, memberName, isStatic);
      }
    }

    return { type: 'any' };
  }

  // Collect all valid members for a resolved type
  public getTypeMembers(
    typeInfo: { type: string; isStatic?: boolean; isPackage?: boolean },
    scope: ScopeContext,
    filterQuery: string = ''
  ): CodeMagicItem[] {
    const items: CodeMagicItem[] = [];
    const q = filterQuery.toLowerCase();
    const typeName = typeInfo.type;
    const shortType = typeName.includes('.') ? typeName.split('.').pop()! : typeName;

    // 1. Package members (e.g. `std.`, `std.math.`)
    if (typeInfo.isPackage) {
      if (shortType === 'std') {
        const subNamespaces = [
          { name: 'math', doc: 'Mathematical functions, vectors, matrices' },
          { name: 'io', doc: 'Standard output and console services' },
          { name: 'collections', doc: 'List, Map, Set, Stack data structures' },
          { name: 'lang', doc: 'Core primitives, Object, Reflect, Exception' },
        ];
        for (const sn of subNamespaces) {
          items.push({
            label: sn.name,
            kind: 'package',
            detail: `package std.${sn.name}`,
            documentation: sn.doc,
            insertText: sn.name,
          });
        }
        return this.filterAndSort(items, q);
      }

      const pkg = ES4_STANDARD_PACKAGES[typeName] || ES4_STANDARD_PACKAGES[`std.${typeName}`];
      if (pkg) {
        for (const [clsName, clsData] of Object.entries(pkg.classes)) {
          const ctor = clsData.ctorParams.map(p => `${p.name}: ${p.type}`).join(', ');
          items.push({
            label: clsName,
            kind: 'class',
            detail: `class ${clsName}(${ctor})`,
            documentation: clsData.doc,
            insertText: clsName,
            signature: `class ${pkg.name}.${clsName}`,
            packageName: pkg.name,
          });
        }
      }

      const userPkg = this.packages.get(typeName);
      if (userPkg) {
        for (const [clsName, cls] of userPkg.classes.entries()) {
          items.push({
            label: clsName,
            kind: 'class',
            detail: `class ${clsName}`,
            documentation: `User class declared at line ${cls.line}`,
            insertText: clsName,
            packageName: typeName,
          });
        }
        for (const [fnName, fn] of userPkg.functions.entries()) {
          items.push({
            label: fnName,
            kind: 'function',
            detail: fn.signature || `function ${fnName}(): ${fn.type}`,
            documentation: `Package function from ${typeName}`,
            insertText: `${fnName}(`,
            signature: fn.signature,
          });
        }
      }
      return this.filterAndSort(items, q);
    }

    // 2. Math Singleton
    if (shortType === 'Math') {
      for (const [name, m] of Object.entries(ES4_MATH_MEMBERS)) {
        items.push({
          label: name,
          kind: m.kind,
          detail: m.signature,
          documentation: m.doc,
          insertText: m.kind === 'function' ? `${name}(` : name,
          signature: m.signature,
          packageName: 'std.math',
        });
      }
      return this.filterAndSort(items, q);
    }

    // 3. Console Singleton
    if (shortType === 'Console') {
      const consoleMethods = [
        { name: 'println', sig: 'println(...args: any[]): void', doc: 'Prints formatted line to output console' },
        { name: 'print', sig: 'print(...args: any[]): void', doc: 'Prints values to output console without trailing newline' },
        { name: 'warn', sig: 'warn(...args: any[]): void', doc: 'Outputs a warning diagnostic to console' },
        { name: 'error', sig: 'error(...args: any[]): void', doc: 'Outputs an error diagnostic to console' },
        { name: 'clear', sig: 'clear(): void', doc: 'Clears the output console buffer' },
      ];
      for (const cm of consoleMethods) {
        items.push({
          label: cm.name,
          kind: 'method',
          detail: cm.sig,
          documentation: cm.doc,
          insertText: `${cm.name}(`,
          signature: cm.sig,
          packageName: 'std.io',
        });
      }
      return this.filterAndSort(items, q);
    }

    // 4. Reflect Singleton (ES4 Reflection Engine)
    if (shortType === 'Reflect') {
      const reflectMethods = [
        { name: 'describeType', sig: 'describeType(value: any): Object', doc: 'Introspects and returns complete runtime metadata object for any target value or class' },
        { name: 'has', sig: 'has(target: Object, prop: string): boolean', doc: 'Tests if target contains the named property' },
        { name: 'get', sig: 'get(target: Object, prop: string): any', doc: 'Retrieves property value from target object' },
        { name: 'set', sig: 'set(target: Object, prop: string, val: any): boolean', doc: 'Assigns property value on target object' },
        { name: 'ownKeys', sig: 'ownKeys(target: Object): Array', doc: 'Returns array of all own property keys and slot names' },
        { name: 'deleteProperty', sig: 'deleteProperty(target: Object, prop: string): boolean', doc: 'Deletes property from target object' },
      ];
      for (const rm of reflectMethods) {
        items.push({
          label: rm.name,
          kind: 'method',
          detail: rm.sig,
          documentation: rm.doc,
          insertText: `${rm.name}(`,
          signature: `static Reflect.${rm.sig}`,
          packageName: 'std.lang',
        });
      }
      return this.filterAndSort(items, q);
    }

    // 5. Standard library class instances (Vector, Point, Matrix, List, Map, Set, Stack)
    for (const [pkgName, pkgData] of Object.entries(ES4_STANDARD_PACKAGES)) {
      const cls = pkgData.classes[shortType];
      if (cls) {
        for (const f of cls.fields) {
          if (!typeInfo.isStatic || f.isStatic) {
            items.push({
              label: f.name,
              kind: 'field',
              detail: `var ${f.name}: ${f.type}`,
              documentation: f.doc || `Field ${f.name} of ${shortType}`,
              insertText: f.name,
              packageName: pkgName,
            });
          }
        }
        for (const m of cls.methods) {
          if (!typeInfo.isStatic || m.isStatic) {
            items.push({
              label: m.name,
              kind: 'method',
              detail: m.signature,
              documentation: m.doc || `Method ${m.name} of ${shortType}`,
              insertText: `${m.name}(`,
              signature: m.signature,
              packageName: pkgName,
            });
          }
        }
        this.addUniversalObjectMembers(items);
        return this.filterAndSort(items, q);
      }
    }

    // 6. User Class (instance or static)
    const userClass = this.classes.get(shortType) || this.classes.get(typeName);
    if (userClass) {
      this.collectClassMembers(userClass, typeInfo.isStatic ?? false, items);
      this.addUniversalObjectMembers(items);
      return this.filterAndSort(items, q);
    }

    // 7. Array members
    if (shortType === 'Array') {
      for (const [name, m] of Object.entries(ES4_ARRAY_MEMBERS)) {
        items.push({
          label: name,
          kind: m.kind === 'property' ? 'field' : 'method',
          detail: m.signature,
          documentation: m.doc,
          insertText: m.kind !== 'property' ? `${name}(` : name,
          signature: m.signature,
        });
      }
      this.addUniversalObjectMembers(items);
      return this.filterAndSort(items, q);
    }

    // 8. String members
    if (shortType === 'string' || shortType === 'String') {
      for (const [name, m] of Object.entries(ES4_STRING_MEMBERS)) {
        items.push({
          label: name,
          kind: m.kind === 'property' ? 'field' : 'method',
          detail: m.signature,
          documentation: m.doc,
          insertText: m.kind !== 'property' ? `${name}(` : name,
          signature: m.signature,
        });
      }
      this.addUniversalObjectMembers(items);
      return this.filterAndSort(items, q);
    }

    // 9. Generic / Any / Dynamic Object
    this.addUniversalObjectMembers(items);
    for (const cls of this.classes.values()) {
      for (const f of cls.fields) {
        if (!items.some(it => it.label === f.name)) {
          items.push({
            label: f.name,
            kind: 'field',
            detail: `var ${f.name}: ${f.type}`,
            documentation: `Known field on class ${cls.name}`,
            insertText: f.name,
          });
        }
      }
      for (const m of cls.methods) {
        if (!items.some(it => it.label === m.name)) {
          items.push({
            label: m.name,
            kind: 'method',
            detail: m.signature || `function ${m.name}(): ${m.type}`,
            documentation: `Known method on class ${cls.name}`,
            insertText: `${m.name}(`,
            signature: m.signature,
          });
        }
      }
    }
    return this.filterAndSort(items, q);
  }

  // Traverse class inheritance and collect fields/methods
  private collectClassMembers(cls: ClassDefinition, isStatic: boolean, items: CodeMagicItem[]) {
    for (const f of cls.fields) {
      if ((isStatic && f.isStatic) || (!isStatic && !f.isStatic)) {
        if (!items.some(it => it.label === f.name)) {
          items.push({
            label: f.name,
            kind: 'field',
            detail: `var ${f.name}: ${f.type}`,
            documentation: `Declared in class ${cls.name}`,
            insertText: f.name,
            packageName: cls.packageName,
          });
        }
      }
    }
    for (const m of cls.methods) {
      if ((isStatic && m.isStatic) || (!isStatic && !m.isStatic)) {
        if (!items.some(it => it.label === m.name)) {
          items.push({
            label: m.name,
            kind: 'method',
            detail: m.signature || `function ${m.name}(): ${m.type}`,
            documentation: `Declared in class ${cls.name}`,
            insertText: `${m.name}(`,
            signature: m.signature,
            packageName: cls.packageName,
          });
        }
      }
    }
    if (cls.extendsClass) {
      const superCls = this.classes.get(cls.extendsClass);
      if (superCls) {
        this.collectClassMembers(superCls, isStatic, items);
      }
    }
  }

  // Universal Object base methods
  private addUniversalObjectMembers(items: CodeMagicItem[]) {
    const objectMethods = [
      { name: 'toString', sig: 'toString(): string', doc: 'Returns string representation of this object' },
      { name: 'valueOf', sig: 'valueOf(): any', doc: 'Returns primitive value of this object' },
      { name: 'hasOwnProperty', sig: 'hasOwnProperty(prop: string): boolean', doc: 'Determines whether object has direct property with specified name' },
      { name: 'isPrototypeOf', sig: 'isPrototypeOf(obj: Object): boolean', doc: 'Checks if this object exists in prototype chain of another object' },
    ];
    for (const om of objectMethods) {
      if (!items.some(it => it.label === om.name)) {
        items.push({
          label: om.name,
          kind: 'method',
          detail: om.sig,
          documentation: om.doc,
          insertText: `${om.name}(`,
          signature: om.sig,
          packageName: 'std.lang',
        });
      }
    }
  }

  // Filter and sort items by prefix/substring match
  private filterAndSort(items: CodeMagicItem[], query: string): CodeMagicItem[] {
    if (!query) return items;
    const q = query.toLowerCase();
    return items
      .filter(it => it.label.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStarts = a.label.toLowerCase().startsWith(q);
        const bStarts = b.label.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.label.localeCompare(b.label);
      });
  }

  // Generate intelligent context-based completion items
  public getCompletions(line: number, col: number, textBeforeCursor: string): CodeMagicItem[] {
    const scope = this.getScopeAt(line, col);

    // 1. Context Check: Member Access via Dot `.`
    const dotMatch = textBeforeCursor.match(/(?:^|[^\w$])([a-zA-Z_$][a-zA-Z0-9_$.()\[\]]*)\.([a-zA-Z0-9_$]*)$/);
    if (dotMatch) {
      const receiverExpr = dotMatch[1];
      const memberQuery = dotMatch[2] || '';
      const typeInfo = this.resolveExpressionType(receiverExpr, scope);
      return this.getTypeMembers(typeInfo, scope, memberQuery);
    }

    // 2. Context Check: Namespace Qualified Identifier `::`
    const nsMatch = textBeforeCursor.match(/(?:^|[^\w$])([a-zA-Z_$][a-zA-Z0-9_$]*)::([a-zA-Z0-9_$]*)$/);
    if (nsMatch) {
      const nsName = nsMatch[1];
      const query = nsMatch[2] || '';
      const items: CodeMagicItem[] = [];
      const userPkg = this.packages.get(nsName) || ES4_STANDARD_PACKAGES[nsName] || ES4_STANDARD_PACKAGES[`std.${nsName}`];
      if (userPkg) {
        for (const [clsName, cls] of Object.entries(userPkg.classes)) {
          items.push({
            label: clsName,
            kind: 'class',
            detail: `class ${nsName}::${clsName}`,
            documentation: (cls as any).doc || `Class qualified under namespace ${nsName}`,
            insertText: clsName,
          });
        }
      }
      return this.filterAndSort(items, query);
    }

    // 3. Context Check: Import statement context (e.g. `import `, `import std.`, `import std.math.`)
    if (/import\s+[a-zA-Z0-9_$.*]*$/.test(textBeforeCursor)) {
      const match = textBeforeCursor.match(/import\s+([a-zA-Z0-9_$.*]*)$/);
      const query = match ? match[1] : '';
      const items: CodeMagicItem[] = [];

      if (query.startsWith('std.')) {
        const sub = query.slice(4);
        if (!sub.includes('.')) {
          const subNamespaces = ['math', 'io', 'collections', 'lang'];
          for (const sn of subNamespaces) {
            items.push({
              label: `std.${sn}`,
              kind: 'package',
              detail: `package std.${sn}`,
              documentation: ES4_STANDARD_PACKAGES[`std.${sn}`]?.doc || 'Standard Library Package',
              insertText: `std.${sn}`,
            });
          }
          return this.filterAndSort(items, query);
        } else {
          const pkgKey = query.split('.').slice(0, 2).join('.');
          const pkg = ES4_STANDARD_PACKAGES[pkgKey];
          if (pkg) {
            items.push({
              label: '*',
              kind: 'package',
              detail: `Import all symbols from ${pkgKey}`,
              documentation: `Wildcard import: exposes all classes in ${pkgKey} into local scope.`,
              insertText: '*',
            });
            for (const [clsName, clsData] of Object.entries(pkg.classes)) {
              items.push({
                label: clsName,
                kind: 'class',
                detail: `class ${clsName}`,
                documentation: clsData.doc,
                insertText: clsName,
                packageName: pkgKey,
              });
            }
            return this.filterAndSort(items, query.split('.').pop() || '');
          }
        }
      }

      for (const [pkgName, pkgData] of this.packages.entries()) {
        if (pkgName) {
          items.push({
            label: pkgName,
            kind: 'package',
            detail: `package ${pkgName}`,
            documentation: pkgData.doc || `Package namespace ${pkgName}`,
            insertText: pkgName,
          });
        }
      }
      for (const pkgName of Object.keys(ES4_STANDARD_PACKAGES)) {
        if (!items.some(it => it.label === pkgName)) {
          items.push({
            label: pkgName,
            kind: 'package',
            detail: `package ${pkgName}`,
            documentation: ES4_STANDARD_PACKAGES[pkgName].doc,
            insertText: pkgName,
          });
        }
      }
      return this.filterAndSort(items, query);
    }

    // 4. Context Check: `new ` instantiation context -> suggest ONLY classes with constructor params
    if (/new\s+[a-zA-Z0-9_$.]*$/.test(textBeforeCursor)) {
      const match = textBeforeCursor.match(/new\s+([a-zA-Z0-9_$.]*)$/);
      const query = match ? match[1] : '';
      const items: CodeMagicItem[] = [];

      for (const [name, cls] of this.classes.entries()) {
        if (!name.includes('.')) {
          const ctorParams = cls.constructorParams
            ? cls.constructorParams.map(p => `${p.name}: ${p.type}`).join(', ')
            : '';
          items.push({
            label: name,
            kind: 'class',
            detail: `new ${name}(${ctorParams})`,
            documentation: `Instantiate class ${name}. Declared at line ${cls.line}.`,
            insertText: `${name}(`,
            signature: `constructor ${name}(${ctorParams})`,
            packageName: cls.packageName,
          });
        }
      }
      for (const [pkgName, pkgData] of Object.entries(ES4_STANDARD_PACKAGES)) {
        for (const [clsName, clsData] of Object.entries(pkgData.classes)) {
          if (clsName !== 'Console' && clsName !== 'Reflect') {
            const ctorParams = clsData.ctorParams.map(p => `${p.name}: ${p.type}`).join(', ');
            items.push({
              label: clsName,
              kind: 'class',
              detail: `new ${pkgName}.${clsName}(${ctorParams})`,
              documentation: clsData.doc,
              insertText: `${clsName}(`,
              signature: `constructor ${clsName}(${ctorParams})`,
              packageName: pkgName,
            });
          }
        }
      }
      return this.filterAndSort(items, query);
    }

    // 5. Context Check: Type annotation context (`: `, `extends `, `implements `, `as `, `is `)
    const typeMatch = textBeforeCursor.match(/(?::\s*|extends\s+|implements\s+|as\s+|is\s+)([a-zA-Z0-9_$.]*)$/);
    if (typeMatch) {
      const query = typeMatch[1] || '';
      const items: CodeMagicItem[] = [];

      const primitives = ['int', 'uint', 'double', 'float', 'string', 'boolean', 'void', 'any', 'Function', 'Object', 'Array'];
      for (const p of primitives) {
        items.push({
          label: p,
          kind: 'type',
          detail: `primitive type ${p}`,
          documentation: `Standard ECMAScript 4 value type`,
          insertText: p,
        });
      }

      const stdClasses = ['Vector', 'Point', 'Matrix', 'Complex', 'List', 'Map', 'Set', 'Stack', 'Exception'];
      for (const sc of stdClasses) {
        items.push({
          label: sc,
          kind: 'class',
          detail: `class ${sc}`,
          documentation: `Standard library type`,
          insertText: sc,
        });
      }

      for (const name of this.classes.keys()) {
        if (!items.some(it => it.label === name)) {
          items.push({
            label: name,
            kind: 'class',
            detail: `class ${name}`,
            documentation: `User class type`,
            insertText: name,
          });
        }
      }
      return this.filterAndSort(items, query);
    }

    // 6. General Identifier Context: In-scope symbols, globals, built-ins, and keywords
    const items: CodeMagicItem[] = [];
    const wordMatch = textBeforeCursor.match(/([a-zA-Z0-9_$]+)$/);
    const query = wordMatch ? wordMatch[1] : '';

    // In-scope local variables
    for (const v of scope.localVars) {
      items.push({
        label: v.name,
        kind: 'variable',
        detail: v.signature || `var ${v.name}: ${v.type}`,
        documentation: `Local variable declared at line ${v.line}`,
        insertText: v.name,
      });
    }

    // In-scope parameters
    for (const p of scope.parameters) {
      items.push({
        label: p.name,
        kind: 'parameter',
        detail: p.signature || `(parameter) ${p.name}: ${p.type}`,
        documentation: `Parameter to enclosing function`,
        insertText: p.name,
      });
    }

    // Enclosing class fields & methods
    if (scope.enclosingClass) {
      const cls = this.classes.get(scope.enclosingClass);
      if (cls) {
        for (const f of cls.fields) {
          items.push({
            label: f.name,
            kind: 'field',
            detail: `var ${f.name}: ${f.type}`,
            documentation: `Field of class ${cls.name}`,
            insertText: f.name,
          });
        }
        for (const m of cls.methods) {
          items.push({
            label: m.name,
            kind: 'method',
            detail: m.signature || `function ${m.name}(): ${m.type}`,
            documentation: `Method of class ${cls.name}`,
            insertText: `${m.name}(`,
            signature: m.signature,
          });
        }
      }
    }

    // Global variables
    for (const [name, v] of this.globalVars.entries()) {
      if (!items.some(it => it.label === name)) {
        items.push({
          label: name,
          kind: 'variable',
          detail: v.signature || `var ${name}: ${v.type}`,
          documentation: `Global variable declared at line ${v.line}`,
          insertText: name,
        });
      }
    }

    // Global functions
    for (const [name, fn] of this.functions.entries()) {
      if (!items.some(it => it.label === name)) {
        items.push({
          label: name,
          kind: 'function',
          detail: fn.signature || `function ${name}(): ${fn.type}`,
          documentation: `Global function declared at line ${fn.line}`,
          insertText: `${name}(`,
          signature: fn.signature,
        });
      }
    }

    // Standard Singletons
    items.push({
      label: 'Math',
      kind: 'class',
      detail: 'Math library',
      documentation: 'Mathematical constants and functions',
      insertText: 'Math.',
    });
    items.push({
      label: 'Console',
      kind: 'class',
      detail: 'Console I/O',
      documentation: 'Standard console print and diagnostic services',
      insertText: 'Console.',
    });
    items.push({
      label: 'Reflect',
      kind: 'class',
      detail: 'Reflect API',
      documentation: 'Runtime reflection and type inspection engine',
      insertText: 'Reflect.',
    });

    // Builtin functions
    const builtins = [
      { label: 'print', kind: 'function' as const, detail: 'print(...args: any[]): void', doc: 'Prints values to output console', insert: 'print(' },
      { label: 'assert', kind: 'function' as const, detail: 'assert(cond: boolean, msg?: string): void', doc: 'Evaluates assertion; halts on failure', insert: 'assert(' },
      { label: 'dump', kind: 'function' as const, detail: 'dump(obj: Object): void', doc: 'Dumps raw VM object memory structure', insert: 'dump(' },
      { label: 'clock', kind: 'function' as const, detail: 'clock(): double', doc: 'High-resolution benchmark timer in ms', insert: 'clock()' },
    ];
    for (const b of builtins) {
      if (!items.some(it => it.label === b.label)) {
        items.push({
          label: b.label,
          kind: b.kind,
          detail: b.detail,
          documentation: b.doc,
          insertText: b.insert,
        });
      }
    }

    // Standard library classes
    const stdClassList = ['Vector', 'Point', 'Matrix', 'List', 'Map', 'Set', 'Stack'];
    for (const sc of stdClassList) {
      if (!items.some(it => it.label === sc)) {
        items.push({
          label: sc,
          kind: 'class',
          detail: `class ${sc}`,
          documentation: `Standard library class`,
          insertText: sc,
        });
      }
    }

    // Base keywords
    const keywords = [
      'var', 'const', 'function', 'class', 'package', 'namespace', 'import',
      'return', 'if', 'else', 'while', 'for', 'do', 'switch', 'case', 'default',
      'break', 'continue', 'try', 'catch', 'finally', 'throw', 'new', 'this',
      'super', 'public', 'private', 'static', 'override', 'typeof', 'instanceof',
      'is', 'as', 'delete', 'true', 'false', 'null'
    ];
    for (const kw of keywords) {
      items.push({
        label: kw,
        kind: 'keyword',
        detail: `keyword ${kw}`,
        documentation: ES4_KEYWORD_DOCS[kw]?.desc || `ECMAScript 4 keyword ${kw}`,
        insertText: (kw === 'if' || kw === 'while' || kw === 'for' || kw === 'switch') ? `${kw} (` : `${kw} `,
      });
    }

    // Snippets: ONLY show if query explicitly matches a snippet trigger or line is blank
    const lineText = this.lines[line - 1] || '';
    const isLineEmpty = lineText.trim().length === 0;
    const isSnippetQuery = /^(for|class|func|pack|try|swit|while|do)$/i.test(query);

    if (isLineEmpty || isSnippetQuery) {
      items.push(
        {
          label: 'for (int loop)',
          kind: 'snippet',
          detail: 'for (var i: int = 0; i < N; i++)',
          documentation: 'Standard typed integer index loop',
          insertText: 'for (var i: int = 0; i < 10; i++) {\n  \n}',
        },
        {
          label: 'class (template)',
          kind: 'snippet',
          detail: 'class Name { constructor, methods }',
          documentation: 'ES4 class structure with constructor and typed members',
          insertText: 'class NewClass {\n  public var name: string;\n\n  public function NewClass(name: string) {\n    this.name = name;\n  }\n}',
        },
        {
          label: 'function (template)',
          kind: 'snippet',
          detail: 'function name(args): returnType',
          documentation: 'Standard typed ES4 function',
          insertText: 'function calculate(x: int): int {\n  return x * 2;\n}',
        },
        {
          label: 'package (template)',
          kind: 'snippet',
          detail: 'package name { class ... }',
          documentation: 'Modular package definition wrapping classes and functions',
          insertText: 'package com.example {\n  public class MyClass {\n    public var id: int;\n    public function MyClass(id: int) {\n      this.id = id;\n    }\n  }\n}',
        }
      );
    }

    return this.filterAndSort(items, query);
  }

  // Generate Technical Badges based on technical specifications
  private createVariableBadges(
    name: string,
    type: string,
    isConst: boolean,
    scopeKind: 'local' | 'global' | 'field' | 'param',
    line: number,
    col: number,
    slotIdx?: number
  ): TechnicalBadge[] {
    const badges: TechnicalBadge[] = [];

    // Storage Category
    if (scopeKind === 'local') {
      badges.push({
        label: 'Storage Slot',
        value: `Local Frame #R${slotIdx ?? 0}`,
        category: 'storage',
      });
      badges.push({
        label: 'Lifetime',
        value: 'Activation Record (Stack)',
        category: 'scope',
      });
    } else if (scopeKind === 'param') {
      badges.push({
        label: 'Calling Convention',
        value: `Incoming Arg #P${slotIdx ?? 0}`,
        category: 'storage',
      });
      badges.push({
        label: 'Pass Semantics',
        value: type === 'int' || type === 'uint' || type === 'double' || type === 'boolean' ? 'By-Value (Unboxed)' : 'Managed Ref (Pointer)',
        category: 'storage',
      });
    } else if (scopeKind === 'field') {
      badges.push({
        label: 'Object Offset',
        value: 'Instance Heap Slot (VMT)',
        category: 'storage',
      });
    } else {
      badges.push({
        label: 'Storage Class',
        value: 'Global Symbol Table',
        category: 'storage',
      });
    }

    // Mutability
    badges.push({
      label: 'Mutability',
      value: isConst ? 'Read-Only (const)' : 'Mutable (var)',
      category: 'modifier',
    });

    // Bit Width & Memory Representation
    if (type === 'int') {
      badges.push({ label: 'Bit Width', value: '32-bit Two\'s Complement', category: 'type' });
      badges.push({ label: 'Range', value: '-2,147,483,648..2,147,483,647', category: 'type' });
    } else if (type === 'uint') {
      badges.push({ label: 'Bit Width', value: '32-bit Unsigned Word', category: 'type' });
      badges.push({ label: 'Range', value: '0..4,294,967,295', category: 'type' });
    } else if (type === 'double') {
      badges.push({ label: 'Bit Width', value: '64-bit IEEE 754 Float', category: 'type' });
    } else if (type === 'string') {
      badges.push({ label: 'Encoding', value: 'UTF-16 Code Sequence', category: 'type' });
    } else if (type === 'boolean') {
      badges.push({ label: 'Representation', value: '1-bit Logical Flag', category: 'type' });
    } else {
      badges.push({ label: 'Representation', value: `Managed Pointer -> ${type}`, category: 'type' });
    }

    // Declaration Location
    badges.push({
      label: 'Declared At',
      value: `Line ${line}, Col ${col}`,
      category: 'default',
    });

    return badges;
  }

  private createClassBadges(
    name: string,
    packageName?: string,
    superClass?: string,
    fieldCount: number = 0,
    methodCount: number = 0
  ): TechnicalBadge[] {
    return [
      { label: 'Package', value: packageName || '(root default)', category: 'scope' },
      { label: 'Memory Model', value: 'Managed Heap Object (GC)', category: 'storage' },
      { label: 'Dispatch', value: 'Virtual Method Table (VMT)', category: 'spec' },
      { label: 'Super Class', value: superClass || 'std.lang.Object', category: 'type' },
      { label: 'Structure', value: `${fieldCount} fields, ${methodCount} methods`, category: 'spec' },
      { label: 'Specification', value: 'ECMAScript 4 (Draft 2002) § 11.1', category: 'spec' },
    ];
  }

  private createMethodBadges(
    clsName: string,
    name: string,
    returnType: string,
    isStatic: boolean,
    isPrivate: boolean,
    isOverride: boolean
  ): TechnicalBadge[] {
    return [
      { label: 'Enclosing Class', value: clsName, category: 'scope' },
      { label: 'Dispatch', value: isStatic ? 'Direct Static Call' : 'Virtual Dynamic (VMT)', category: 'spec' },
      { label: 'Visibility', value: isPrivate ? 'private (class scope)' : 'public (unrestricted)', category: 'modifier' },
      { label: 'Receiver Binding', value: isStatic ? 'None (Class Global)' : 'Local 0 (this reference)', category: 'storage' },
      { label: 'Return ABI', value: returnType, category: 'type' },
      ...(isOverride ? [{ label: 'Override', value: 'Virtual Superclass Method', category: 'modifier' as const }] : []),
    ];
  }

  private createTypeBadges(typeName: string): TechnicalBadge[] {
    switch (typeName) {
      case 'int':
        return [
          { label: 'Type Category', value: 'Primitive Value Type', category: 'type' },
          { label: 'Bit Width', value: 'Signed 32-bit integer', category: 'storage' },
          { label: 'Value Range', value: '-2,147,483,648 to 2,147,483,647', category: 'type' },
          { label: 'VM Register', value: 'Unboxed in ES4 VM registers', category: 'storage' },
          { label: 'Specification', value: 'ECMA-262 4th Ed. § 3.2.1', category: 'spec' },
        ];
      case 'uint':
        return [
          { label: 'Type Category', value: 'Primitive Value Type', category: 'type' },
          { label: 'Bit Width', value: 'Unsigned 32-bit integer', category: 'storage' },
          { label: 'Value Range', value: '0 to 4,294,967,295', category: 'type' },
          { label: 'VM Register', value: 'Unboxed 32-bit word', category: 'storage' },
          { label: 'Specification', value: 'ECMA-262 4th Ed. § 3.2.2', category: 'spec' },
        ];
      case 'double':
        return [
          { label: 'Type Category', value: 'Primitive Value Type', category: 'type' },
          { label: 'Bit Width', value: '64-bit IEEE-754 Float', category: 'storage' },
          { label: 'Precision', value: '53-bit Significand (~15-17 digits)', category: 'type' },
          { label: 'Specification', value: 'ECMA-262 4th Ed. § 3.2.3', category: 'spec' },
        ];
      case 'string':
        return [
          { label: 'Type Category', value: 'Immutable String Primitive', category: 'type' },
          { label: 'Encoding', value: 'UTF-16 Sequences', category: 'storage' },
          { label: 'Allocation', value: 'Interned Heap Buffer', category: 'storage' },
          { label: 'Specification', value: 'ECMA-262 4th Ed. § 3.3', category: 'spec' },
        ];
      case 'boolean':
        return [
          { label: 'Type Category', value: 'Boolean Logic Primitive', category: 'type' },
          { label: 'Values', value: 'true | false', category: 'type' },
          { label: 'Specification', value: 'ECMA-262 4th Ed. § 3.1', category: 'spec' },
        ];
      default:
        return [
          { label: 'Type Category', value: 'Nominal Object Type', category: 'type' },
          { label: 'Specification', value: 'ECMA-262 4th Ed. Draft', category: 'spec' },
        ];
    }
  }

  // Get full structured Hover Info for a hovered token
  public getHoverInfo(line: number, col: number, hoveredWord: string, diagnostics: Diagnostic[]): HoverInfo | null {
    if (!hoveredWord || hoveredWord.trim().length === 0) return null;
    const cleanWord = hoveredWord.trim();

    // 1. Check if there is a Diagnostic error or warning on this line/col
    const diag = diagnostics.find(d => d.line === line && (cleanWord === '' || Math.abs(d.col - col) <= 15));
    if (diag) {
      return {
        token: cleanWord,
        kind: 'diagnostic',
        title: `[${diag.code}] ${diag.severity.toUpperCase()}`,
        signature: diag.message,
        documentation: `Diagnostic reported by ES4 Compiler on line ${line}, column ${diag.col}.`,
        technicalBadges: [
          { label: 'Error Code', value: diag.code, category: 'spec' },
          { label: 'Severity', value: diag.severity.toUpperCase(), category: 'modifier' },
          { label: 'Source File', value: diag.file || 'Main.es4', category: 'default' },
          { label: 'Line / Col', value: `${diag.line}:${diag.col}`, category: 'default' },
        ],
        diagnostic: diag,
      };
    }

    // 2. Built-in Function Hovers
    if (cleanWord === 'print') {
      return {
        token: 'print',
        kind: 'builtin',
        title: 'print (Built-in I/O)',
        signature: 'print(...args: any[]): void',
        documentation: 'Outputs values directly to the ES4 Virtual Machine standard output console.',
        specNote: 'ECMAScript 4 Workbench Runtime Host Services (Build 2002)',
        technicalBadges: [
          { label: 'Subsystem', value: 'VM Host Standard I/O', category: 'storage' },
          { label: 'Calling Convention', value: 'Variadic Host Trap (OpCode 0x50)', category: 'spec' },
          { label: 'Return ABI', value: 'void (no return value)', category: 'type' },
        ],
        parameters: [{ name: 'args', type: 'any[]', description: 'Values to convert to string and print' }],
      };
    }
    if (cleanWord === 'assert') {
      return {
        token: 'assert',
        kind: 'builtin',
        title: 'assert (Built-in Diagnostic)',
        signature: 'assert(condition: boolean, message?: string): void',
        documentation: 'Validates that condition evaluates to true. If false, halts the virtual machine with an assertion diagnostic exception.',
        specNote: 'ECMAScript 4 Draft Diagnostic Specification (Section 14)',
        technicalBadges: [
          { label: 'Subsystem', value: 'Diagnostic Verifier', category: 'spec' },
          { label: 'Trap Code', value: 'ASSERT (OpCode 0x51)', category: 'storage' },
          { label: 'Failure Action', value: 'VM Trap / Execution Halt', category: 'modifier' },
        ],
        parameters: [
          { name: 'condition', type: 'boolean', description: 'Expression expected to evaluate to true' },
          { name: 'message', type: 'string', description: 'Optional assertion diagnostic message', optional: true },
        ],
      };
    }
    if (cleanWord === 'dump') {
      return {
        token: 'dump',
        kind: 'builtin',
        title: 'dump (Built-in Heap Inspector)',
        signature: 'dump(target: Object): void',
        documentation: 'Performs deep heap inspection of target object, outputting properties, prototype link, and allocated byte size.',
        specNote: 'ES4 Studio Debugger Extension',
        technicalBadges: [
          { label: 'Subsystem', value: 'VM Heap Inspector', category: 'storage' },
          { label: 'Trap Code', value: 'DUMP (OpCode 0x52)', category: 'spec' },
        ],
        parameters: [{ name: 'target', type: 'Object', description: 'Heap object to inspect' }],
      };
    }
    if (cleanWord === 'clock') {
      return {
        token: 'clock',
        kind: 'builtin',
        title: 'clock (High-Resolution Timer)',
        signature: 'clock(): double',
        documentation: 'Returns high-resolution millisecond timer for performance profiling and algorithm benchmarking.',
        specNote: 'ES4 High-Precision Timer API',
        technicalBadges: [
          { label: 'Subsystem', value: 'Hardware High-Res Timer', category: 'timing' },
          { label: 'Resolution', value: 'Microsecond / Sub-millisecond', category: 'timing' },
          { label: 'Return Type', value: 'double (64-bit IEEE 754)', category: 'type' },
        ],
      };
    }

    // 3. Package Hover (e.g. `std.math`, `std.io`, `std.collections`, `std.lang` or matching package)
    for (const [pkgName, pkgDef] of this.packages.entries()) {
      if (cleanWord === pkgName || cleanWord === pkgName.split('.').pop()) {
        const classNames = Array.from(pkgDef.classes.keys());
        return {
          token: cleanWord,
          kind: 'package',
          title: `Package: ${pkgName}`,
          packageName: pkgName,
          signature: `package ${pkgName}`,
          documentation: pkgDef.doc || `Standard modular namespace container for ${pkgName}.`,
          specNote: 'ECMA-262 4th Ed. § 12 - Packages & Namespaces',
          technicalBadges: [
            { label: 'Namespace URI', value: `urn:ecmascript4:${pkgName}`, category: 'scope' },
            { label: 'Exported Classes', value: `${classNames.length} classes (${classNames.slice(0, 3).join(', ')}${classNames.length > 3 ? '...' : ''})`, category: 'spec' },
            { label: 'Isolation Mode', value: 'Lexical Package Container', category: 'modifier' },
          ],
        };
      }
    }

    // 4. Standard Package Classes (Vector, Point, Matrix, Console, Stream, List, Map, Set, Stack)
    for (const [pkgName, pkgData] of Object.entries(ES4_STANDARD_PACKAGES)) {
      for (const [clsName, clsData] of Object.entries(pkgData.classes)) {
        if (cleanWord === clsName || cleanWord === `${pkgName}.${clsName}`) {
          const ctorParams = clsData.ctorParams.map(p => `${p.name}: ${p.type}`).join(', ');
          return {
            token: cleanWord,
            kind: 'class',
            title: `class ${clsName}`,
            packageName: pkgName,
            signature: `class ${pkgName}.${clsName}(${ctorParams})`,
            documentation: clsData.doc,
            specNote: `Standard Library Package: ${pkgName}`,
            technicalBadges: this.createClassBadges(clsName, pkgName, 'std.lang.Object', clsData.fields.length, clsData.methods.length),
            parameters: clsData.ctorParams.map(p => ({ name: p.name, type: p.type, description: p.doc })),
            members: [
              ...clsData.fields.map(f => ({ name: f.name, kind: 'field' as const, type: f.type, signature: `${f.name}: ${f.type}` })),
              ...clsData.methods.map(m => ({ name: m.name, kind: 'method' as const, type: m.returnType, signature: m.signature })),
            ],
          };
        }
      }
    }

    // 5. Math member hovers
    if (cleanWord === 'Math') {
      return {
        token: 'Math',
        kind: 'class',
        title: 'Built-in Library: Math',
        signature: 'Math: Object',
        packageName: 'std.math',
        documentation: 'Standard mathematical constants and functions including trigonometric, exponential, rounding, and random generators.',
        specNote: 'ECMAScript Standard Section 15.8',
        technicalBadges: [
          { label: 'Package', value: 'std.math', category: 'scope' },
          { label: 'Binding', value: 'Static Singleton Object', category: 'storage' },
          { label: 'Specification', value: 'ECMAScript 4 Section 15.8', category: 'spec' },
        ],
        members: Object.entries(ES4_MATH_MEMBERS).map(([k, v]) => ({
          name: k,
          kind: v.kind === 'function' ? 'method' : 'field',
          type: v.returnType,
          signature: v.signature,
        })),
      };
    }
    if (ES4_MATH_MEMBERS[cleanWord]) {
      const m = ES4_MATH_MEMBERS[cleanWord];
      return {
        token: cleanWord,
        kind: m.kind === 'function' ? 'method' : 'field',
        title: `Math.${cleanWord}`,
        packageName: 'std.math',
        signature: m.signature,
        documentation: m.doc,
        specNote: 'Standard Math Library',
        technicalBadges: [
          { label: 'Enclosing Object', value: 'Math', category: 'scope' },
          { label: 'Category', value: m.kind === 'function' ? 'Native Math Function' : 'Mathematical Constant', category: 'spec' },
          { label: 'Return ABI', value: m.returnType, category: 'type' },
        ],
        parameters: m.params.map(p => ({ name: p.name, type: p.type })),
      };
    }

    // 6. Hexadecimal and Integer literal hovers
    if (/^0x[0-9a-fA-F]+$/i.test(cleanWord)) {
      const dec = parseInt(cleanWord, 16);
      const bin = (dec >>> 0).toString(2).padStart(32, '0').replace(/(.{4})/g, '$1 ').trim();
      return {
        token: cleanWord,
        kind: 'literal',
        title: 'Hexadecimal Integer Literal',
        signature: `${cleanWord} = ${dec} (decimal)`,
        documentation: `Signed 32-bit: ${(dec | 0)}\nBinary: ${bin}`,
        specNote: dec === 2147483647 ? 'Constant: Int32.MAX_VALUE' : undefined,
        technicalBadges: [
          { label: 'Base', value: 'Base-16 (Hexadecimal)', category: 'type' },
          { label: 'Decimal', value: dec.toLocaleString(), category: 'type' },
          { label: 'Binary', value: bin, category: 'storage' },
          { label: 'Bit Width', value: '32-bit Two\'s Complement', category: 'storage' },
        ],
      };
    }

    if (/^[0-9]+$/.test(cleanWord)) {
      const num = parseInt(cleanWord, 10);
      if (num > 100) {
        return {
          token: cleanWord,
          kind: 'literal',
          title: 'Decimal Integer Literal',
          signature: `${cleanWord} (Hex: 0x${num.toString(16).toUpperCase()})`,
          documentation: num === 2147483647 ? 'Maximum positive value for signed 32-bit integer (Int32.MAX_VALUE).' : `Evaluates to integer ${num}.`,
          technicalBadges: [
            { label: 'Hexadecimal', value: `0x${num.toString(16).toUpperCase()}`, category: 'type' },
            { label: 'Storage', value: 'Constant Pool Immediate', category: 'storage' },
            { label: 'Representation', value: '32-bit Signed Integer', category: 'type' },
          ],
        };
      }
    }

    // 7. Keyword Hovers
    if (ES4_KEYWORD_DOCS[cleanWord]) {
      const kw = ES4_KEYWORD_DOCS[cleanWord];
      const isType = ['int', 'uint', 'double', 'string', 'boolean', 'void'].includes(cleanWord);
      return {
        token: cleanWord,
        kind: isType ? 'type' : 'keyword',
        title: kw.title,
        signature: kw.example,
        documentation: kw.desc,
        specNote: kw.spec,
        technicalBadges: isType
          ? this.createTypeBadges(cleanWord)
          : [
              { label: 'Keyword Category', value: kw.category, category: 'modifier' },
              { label: 'Specification', value: kw.spec.split(' - ')[0] || kw.spec, category: 'spec' },
            ],
      };
    }

    // 8. User-defined Classes
    if (this.classes.has(cleanWord)) {
      const cls = this.classes.get(cleanWord)!;
      const ctorParams = cls.constructorParams
        ? cls.constructorParams.map(p => `${p.name}: ${p.type}`).join(', ')
        : '';
      return {
        token: cleanWord,
        kind: 'class',
        title: `class ${cls.name}${cls.extendsClass ? ` extends ${cls.extendsClass}` : ''}`,
        signature: `constructor ${cls.name}(${ctorParams})`,
        packageName: cls.packageName,
        documentation: cls.doc || `User-defined class with ${cls.methods.length} methods and ${cls.fields.length} fields.`,
        declaredAt: `Line ${cls.line}`,
        technicalBadges: this.createClassBadges(cls.name, cls.packageName, cls.extendsClass, cls.fields.length, cls.methods.length),
        parameters: cls.constructorParams?.map(p => ({ name: p.name, type: p.type })),
        members: [
          ...cls.fields.map(f => ({ name: f.name, kind: 'field' as const, type: f.type, signature: `${f.isConst ? 'const' : 'var'} ${f.name}: ${f.type}` })),
          ...cls.methods.map(m => ({ name: m.name, kind: 'method' as const, type: m.returnType || 'void', signature: m.signature })),
        ],
      };
    }

    // 9. Active Scope Local Variables & Parameters
    const scope = this.getScopeAt(line, col);
    const local = scope.localVars.find(v => v.name === cleanWord);
    if (local) {
      return {
        token: cleanWord,
        kind: 'variable',
        title: `(local ${local.isConst ? 'const' : 'var'}) ${cleanWord}: ${local.type}`,
        signature: `${local.isConst ? 'const' : 'var'} ${cleanWord}: ${local.type}`,
        enclosingScope: scope.enclosingFunction,
        declaredAt: `Line ${local.line}`,
        typeInfo: local.type,
        documentation: `Local register storage slot allocated inside function activation record.`,
        technicalBadges: this.createVariableBadges(cleanWord, local.type, !!local.isConst, 'local', local.line, local.col, local.slotIndex),
      };
    }

    const param = scope.parameters.find(p => p.name === cleanWord);
    if (param) {
      return {
        token: cleanWord,
        kind: 'parameter',
        title: `(parameter) ${cleanWord}: ${param.type}`,
        signature: `${cleanWord}: ${param.type}`,
        enclosingScope: scope.enclosingFunction,
        declaredAt: `Line ${param.line}`,
        typeInfo: param.type,
        documentation: `Formal incoming function argument verified by compile-time type contract.`,
        technicalBadges: this.createVariableBadges(cleanWord, param.type, true, 'param', param.line, param.col, param.slotIndex),
      };
    }

    // 10. Class Fields and Methods in current enclosing class
    if (scope.enclosingClass) {
      const cls = this.classes.get(scope.enclosingClass);
      const field = cls?.fields.find(f => f.name === cleanWord);
      if (field) {
        return {
          token: cleanWord,
          kind: 'field',
          title: `(field) ${cls?.name}.${cleanWord}: ${field.type}`,
          signature: `${field.isStatic ? 'static ' : ''}${field.isConst ? 'const' : 'var'} ${field.name}: ${field.type}`,
          enclosingScope: cls?.name,
          declaredAt: `Line ${field.line}`,
          typeInfo: field.type,
          documentation: `Instance member property residing on heap-allocated object instance.`,
          technicalBadges: this.createVariableBadges(cleanWord, field.type, !!field.isConst, 'field', field.line, field.col),
        };
      }
      const method = cls?.methods.find(m => m.name === cleanWord);
      if (method) {
        return {
          token: cleanWord,
          kind: 'method',
          title: `(method) ${cls?.name}.${cleanWord}`,
          signature: method.signature,
          enclosingScope: cls?.name,
          declaredAt: `Line ${method.line}`,
          typeInfo: method.type,
          returnType: method.returnType,
          documentation: `Class member method dynamically dispatched through virtual method table.`,
          technicalBadges: this.createMethodBadges(cls?.name || '', cleanWord, method.returnType || 'void', !!method.isStatic, !!method.isPrivate, !!method.isOverride),
          parameters: method.params?.map(p => ({ name: p.name, type: p.type })),
        };
      }
    }

    // 11. Global Variables & Declared Functions
    if (this.globalVars.has(cleanWord)) {
      const g = this.globalVars.get(cleanWord)!;
      return {
        token: cleanWord,
        kind: 'variable',
        title: `(global ${g.isConst ? 'const' : 'var'}) ${cleanWord}: ${g.type}`,
        signature: g.signature,
        declaredAt: `Line ${g.line}`,
        typeInfo: g.type,
        documentation: `Global module-level symbol bound into root namespace table.`,
        technicalBadges: this.createVariableBadges(cleanWord, g.type, !!g.isConst, 'global', g.line, g.col),
      };
    }

    if (this.functions.has(cleanWord)) {
      const f = this.functions.get(cleanWord)!;
      return {
        token: cleanWord,
        kind: 'function',
        title: `(function) ${cleanWord}`,
        signature: f.signature,
        packageName: f.packageName,
        declaredAt: `Line ${f.line}`,
        typeInfo: f.type,
        returnType: f.returnType,
        documentation: `Top-level routine executed in global activation frame.`,
        technicalBadges: [
          { label: 'Scope', value: f.packageName ? `Package ${f.packageName}` : 'Global Lexical Scope', category: 'scope' },
          { label: 'Calling Convention', value: 'Standard Call (Frame Push)', category: 'spec' },
          { label: 'Return ABI', value: f.returnType || 'void', category: 'type' },
        ],
        parameters: f.params?.map(p => ({ name: p.name, type: p.type })),
      };
    }

    // 12. Check other classes' methods/fields
    for (const [_, cls] of this.classes.entries()) {
      const m = cls.methods.find(meth => meth.name === cleanWord);
      if (m) {
        return {
          token: cleanWord,
          kind: 'method',
          title: `(method) ${cls.name}.${cleanWord}`,
          signature: m.signature,
          enclosingScope: cls.name,
          declaredAt: `Line ${m.line}`,
          typeInfo: m.type,
          returnType: m.returnType,
          documentation: `Method of class ${cls.name}.`,
          technicalBadges: this.createMethodBadges(cls.name, cleanWord, m.returnType || 'void', !!m.isStatic, !!m.isPrivate, !!m.isOverride),
          parameters: m.params?.map(p => ({ name: p.name, type: p.type })),
        };
      }
      const f = cls.fields.find(field => field.name === cleanWord);
      if (f) {
        return {
          token: cleanWord,
          kind: 'field',
          title: `(field) ${cls.name}.${cleanWord}: ${f.type}`,
          signature: `${cls.name}.${f.name}: ${f.type}`,
          enclosingScope: cls.name,
          declaredAt: `Line ${f.line}`,
          typeInfo: f.type,
          documentation: `Field of class ${cls.name}.`,
          technicalBadges: this.createVariableBadges(cleanWord, f.type, !!f.isConst, 'field', f.line, f.col),
        };
      }
    }

    return null;
  }
}
