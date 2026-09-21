/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ES4 Studio 2002 - ECMAScript 4 AST Parser & Semantic Analyzer
 */

import { Diagnostic, Token } from '../types';
import { tokenize, ES4_KEYWORDS, ES4_TYPES } from './lexer';

export interface ASTNode {
  type: string;
  line: number;
  col: number;
  [key: string]: any;
}

export interface ParseResult {
  ast: ASTNode;
  diagnostics: Diagnostic[];
  symbols: Array<{
    name: string;
    kind: 'variable' | 'function' | 'class' | 'parameter' | 'field';
    type: string;
    line: number;
  }>;
}

export class ES4Parser {
  private tokens: Token[] = [];
  private pos = 0;
  private diagnostics: Diagnostic[] = [];
  private symbols: ParseResult['symbols'] = [];
  private currentScope = new Set<string>();
  private outerScopes: Set<string>[] = [];

  constructor(private source: string) {}

  public parse(): ParseResult {
    this.tokens = tokenize(this.source).filter(t => t.type !== 'COMMENT');
    this.pos = 0;
    this.diagnostics = [];
    this.symbols = [];
    this.currentScope = new Set<string>();
    this.outerScopes = [];

    const statements: ASTNode[] = [];

    while (!this.isAtEnd()) {
      try {
        const stmt = this.parseDeclarationOrStatement();
        if (stmt) {
          statements.push(stmt);
        }
      } catch (err: any) {
        this.addDiagnostic(
          'error',
          'ES4-100',
          err.message || 'Syntax error while parsing statement',
          this.peek()
        );
        this.synchronize();
      }
    }

    return {
      ast: {
        type: 'Program',
        line: 1,
        col: 1,
        body: statements,
      },
      diagnostics: this.diagnostics,
      symbols: this.symbols,
    };
  }

  private pushScope() {
    this.outerScopes.push(new Set(this.currentScope));
    this.currentScope = new Set();
  }

  private popScope() {
    this.currentScope = this.outerScopes.pop() || new Set();
  }

  private isDeclaredInOuterScope(name: string): boolean {
    for (const scope of this.outerScopes) {
      if (scope.has(name)) return true;
    }
    return false;
  }

  private checkShadowing(name: string, token: Token) {
    if (this.isDeclaredInOuterScope(name)) {
      this.addDiagnostic(
        'warning',
        'ES4-409',
        `Shadowing identifier '${name}' in local scope; ES4 draft standard requires 'namespace' or 'override' keyword.`,
        token
      );
    }
    this.currentScope.add(name);
  }

  private parseDeclarationOrStatement(): ASTNode | null {
    const token = this.peek();

    if (token.type === 'KEYWORD') {
      if (token.value === 'var' || token.value === 'const') {
        return this.parseVarDeclaration();
      }
      if (token.value === 'function') {
        return this.parseFunctionDeclaration();
      }
      if (token.value === 'class') {
        return this.parseClassDeclaration();
      }
      if (token.value === 'package') {
        return this.parsePackageDeclaration();
      }
      if (token.value === 'namespace') {
        return this.parseNamespaceDeclaration();
      }
      if (token.value === 'import') {
        return this.parseImportDeclaration();
      }
      if (token.value === 'if') {
        return this.parseIfStatement();
      }
      if (token.value === 'while') {
        return this.parseWhileStatement();
      }
      if (token.value === 'do') {
        return this.parseDoWhileStatement();
      }
      if (token.value === 'for') {
        return this.parseForStatement();
      }
      if (token.value === 'switch') {
        return this.parseSwitchStatement();
      }
      if (token.value === 'break') {
        return this.parseBreakStatement();
      }
      if (token.value === 'continue') {
        return this.parseContinueStatement();
      }
      if (token.value === 'try') {
        return this.parseTryStatement();
      }
      if (token.value === 'throw') {
        return this.parseThrowStatement();
      }
      if (token.value === 'return') {
        return this.parseReturnStatement();
      }
      if (token.value === 'assert') {
        return this.parseAssertStatement();
      }
      if (token.value === 'print' || token.value === 'dump') {
        return this.parsePrintStatement();
      }
    }

    if (token.value === '{') {
      return this.parseBlock();
    }

    return this.parseExpressionStatement();
  }

