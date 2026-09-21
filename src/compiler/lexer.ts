/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ES4 Studio 2002 - ECMAScript 4 Lexer
 */

import { Token, TokenType } from '../types';

export const ES4_KEYWORDS = new Set([
  'var', 'const', 'function', 'class', 'package', 'namespace',
  'interface', 'public', 'private', 'protected', 'static', 'override', 'import', 'as',
  'return', 'if', 'else', 'while', 'do', 'for', 'in', 'switch', 'case', 'default', 'break',
  'continue', 'new', 'this', 'super', 'type', 'assert', 'print',
  'dump', 'typeof', 'is', 'like', 'instanceof', 'delete', 'try', 'catch', 'finally', 'throw',
  'extends', 'implements', 'void', 'any', 'debugger', 'with'
]);

export const ES4_TYPES = new Set([
  'int', 'uint', 'double', 'float', 'string', 'boolean', 'void', 'any',
  'Object', 'Array', 'Vector', 'Point', 'Matrix', 'List', 'Map', 'Set', 'Stack', 'Function', 'Error'
]);

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  let line = 1;
  let col = 1;

  while (index < input.length) {
    const char = input[index];

    // Newlines
    if (char === '\n') {
      index++;
      line++;
      col = 1;
      continue;
    }

    // Whitespace
    if (char === ' ' || char === '\t' || char === '\r') {
      index++;
      col++;
      continue;
    }

    // Single-line comment
    if (char === '/' && input[index + 1] === '/') {
      const start = index;
      const startCol = col;
      while (index < input.length && input[index] !== '\n') {
        index++;
        col++;
      }
      tokens.push({
        type: 'COMMENT',
        value: input.slice(start, index),
        line,
        col: startCol,
        start,
        end: index,
      });
      continue;
    }

    // Multi-line comment
    if (char === '/' && input[index + 1] === '*') {
      const start = index;
      const startLine = line;
      const startCol = col;
      index += 2;
      col += 2;
      while (index < input.length && !(input[index] === '*' && input[index + 1] === '/')) {
        if (input[index] === '\n') {
          line++;
          col = 1;
        } else {
          col++;
        }
        index++;
      }
      if (index < input.length) {
        index += 2; // skip */
        col += 2;
      }
      tokens.push({
        type: 'COMMENT',
        value: input.slice(start, index),
        line: startLine,
        col: startCol,
        start,
        end: index,
      });
      continue;
    }

    // String literals ("..." or '...')
    if (char === '"' || char === "'") {
      const quote = char;
      const start = index;
      const startCol = col;
      index++;
      col++;
      let strVal = '';
      while (index < input.length && input[index] !== quote && input[index] !== '\n') {
        if (input[index] === '\\' && index + 1 < input.length) {
          index++;
          col++;
          const esc = input[index];
          if (esc === 'n') strVal += '\n';
          else if (esc === 't') strVal += '\t';
          else if (esc === 'r') strVal += '\r';
          else strVal += esc;
        } else {
          strVal += input[index];
        }
        index++;
        col++;
      }
      if (index < input.length && input[index] === quote) {
        index++;
        col++;
      }
      tokens.push({
        type: 'STRING',
        value: strVal,
        line,
        col: startCol,
        start,
        end: index,
      });
      continue;
    }

    // Numbers (integer, hex 0x..., float)
    if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(input[index + 1] || ''))) {
      const start = index;
      const startCol = col;
      if (char === '0' && (input[index + 1] === 'x' || input[index + 1] === 'X')) {
        index += 2;
        col += 2;
        while (index < input.length && /[0-9a-fA-F]/.test(input[index])) {
          index++;
          col++;
        }
      } else {
        let hasDot = char === '.';
        while (index < input.length) {
          const c = input[index];
          if (c === '.' && !hasDot) {
            hasDot = true;
            index++;
            col++;
          } else if (/[0-9]/.test(c)) {
            index++;
            col++;
          } else {
            break;
          }
        }
      }
      tokens.push({
        type: 'NUMBER',
        value: input.slice(start, index),
        line,
        col: startCol,
        start,
        end: index,
      });
      continue;
    }

    // Identifiers and Keywords
    if (/[a-zA-Z_$]/.test(char)) {
      const start = index;
      const startCol = col;
      while (index < input.length && /[a-zA-Z0-9_$]/.test(input[index])) {
        index++;
        col++;
      }
      const word = input.slice(start, index);
      let type: TokenType = 'IDENTIFIER';
      if (word === 'true' || word === 'false') {
        type = 'BOOLEAN';
      } else if (word === 'null') {
        type = 'NULL';
      } else if (ES4_TYPES.has(word)) {
        type = 'TYPE';
      } else if (ES4_KEYWORDS.has(word)) {
        type = 'KEYWORD';
      }

      tokens.push({
        type,
        value: word,
        line,
        col: startCol,
        start,
        end: index,
      });
      continue;
    }

    // Three-character operators
    const three = input.slice(index, index + 3);
    if (['===', '!==', '>>>'].includes(three)) {
      tokens.push({
        type: 'OPERATOR',
        value: three,
        line,
        col,
        start: index,
        end: index + 3,
      });
      index += 3;
      col += 3;
      continue;
    }

    // Two-character operators
    const two = input.slice(index, index + 2);
    if (['==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '::', '<<', '>>', '=>'].includes(two)) {
      tokens.push({
        type: 'OPERATOR',
        value: two,
        line,
        col,
        start: index,
        end: index + 2,
      });
      index += 2;
      col += 2;
      continue;
    }

    // Single-character operators
    if (['+', '-', '*', '/', '%', '<', '>', '=', '!', '&', '|', '^', '~', '?'].includes(char)) {
      tokens.push({
        type: 'OPERATOR',
        value: char,
        line,
        col,
        start: index,
        end: index + 1,
      });
      index++;
      col++;
      continue;
    }

    // Punctuation
    if ([';', ':', ',', '.', '(', ')', '{', '}', '[', ']'].includes(char)) {
      tokens.push({
        type: 'PUNCTUATION',
        value: char,
        line,
        col,
        start: index,
        end: index + 1,
      });
      index++;
      col++;
      continue;
    }

    // Unknown char
    tokens.push({
      type: 'UNKNOWN',
      value: char,
      line,
      col,
      start: index,
      end: index + 1,
    });
    index++;
    col++;
  }

  tokens.push({
    type: 'EOF',
    value: '',
    line,
    col,
    start: index,
    end: index,
  });

  return tokens;
}