  private parseVarDeclaration(): ASTNode {
    const kind = this.advance().value; // 'var' or 'const'
    const idToken = this.consume('IDENTIFIER', `Expected identifier after '${kind}'`);
    const varName = idToken.value;

    this.checkShadowing(varName, idToken);

    let typeAnno = 'any';
    if (this.match(':')) {
      const typeToken = this.advance();
      typeAnno = typeToken.value;
      while (this.match('.')) {
        typeAnno += '.' + this.consume('IDENTIFIER', 'Expected identifier after "." in type annotation').value;
      }
      if (!ES4_TYPES.has(typeAnno) && typeToken.type !== 'IDENTIFIER' && !typeAnno.includes('.')) {
        this.addDiagnostic(
          'warning',
          'ES4-202',
          `Unrecognized ES4 type annotation '${typeAnno}'. Standard types: int, uint, double, string, boolean, Object, Array`,
          typeToken
        );
      }
    }

    let initializer: ASTNode | null = null;
    if (this.match('=')) {
      initializer = this.parseExpression();

      // Semantic Check: Strict ES4 Type compatibility
      if (initializer && initializer.type === 'Literal') {
        const litType = typeof initializer.value;
        if (typeAnno === 'int') {
          if (litType === 'string' || litType === 'boolean') {
            this.addDiagnostic(
              'error',
              'ES4-201',
              `Type mismatch: cannot assign '${litType}' to variable '${varName}' of type 'int'`,
              idToken
            );
          } else if (litType === 'number' && !Number.isInteger(initializer.value)) {
            this.addDiagnostic(
              'warning',
              'ES4-203',
              `Warning: Implicit narrowing truncation from 'double' to signed 32-bit 'int' for '${varName}'`,
              idToken
            );
          }
        } else if (typeAnno === 'string' && litType !== 'string') {
          this.addDiagnostic(
            'error',
            'ES4-201',
            `Type mismatch: cannot assign '${litType}' to variable '${varName}' of type 'string'`,
            idToken
          );
        } else if (typeAnno === 'boolean' && litType !== 'boolean') {
          this.addDiagnostic(
            'error',
            'ES4-201',
            `Type mismatch: cannot assign '${litType}' to variable '${varName}' of type 'boolean'`,
            idToken
          );
        }
      }
    }

    this.expectSemicolon('variable declaration');

    this.symbols.push({
      name: varName,
      kind: 'variable',
      type: typeAnno,
      line: idToken.line,
    });

    return {
      type: 'VariableDeclaration',
      kind,
      name: varName,
      typeAnnotation: typeAnno,
      initializer,
      line: idToken.line,
      col: idToken.col,
    };
  }

  private parseFunctionDeclaration(): ASTNode {
    const fnToken = this.advance(); // 'function'
    const idToken = this.consume('IDENTIFIER', 'Expected function name');
    const fnName = idToken.value;

    this.consume('(', "Expected '(' after function name");

    this.pushScope();

    const params: Array<{ name: string; type: string }> = [];
    if (!this.check(')')) {
      do {
        const pToken = this.consume('IDENTIFIER', 'Expected parameter name');
        let pType = 'any';
        if (this.match(':')) {
          pType = this.advance().value;
        }
        params.push({ name: pToken.value, type: pType });
        this.currentScope.add(pToken.value);
        this.symbols.push({
          name: pToken.value,
          kind: 'parameter',
          type: pType,
          line: pToken.line,
        });
      } while (this.match(','));
    }
    this.consume(')', "Expected ')' after parameters");

    let returnType = 'void';
    if (this.match(':')) {
      returnType = this.advance().value;
    }

    const body = this.parseBlock();

    this.popScope();

    this.symbols.push({
      name: fnName,
      kind: 'function',
      type: `(${params.map(p => p.type).join(', ')}) => ${returnType}`,
      line: idToken.line,
    });

    return {
      type: 'FunctionDeclaration',
      name: fnName,
      params,
      returnType,
      body,
      line: fnToken.line,
      col: fnToken.col,
    };
  }

  private parseClassDeclaration(): ASTNode {
    const classToken = this.advance(); // 'class'
    const idToken = this.consume('IDENTIFIER', 'Expected class name');
    const className = idToken.value;

    let superClass: string | null = null;
    if (this.match('extends')) {
      superClass = this.consume('IDENTIFIER', 'Expected superclass name').value;
      while (this.match('.')) {
        superClass += '.' + this.consume('IDENTIFIER', 'Expected identifier after "." in superclass name').value;
      }
    }

    this.consume('{', "Expected '{' before class body");

    this.pushScope();
    const members: ASTNode[] = [];
    while (!this.check('}') && !this.isAtEnd()) {
      const modifiers: string[] = [];
      while (['public', 'private', 'protected', 'static', 'override'].includes(this.peek().value)) {
        modifiers.push(this.advance().value);
      }

      if (this.peek().value === 'var' || this.peek().value === 'const') {
        const field = this.parseVarDeclaration();
        field.modifiers = modifiers;
        members.push(field);
      } else if (this.peek().value === 'function') {
        const method = this.parseFunctionDeclaration();
        method.modifiers = modifiers;
        members.push(method);
      } else {
        const skipped = this.advance();
        this.addDiagnostic('error', 'ES4-104', `Unexpected member '${skipped.value}' in class body`, skipped);
      }
    }
    this.consume('}', "Expected '}' after class body");
    this.popScope();

    this.symbols.push({
      name: className,
      kind: 'class',
      type: className,
      line: idToken.line,
    });

    return {
      type: 'ClassDeclaration',
      name: className,
      superClass,
      members,
      line: classToken.line,
      col: classToken.col,
    };
  }

  private parseImportDeclaration(): ASTNode {
    const importToken = this.advance(); // 'import'
    let path = this.consume('IDENTIFIER', "Expected package or class name after 'import'").value;
    let isWildcard = false;

    while (this.match('.')) {
      if (this.peek().value === '*') {
        this.advance();
        isWildcard = true;
        break;
      }
      path += '.' + this.consume('IDENTIFIER', "Expected identifier or '*' after '.' in import").value;
    }

    let alias: string | undefined;
    if (this.match('as')) {
      alias = this.consume('IDENTIFIER', "Expected alias name after 'as'").value;
    }

    this.match(';');

    this.symbols.push({
      name: alias || path.split('.').pop() || path,
      kind: 'variable',
      type: `imported ${path}`,
      line: importToken.line,
    });

    return {
      type: 'ImportDeclaration',
      path,
      isWildcard,
      alias,
      line: importToken.line,
      col: importToken.col,
    };
  }

  private parsePackageDeclaration(): ASTNode {
    const pkgToken = this.advance(); // 'package'
    let pkgName = '';
    if (this.check('IDENTIFIER')) {
      pkgName = this.advance().value;
      while (this.match('.')) {
        pkgName += '.' + this.consume('IDENTIFIER', 'Expected identifier after "." in package name').value;
      }
    }

    let body: ASTNode;
    if (this.match('{')) {
      const statements: ASTNode[] = [];
      while (!this.check('}') && !this.isAtEnd()) {
        const stmt = this.parseDeclarationOrStatement();
        if (stmt) statements.push(stmt);
      }
      this.consume('}', "Expected '}' after package body");
      body = {
        type: 'BlockStatement',
        body: statements,
        line: pkgToken.line,
        col: pkgToken.col,
      };
    } else if (this.match(';')) {
      const statements: ASTNode[] = [];
      while (!this.isAtEnd()) {
        const stmt = this.parseDeclarationOrStatement();
        if (stmt) statements.push(stmt);
      }
      body = {
        type: 'BlockStatement',
        body: statements,
        line: pkgToken.line,
        col: pkgToken.col,
      };
    } else {
      body = this.parseBlock();
    }

    this.symbols.push({
      name: pkgName,
      kind: 'variable',
      type: `package ${pkgName}`,
      line: pkgToken.line,
    });

    return {
      type: 'PackageDeclaration',
      name: pkgName,
      body,
      line: pkgToken.line,
      col: pkgToken.col,
    };
  }

  private parseNamespaceDeclaration(): ASTNode {
    const nsToken = this.advance(); // 'namespace'
    const nameToken = this.consume('IDENTIFIER', "Expected identifier after 'namespace'");
    let uri: string | undefined;
    if (this.match('=')) {
      uri = this.consume('STRING', "Expected string URI after '=' in namespace declaration").value;
    }
    this.match(';');
    this.symbols.push({
      name: nameToken.value,
      kind: 'variable',
      type: `namespace ${nameToken.value}`,
      line: nsToken.line,
    });
    return {
      type: 'NamespaceDeclaration',
      name: nameToken.value,
      uri,
      line: nsToken.line,
      col: nsToken.col,
    };
  }

  private parseIfStatement(): ASTNode {
    const ifToken = this.advance(); // 'if'
    this.consume('(', "Expected '(' after 'if'");
    const test = this.parseExpression();
    this.consume(')', "Expected ')' after if condition");
    const consequent = this.parseBlockOrStatement();
    let alternate: ASTNode | null = null;
    if (this.match('else')) {
      alternate = this.parseBlockOrStatement();
    }
    return {
      type: 'IfStatement',
      test,
      consequent,
      alternate,
      line: ifToken.line,
      col: ifToken.col,
    };
  }

  private parseWhileStatement(): ASTNode {
    const whileToken = this.advance(); // 'while'
    this.consume('(', "Expected '(' after 'while'");
    const test = this.parseExpression();
    this.consume(')', "Expected ')' after condition");
    const body = this.parseBlockOrStatement();
    return {
      type: 'WhileStatement',
      test,
      body,
      line: whileToken.line,
      col: whileToken.col,
    };
  }

  private parseDoWhileStatement(): ASTNode {
    const doToken = this.advance(); // 'do'
    const body = this.parseBlockOrStatement();
    this.consume('while', "Expected 'while' after do block");
    this.consume('(', "Expected '(' after while");
    const test = this.parseExpression();
    this.consume(')', "Expected ')' after do-while condition");
    this.match(';');
    return {
      type: 'DoWhileStatement',
      body,
      test,
      line: doToken.line,
      col: doToken.col,
    };
  }

  private parseForStatement(): ASTNode {
    const forToken = this.advance(); // 'for'
    this.consume('(', "Expected '(' after 'for'");

    // Check for for..in (e.g. for (var x in obj) or for (x in obj))
    if (this.peek().value === 'var' || this.peek().value === 'const') {
      const savedPos = this.pos;
      const declKind = this.advance().value;
      if (this.check('IDENTIFIER')) {
        const idToken = this.advance();
        let varType = 'any';
        if (this.match(':')) {
          varType = this.advance().value;
          while (this.match('.')) {
            varType += '.' + this.consume('IDENTIFIER', 'Expected identifier in type').value;
          }
        }
        if (this.match('in')) {
          const right = this.parseExpression();
          this.consume(')', "Expected ')' after for..in");
          const body = this.parseBlockOrStatement();
          this.symbols.push({
            name: idToken.value,
            kind: 'variable',
            type: varType,
            line: idToken.line,
          });
          return {
            type: 'ForInStatement',
            variable: idToken.value,
            declKind,
            right,
            body,
            line: forToken.line,
            col: forToken.col,
          };
        }
      }
      this.pos = savedPos;
    } else if (this.check('IDENTIFIER')) {
      const savedPos = this.pos;
      const idToken = this.advance();
      if (this.match('in')) {
        const right = this.parseExpression();
        this.consume(')', "Expected ')' after for..in");
        const body = this.parseBlockOrStatement();
        return {
          type: 'ForInStatement',
          variable: idToken.value,
          right,
          body,
          line: forToken.line,
          col: forToken.col,
        };
      }
      this.pos = savedPos;
    }

    let init: ASTNode | null = null;
    if (!this.check(';')) {
      if (this.peek().value === 'var') {
        init = this.parseVarDeclaration();
      } else {
        init = this.parseExpressionStatement();
      }
    } else {
      this.advance(); // consume ';'
    }

    let test: ASTNode | null = null;
    if (!this.check(';')) {
      test = this.parseExpression();
    }
    this.consume(';', "Expected ';' after for loop condition");

    let update: ASTNode | null = null;
    if (!this.check(')')) {
      update = this.parseExpression();
    }
    this.consume(')', "Expected ')' after for loop clauses");

    const body = this.parseBlockOrStatement();

    return {
      type: 'ForStatement',
      init,
      test,
      update,
      body,
      line: forToken.line,
      col: forToken.col,
    };
  }

  private parseSwitchStatement(): ASTNode {
    const switchToken = this.advance(); // 'switch'
    this.consume('(', "Expected '(' after 'switch'");
    const discriminant = this.parseExpression();
    this.consume(')', "Expected ')' after switch value");
    this.consume('{', "Expected '{' before switch cases");
    const cases: { test: ASTNode | null; consequent: ASTNode[] }[] = [];
    while (!this.check('}') && !this.isAtEnd()) {
      if (this.match('case')) {
        const test = this.parseExpression();
        this.consume(':', "Expected ':' after case value");
        const consequent: ASTNode[] = [];
        while (!this.check('case') && !this.check('default') && !this.check('}') && !this.isAtEnd()) {
          const s = this.parseDeclarationOrStatement();
          if (s) consequent.push(s);
        }
        cases.push({ test, consequent });
      } else if (this.match('default')) {
        this.consume(':', "Expected ':' after 'default'");
        const consequent: ASTNode[] = [];
        while (!this.check('case') && !this.check('default') && !this.check('}') && !this.isAtEnd()) {
          const s = this.parseDeclarationOrStatement();
          if (s) consequent.push(s);
        }
        cases.push({ test: null, consequent });
      } else {
        this.advance();
      }
    }
    this.consume('}', "Expected '}' after switch body");
    return {
      type: 'SwitchStatement',
      discriminant,
      cases,
      line: switchToken.line,
      col: switchToken.col,
    };
  }

  private parseBreakStatement(): ASTNode {
    const tok = this.advance(); // 'break'
    let label: string | undefined;
    if (this.check('IDENTIFIER')) {
      label = this.advance().value;
    }
    this.match(';');
    return { type: 'BreakStatement', label, line: tok.line, col: tok.col };
  }

  private parseContinueStatement(): ASTNode {
    const tok = this.advance(); // 'continue'
    let label: string | undefined;
    if (this.check('IDENTIFIER')) {
      label = this.advance().value;
    }
    this.match(';');
    return { type: 'ContinueStatement', label, line: tok.line, col: tok.col };
  }

  private parseTryStatement(): ASTNode {
    const tryToken = this.advance(); // 'try'
    const block = this.parseBlock();
    let handler: { param: string; type?: string; body: ASTNode } | null = null;
    if (this.match('catch')) {
      this.consume('(', "Expected '(' after 'catch'");
      const param = this.consume('IDENTIFIER', "Expected identifier in catch clause").value;
      let paramType = 'any';
      if (this.match(':')) {
        paramType = this.advance().value;
      }
      this.consume(')', "Expected ')' after catch parameter");
      const catchBody = this.parseBlock();
      handler = { param, type: paramType, body: catchBody };
    }
    let finalizer: ASTNode | null = null;
    if (this.match('finally')) {
      finalizer = this.parseBlock();
    }
    return {
      type: 'TryStatement',
      block,
      handler,
      finalizer,
      line: tryToken.line,
      col: tryToken.col,
    };
  }

  private parseThrowStatement(): ASTNode {
    const throwToken = this.advance(); // 'throw'
    const argument = this.parseExpression();
    this.match(';');
    return { type: 'ThrowStatement', argument, line: throwToken.line, col: throwToken.col };
  }

  private parseReturnStatement(): ASTNode {
    const retToken = this.advance(); // 'return'
    let argument: ASTNode | null = null;
    if (!this.check(';') && !this.check('}')) {
      argument = this.parseExpression();
    }
    this.expectSemicolon('return statement');
    return {
      type: 'ReturnStatement',
      argument,
      line: retToken.line,
      col: retToken.col,
    };
  }

  private parseAssertStatement(): ASTNode {
    const assertToken = this.advance(); // 'assert'
    this.consume('(', "Expected '(' after 'assert'");
    const condition = this.parseExpression();
    let message = 'Assertion failed';
    if (this.match(',')) {
      const msgExpr = this.parseExpression();
      if (msgExpr && msgExpr.type === 'Literal') {
        message = String(msgExpr.value);
      }
    }
    this.consume(')', "Expected ')' after assert condition");
    this.expectSemicolon('assert statement');
    return {
      type: 'AssertStatement',
      condition,
      message,
      line: assertToken.line,
      col: assertToken.col,
    };
  }

  private parsePrintStatement(): ASTNode {
    const token = this.advance(); // 'print' or 'dump'
    this.consume('(', `Expected '(' after '${token.value}'`);
    const args: ASTNode[] = [];
    if (!this.check(')')) {
      do {
        args.push(this.parseExpression());
      } while (this.match(','));
    }
    this.consume(')', `Expected ')' after arguments`);
    this.expectSemicolon(`${token.value} statement`);
    return {
      type: 'PrintStatement',
      command: token.value,
      arguments: args,
      line: token.line,
      col: token.col,
    };
  }

  private parseBlock(): ASTNode {
    const token = this.consume('{', "Expected '{'");
    this.pushScope();
    const statements: ASTNode[] = [];
    while (!this.check('}') && !this.isAtEnd()) {
      const stmt = this.parseDeclarationOrStatement();
      if (stmt) statements.push(stmt);
    }
    this.consume('}', "Expected '}'");
    this.popScope();
    return {
      type: 'BlockStatement',
      body: statements,
      line: token.line,
      col: token.col,
    };
  }

  private parseBlockOrStatement(): ASTNode {
    if (this.check('{')) {
      return this.parseBlock();
    }
    return this.parseDeclarationOrStatement() || { type: 'EmptyStatement', line: this.peek().line, col: this.peek().col };
  }

  private parseExpressionStatement(): ASTNode {
    const expr = this.parseExpression();
    this.expectSemicolon('expression statement');
    return {
      type: 'ExpressionStatement',
      expression: expr,
      line: expr.line,
      col: expr.col,
    };
  }

  // Expressions (Pratt / Operator Precedence)
  private parseExpression(): ASTNode {
    return this.parseAssignment();
  }

  private parseAssignment(): ASTNode {
    const expr = this.parseConditional();

    if (this.match('=')) {
      const equals = this.previous();
      const value = this.parseAssignment();
      if (expr.type === 'Identifier' || expr.type === 'MemberExpression' || expr.type === 'IndexExpression') {
        return {
          type: 'AssignmentExpression',
          operator: '=',
          left: expr,
          right: value,
          line: equals.line,
          col: equals.col,
        };
      }
      this.addDiagnostic('error', 'ES4-105', 'Invalid assignment target', equals);
    }

    if (this.match('+=') || this.match('-=') || this.match('*=') || this.match('/=')) {
      const op = this.previous();
      const value = this.parseAssignment();
      return {
        type: 'AssignmentExpression',
        operator: op.value,
        left: expr,
        right: value,
        line: op.line,
        col: op.col,
      };
    }

    return expr;
  }

  private parseConditional(): ASTNode {
    const expr = this.parseLogicalOr();
    if (this.match('?')) {
      const qToken = this.previous();
      const consequent = this.parseAssignment();
      this.consume(':', "Expected ':' in conditional expression");
      const alternate = this.parseAssignment();
      return {
        type: 'ConditionalExpression',
        test: expr,
        consequent,
        alternate,
        line: qToken.line,
        col: qToken.col,
      };
    }
    return expr;
  }

  private parseLogicalOr(): ASTNode {
    let expr = this.parseLogicalAnd();
    while (this.match('||')) {
      const op = this.previous();
      const right = this.parseLogicalAnd();
      expr = {
        type: 'BinaryExpression',
        operator: op.value,
        left: expr,
        right,
        line: op.line,
        col: op.col,
      };
    }
    return expr;
  }

  private parseLogicalAnd(): ASTNode {
    let expr = this.parseEquality();
    while (this.match('&&')) {
      const op = this.previous();
      const right = this.parseEquality();
      expr = {
        type: 'BinaryExpression',
        operator: op.value,
        left: expr,
        right,
        line: op.line,
        col: op.col,
      };
    }
    return expr;
  }

  private parseEquality(): ASTNode {
    let expr = this.parseComparison();
    while (this.match('==') || this.match('!=') || this.match('===') || this.match('!==')) {
      const op = this.previous();
      const right = this.parseComparison();
      expr = {
        type: 'BinaryExpression',
        operator: op.value,
        left: expr,
        right,
        line: op.line,
        col: op.col,
      };
    }
    return expr;
  }

  private parseComparison(): ASTNode {
    let expr = this.parseAdditive();
    while (this.match('<') || this.match('<=') || this.match('>') || this.match('>=') || this.match('instanceof') || this.match('is') || this.match('as') || this.match('in')) {
      const op = this.previous();
      const right = this.parseAdditive();
      expr = {
        type: 'BinaryExpression',
        operator: op.value,
        left: expr,
        right,
        line: op.line,
        col: op.col,
      };
    }
    return expr;
  }

  private parseAdditive(): ASTNode {
    let expr = this.parseMultiplicative();
    while (this.match('+') || this.match('-')) {
      const op = this.previous();
      const right = this.parseMultiplicative();
      expr = {
        type: 'BinaryExpression',
        operator: op.value,
        left: expr,
        right,
        line: op.line,
        col: op.col,
      };
    }
    return expr;
  }

  private parseMultiplicative(): ASTNode {
    let expr = this.parseUnary();
    while (this.match('*') || this.match('/') || this.match('%')) {
      const op = this.previous();
      const right = this.parseUnary();
      expr = {
        type: 'BinaryExpression',
        operator: op.value,
        left: expr,
        right,
        line: op.line,
        col: op.col,
      };
    }
    return expr;
  }

  private parseUnary(): ASTNode {
    if (this.match('!') || this.match('-') || this.match('+')) {
      const op = this.previous();
      const right = this.parseUnary();
      return {
        type: 'UnaryExpression',
        operator: op.value,
        argument: right,
        line: op.line,
        col: op.col,
      };
    }

    if (this.match('typeof')) {
      const op = this.previous();
      const right = this.parseUnary();
      return {
        type: 'TypeOfExpression',
        argument: right,
        line: op.line,
        col: op.col,
      };
    }

    return this.parsePostfix();
  }

  private parsePostfix(): ASTNode {
    let expr = this.parseCallOrMember();
    if (this.match('++') || this.match('--')) {
      const op = this.previous();
      return {
        type: 'UpdateExpression',
        operator: op.value,
        argument: expr,
        prefix: false,
        line: op.line,
        col: op.col,
      };
    }
    return expr;
  }

  private parseCallOrMember(): ASTNode {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match('(')) {
        // Function call
        const args: ASTNode[] = [];
        if (!this.check(')')) {
          do {
            args.push(this.parseExpression());
          } while (this.match(','));
        }
        const closeParen = this.consume(')', "Expected ')' after arguments");
        expr = {
          type: 'CallExpression',
          callee: expr,
          arguments: args,
          line: expr.line,
          col: expr.col,
        };
      } else if (this.match('.')) {
        const propToken = this.consume('IDENTIFIER', 'Expected property name after .');
        expr = {
          type: 'MemberExpression',
          object: expr,
          property: propToken.value,
          line: expr.line,
          col: expr.col,
        };
      } else if (this.match('::')) {
        const propToken = this.consume('IDENTIFIER', 'Expected identifier after ::');
        expr = {
          type: 'QualifiedIdentifier',
          namespace: expr,
          name: propToken.value,
          line: expr.line,
          col: expr.col,
        };
      } else if (this.match('[')) {
        const indexExpr = this.parseExpression();
        this.consume(']', "Expected ']' after index");
        expr = {
          type: 'IndexExpression',
          object: expr,
          index: indexExpr,
          line: expr.line,
          col: expr.col,
        };
      } else {
        break;
      }
    }

    return expr;
  }

  private parsePrimary(): ASTNode {
    const token = this.peek();

    if (this.match('NUMBER')) {
      const val = token.value.includes('.') ? parseFloat(token.value) : parseInt(token.value, 10);
      return { type: 'Literal', value: val, line: token.line, col: token.col };
    }

    if (this.match('STRING')) {
      return { type: 'Literal', value: token.value, line: token.line, col: token.col };
    }

    if (this.match('BOOLEAN')) {
      return { type: 'Literal', value: token.value === 'true', line: token.line, col: token.col };
    }

    if (this.match('NULL')) {
      return { type: 'Literal', value: null, line: token.line, col: token.col };
    }

    if (this.match('IDENTIFIER')) {
      return { type: 'Identifier', name: token.value, line: token.line, col: token.col };
    }

    if (this.match('this')) {
      return { type: 'ThisExpression', line: token.line, col: token.col };
    }

    if (this.match('super')) {
      return { type: 'SuperExpression', line: token.line, col: token.col };
    }

    if (this.match('function')) {
      const fnToken = this.previous();
      let fnName: string | undefined;
      if (this.check('IDENTIFIER')) {
        fnName = this.advance().value;
      }
      this.consume('(', "Expected '(' for function expression parameters");
      const params: any[] = [];
      if (!this.check(')')) {
        do {
          const pName = this.consume('IDENTIFIER', 'Expected parameter name').value;
          let pType = 'any';
          if (this.match(':')) {
            pType = this.advance().value;
            while (this.match('.')) {
              pType += '.' + this.consume('IDENTIFIER', 'Expected identifier in type').value;
            }
          }
          params.push({ name: pName, type: pType });
        } while (this.match(','));
      }
      this.consume(')', "Expected ')' after parameters");
      let returnType = 'any';
      if (this.match(':')) {
        returnType = this.advance().value;
      }
      const body = this.parseBlock();
      return {
        type: 'FunctionExpression',
        name: fnName,
        params,
        returnType,
        body,
        line: fnToken.line,
        col: fnToken.col,
      };
    }

    if (this.match('{')) {
      const openToken = this.previous();
      const properties: { key: string; value: ASTNode }[] = [];
      if (!this.check('}')) {
        do {
          let key = '';
          if (this.check('IDENTIFIER') || this.check('STRING') || this.peek().type === 'KEYWORD') {
            key = this.advance().value;
          } else {
            throw new Error('Expected property name in object literal');
          }
          this.consume(':', "Expected ':' after property name");
          const val = this.parseExpression();
          properties.push({ key, value: val });
        } while (this.match(','));
      }
      this.consume('}', "Expected '}' after object literal");
      return {
        type: 'ObjectLiteral',
        properties,
        line: openToken.line,
        col: openToken.col,
      };
    }

    if (this.match('new')) {
      const newToken = this.previous();
      let callee = this.consume('IDENTIFIER', 'Expected constructor name after new').value;
      while (this.match('.')) {
        callee += '.' + this.consume('IDENTIFIER', 'Expected identifier after "." in constructor name').value;
      }
      this.consume('(', "Expected '(' after constructor name");
      const args: ASTNode[] = [];
      if (!this.check(')')) {
        do {
          args.push(this.parseExpression());
        } while (this.match(','));
      }
      this.consume(')', "Expected ')' after constructor arguments");
      return {
        type: 'NewExpression',
        callee,
        arguments: args,
        line: newToken.line,
        col: newToken.col,
      };
    }

    if (this.match('(')) {
      const expr = this.parseExpression();
      this.consume(')', "Expected ')' after grouping expression");
      return expr;
    }

    if (this.match('[')) {
      const openToken = this.previous();
      const elements: ASTNode[] = [];
      if (!this.check(']')) {
        do {
          elements.push(this.parseExpression());
        } while (this.match(','));
      }
      this.consume(']', "Expected ']' after array elements");
      return {
        type: 'ArrayLiteral',
        elements,
        line: openToken.line,
        col: openToken.col,
      };
    }

    throw new Error(`Unexpected token '${token.value || token.type}'`);
  }

  // Helpers
  private match(...typesOrValues: string[]): boolean {
    for (const val of typesOrValues) {
      if (this.check(val)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(val: string): boolean {
    if (this.isAtEnd()) return false;
    const t = this.peek();
    return t.type === val || t.value === val;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.pos++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private peek(): Token {
    return this.tokens[this.pos] || { type: 'EOF', value: '', line: 0, col: 0, start: 0, end: 0 };
  }

  private previous(): Token {
    return this.tokens[this.pos - 1];
  }

  private consume(val: string, message: string): Token {
    if (this.check(val)) return this.advance();
    throw new Error(`${message}. Found '${this.peek().value || this.peek().type}' at Line ${this.peek().line}:${this.peek().col}`);
  }

  private expectSemicolon(context: string) {
    if (this.match(';')) return;
    const prev = this.previous();
    this.addDiagnostic(
      'error',
      'ES4-102',
      `Ambiguous statement boundary in ${context}. Semicolon ';' strictly required under ES4 2002 specification draft.`,
      prev || this.peek()
    );
  }

  private addDiagnostic(severity: 'error' | 'warning' | 'info', code: string, message: string, token: Token) {
    this.diagnostics.push({
      id: `${code}-${token.line}-${token.col}-${Math.random().toString(36).substring(2, 6)}`,
      severity,
      code,
      message,
      line: token.line,
      col: token.col,
      endLine: token.line,
      endCol: token.col + (token.value ? token.value.length : 1),
    });
  }

  private synchronize() {
    this.advance();
    while (!this.isAtEnd()) {
      if (this.previous().value === ';') return;
      switch (this.peek().value) {
        case 'class':
        case 'function':
        case 'var':
        case 'const':
        case 'for':
        case 'if':
        case 'while':
        case 'return':
          return;
      }
      this.advance();
    }
  }
}
