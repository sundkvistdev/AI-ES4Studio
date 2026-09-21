/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ES4 Studio 2002 - Vintage Code Editor Component
 * Includes Syntax Highlighting, Indentation Guidelines, Tab/Shift+Tab,
 * CodeMagic Autocomplete, Gutter Breakpoints, and Custom Swing Context Menu
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { CodeMagicItem, Diagnostic, HoverInfo } from '../../types';
import { ES4Parser } from '../../compiler/parser';
import { SemanticAnalyzer } from '../../compiler/analyzer';

const EDITOR_FONT_FAMILY = 'Consolas, "Lucida Console", "Liberation Mono", Menlo, "Courier New", monospace';
const EDITOR_FONT_SIZE = '12px';
const EDITOR_LINE_HEIGHT = '18px';

const ES4_KEYWORDS_SET = new Set([
  'var', 'const', 'function', 'class', 'package', 'namespace',
  'interface', 'public', 'private', 'protected', 'static', 'override',
  'import', 'return', 'if', 'else', 'while', 'for', 'do', 'switch',
  'case', 'default', 'break', 'continue', 'new', 'this', 'super',
  'type', 'assert', 'print', 'dump', 'clock', 'typeof', 'instanceof',
  'is', 'as', 'in', 'try', 'catch', 'finally', 'throw', 'delete',
  'void', 'with', 'extends', 'implements', 'get', 'set'
]);

const ES4_TYPES_SET = new Set([
  'int', 'uint', 'double', 'float', 'string', 'boolean', 'void', 'any',
  'Function', 'Object', 'Array', 'Vector', 'Point', 'Matrix', 'Complex',
  'List', 'Map', 'Set', 'Stack', 'Exception', 'Console', 'Reflect', 'Math'
]);

const ES4_LITERALS_SET = new Set([
  'true', 'false', 'null', 'undefined', 'NaN', 'Infinity'
]);

interface HighlightToken {
  text: string;
  type: 'plain' | 'keyword' | 'type' | 'string' | 'number' | 'comment' | 'boolean' | 'property' | 'method';
}

function highlightLineTokens(lineText: string, state: { inComment: boolean }): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  let i = 0;
  const len = lineText.length;

  while (i < len) {
    // 1. If currently inside a multi-line comment /* ... */
    if (state.inComment) {
      const closeIdx = lineText.indexOf('*/', i);
      if (closeIdx === -1) {
        tokens.push({ text: lineText.slice(i), type: 'comment' });
        break;
      } else {
        tokens.push({ text: lineText.slice(i, closeIdx + 2), type: 'comment' });
        i = closeIdx + 2;
        state.inComment = false;
        continue;
      }
    }

    // 2. Start of multi-line comment /*
    if (lineText[i] === '/' && lineText[i + 1] === '*') {
      const closeIdx = lineText.indexOf('*/', i + 2);
      if (closeIdx === -1) {
        tokens.push({ text: lineText.slice(i), type: 'comment' });
        state.inComment = true;
        break;
      } else {
        tokens.push({ text: lineText.slice(i, closeIdx + 2), type: 'comment' });
        i = closeIdx + 2;
        continue;
      }
    }

    // 3. Single-line comment //
    if (lineText[i] === '/' && lineText[i + 1] === '/') {
      tokens.push({ text: lineText.slice(i), type: 'comment' });
      break;
    }

    // 4. String literals "..." or '...'
    if (lineText[i] === '"' || lineText[i] === "'") {
      const quote = lineText[i];
      let j = i + 1;
      while (j < len) {
        if (lineText[j] === '\\') {
          j += 2;
        } else if (lineText[j] === quote) {
          j++;
          break;
        } else {
          j++;
        }
      }
      tokens.push({ text: lineText.slice(i, j), type: 'string' });
      i = j;
      continue;
    }

    // 5. Numbers (hex 0x... or decimal 123, 123.45)
    if (
      (lineText[i] >= '0' && lineText[i] <= '9') ||
      (lineText[i] === '.' && i + 1 < len && lineText[i + 1] >= '0' && lineText[i + 1] <= '9')
    ) {
      let j = i;
      if (lineText[j] === '0' && (lineText[j + 1] === 'x' || lineText[j + 1] === 'X')) {
        j += 2;
        while (j < len && /[0-9a-fA-F]/.test(lineText[j])) j++;
      } else {
        while (j < len && /[0-9]/.test(lineText[j])) j++;
        if (j < len && lineText[j] === '.') {
          j++;
          while (j < len && /[0-9]/.test(lineText[j])) j++;
        }
      }
      tokens.push({ text: lineText.slice(i, j), type: 'number' });
      i = j;
      continue;
    }

    // 6. Context-Aware Identifiers, Member Access, Functions, Types, Keywords
    if (/[a-zA-Z_$]/.test(lineText[i])) {
      // Look back for preceding non-whitespace character (e.g. '.')
      let prevNonWsIdx = i - 1;
      while (prevNonWsIdx >= 0 && /\s/.test(lineText[prevNonWsIdx])) {
        prevNonWsIdx--;
      }
      const isAfterDot = prevNonWsIdx >= 0 && lineText[prevNonWsIdx] === '.';

      let j = i;
      while (j < len && /[a-zA-Z0-9_$]/.test(lineText[j])) j++;
      const word = lineText.slice(i, j);

      // Look ahead for next non-whitespace character (e.g. '(' for function/method calls)
      let nextNonWsIdx = j;
      while (nextNonWsIdx < len && /\s/.test(lineText[nextNonWsIdx])) {
        nextNonWsIdx++;
      }
      const isFollowedByParen = nextNonWsIdx < len && lineText[nextNonWsIdx] === '(';

      let type: HighlightToken['type'] = 'plain';

      if (isAfterDot) {
        type = isFollowedByParen ? 'method' : 'property';
      } else if (ES4_KEYWORDS_SET.has(word)) {
        type = 'keyword';
      } else if (ES4_TYPES_SET.has(word)) {
        type = 'type';
      } else if (ES4_LITERALS_SET.has(word)) {
        type = 'boolean';
      } else if (isFollowedByParen) {
        type = 'method';
      } else if (word[0] >= 'A' && word[0] <= 'Z' && !/^[A-Z0-9_]+$/.test(word)) {
        // PascalCase identifier (likely Class / Type)
        type = 'type';
      }

      tokens.push({ text: word, type });
      i = j;
      continue;
    }

    // 7. Plain text / whitespace / punctuation / operators
    let j = i;
    while (
      j < len &&
      lineText[j] !== '/' &&
      lineText[j] !== '"' &&
      lineText[j] !== "'" &&
      !/[0-9a-zA-Z_$]/.test(lineText[j])
    ) {
      j++;
    }
    tokens.push({ text: lineText.slice(i, j), type: 'plain' });
    i = j;
  }

  return tokens;
}

interface CodeEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  breakpoints: Set<number>;
  onToggleBreakpoint: (line: number) => void;
  onDiagnosticsUpdate: (diagnostics: Diagnostic[]) => void;
  onCursorChange: (line: number, col: number) => void;
  onCompileRequest?: () => void;
  onRunRequest?: () => void;
  activeExecutionLine?: number;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  breakpoints,
  onToggleBreakpoint,
  onDiagnosticsUpdate,
  onCursorChange,
  onCompileRequest,
  onRunRequest,
  activeExecutionLine,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [parsedSymbols, setParsedSymbols] = useState<any[]>([]);

  // Semantic Code Intelligence Engine
  const analyzer = useMemo(() => new SemanticAnalyzer(value), [value]);

  // Hover Information State
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);
  const hoverTimeoutRef = useRef<any>(null);

  // CodeMagic State
  const [showCodeMagic, setShowCodeMagic] = useState(false);
  const [magicCoords, setMagicCoords] = useState({ top: 0, left: 0 });
  const [magicQuery, setMagicQuery] = useState('');
  const [selectedMagicIdx, setSelectedMagicIdx] = useState(0);

  // Custom Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
  }>({ visible: false, x: 0, y: 0 });

  // Throttled Live Parser Engine
  useEffect(() => {
    const handler = setTimeout(() => {
      try {
        const parser = new ES4Parser(value);
        const result = parser.parse();
        setDiagnostics(result.diagnostics);
        setParsedSymbols(result.symbols);
        onDiagnosticsUpdate(result.diagnostics);
      } catch (e) {
        // parser internal safety
      }
    }, 220); // throttled for performance

    return () => clearTimeout(handler);
  }, [value, onDiagnosticsUpdate]);

  // Track cursor position in status bar
  const updateCursorInfo = () => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart;
    const textBefore = value.substring(0, pos);
    const lines = textBefore.split('\n');
    const currentLine = lines.length;
    const currentCol = lines[lines.length - 1].length + 1;
    setCursorPos({ line: currentLine, col: currentCol });
    onCursorChange(currentLine, currentCol);
  };

  // Close menus on outer click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu.visible) {
        setContextMenu({ visible: false, x: 0, y: 0 });
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenu.visible]);

  // Split lines
  const lines = useMemo(() => value.split('\n'), [value]);

  // Diagnostic line lookup map
  const diagnosticMap = useMemo(() => {
    const map = new Map<number, Diagnostic>();
    for (const d of diagnostics) {
      if (!map.has(d.line) || d.severity === 'error') {
        map.set(d.line, d);
      }
    }
    return map;
  }, [diagnostics]);

  // Context-Aware CodeMagic Candidates from SemanticAnalyzer
  const magicItems = useMemo<CodeMagicItem[]>(() => {
    const textarea = textareaRef.current;
    const pos = textarea ? textarea.selectionStart : 0;
    const textBefore = value.substring(0, pos);

    const contextItems = analyzer.getCompletions(cursorPos.line, cursorPos.col, textBefore);

    if (!magicQuery) {
      return contextItems.slice(0, 16);
    }
    const q = magicQuery.toLowerCase();
    return contextItems
      .filter((item) => item.label.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStarts = a.label.toLowerCase().startsWith(q);
        const bStarts = b.label.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return (a.sortText || a.label).localeCompare(b.sortText || b.label);
      })
      .slice(0, 16);
  }, [analyzer, cursorPos, value, magicQuery]);

  // Insert CodeMagic selection with smart cursor placement
  const applyCodeMagic = (item: CodeMagicItem) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const pos = textarea.selectionStart;
    const textBefore = value.substring(0, pos);
    const textAfter = value.substring(pos);

    // Replace the partial query
    const match = textBefore.match(/[a-zA-Z0-9_$]+$/);
    const queryLen = match ? match[0].length : 0;
    const newTextBefore = textBefore.slice(0, textBefore.length - queryLen);
    const updatedValue = newTextBefore + item.insertText + textAfter;

    onChange(updatedValue);
    setShowCodeMagic(false);

    setTimeout(() => {
      if (textareaRef.current) {
        let cursorOffset = item.insertText.length;
        if (item.insertText.endsWith('()')) {
          cursorOffset -= 1;
        } else if (item.insertText.endsWith(')')) {
          cursorOffset -= 1;
        } else if (item.insertText.includes('// TODO')) {
          const idx = item.insertText.indexOf('// TODO');
          if (idx !== -1) cursorOffset = idx;
        }

        const newPos = newTextBefore.length + cursorOffset;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
        updateCursorInfo();
      }
    }, 10);
  };

  // Extensive keyboard navigation & Tab handling
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // CodeMagic active keyboard controls
    if (showCodeMagic && magicItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMagicIdx((prev) => (prev + 1) % magicItems.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMagicIdx((prev) => (prev - 1 + magicItems.length) % magicItems.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applyCodeMagic(magicItems[selectedMagicIdx]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowCodeMagic(false);
        return;
      }
    }

    // Trigger CodeMagic on Ctrl+Space
    if (e.ctrlKey && e.key === ' ') {
      e.preventDefault();
      triggerCodeMagicManual();
      return;
    }

    // TAB / SHIFT+TAB HANDLING
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (start === end && !e.shiftKey) {
        // Single cursor position, insert 2 spaces
        const updated = value.substring(0, start) + '  ' + value.substring(end);
        onChange(updated);
        setTimeout(() => {
          textarea.setSelectionRange(start + 2, start + 2);
          updateCursorInfo();
        }, 0);
      } else {
        // Multiline block indentation or Shift+Tab unindent
        const linesArr = value.split('\n');
        let currentPos = 0;
        let startLineIdx = 0;
        let endLineIdx = 0;

        for (let i = 0; i < linesArr.length; i++) {
          const lineLen = linesArr[i].length + 1; // +1 for \n
          if (currentPos + lineLen > start && startLineIdx === 0 && start >= currentPos) {
            startLineIdx = i;
          }
          if (currentPos + lineLen >= end) {
            endLineIdx = i;
            break;
          }
          currentPos += lineLen;
        }

        let deltaStart = 0;
        let totalDelta = 0;

        for (let i = startLineIdx; i <= endLineIdx; i++) {
          if (!e.shiftKey) {
            // Indent line by 2 spaces
            linesArr[i] = '  ' + linesArr[i];
            totalDelta += 2;
            if (i === startLineIdx) deltaStart += 2;
          } else {
            // Unindent line
            if (linesArr[i].startsWith('  ')) {
              linesArr[i] = linesArr[i].substring(2);
              totalDelta -= 2;
              if (i === startLineIdx) deltaStart -= 2;
            } else if (linesArr[i].startsWith(' ')) {
              linesArr[i] = linesArr[i].substring(1);
              totalDelta -= 1;
              if (i === startLineIdx) deltaStart -= 1;
            } else if (linesArr[i].startsWith('\t')) {
              linesArr[i] = linesArr[i].substring(1);
              totalDelta -= 1;
              if (i === startLineIdx) deltaStart -= 1;
            }
          }
        }

        const newText = linesArr.join('\n');
        onChange(newText);
        setTimeout(() => {
          textarea.setSelectionRange(
            Math.max(0, start + deltaStart),
            Math.max(0, end + totalDelta)
          );
          updateCursorInfo();
        }, 0);
      }
      return;
    }

    // ENTER: Smart auto-indentation
    if (e.key === 'Enter') {
      const start = textarea.selectionStart;
      const textBefore = value.substring(0, start);
      const currentLineText = textBefore.split('\n').pop() || '';
      const indentMatch = currentLineText.match(/^(\s*)/);
      let indent = indentMatch ? indentMatch[1] : '';

      // If line ends with '{', add 2 more spaces
      if (currentLineText.trim().endsWith('{')) {
        indent += '  ';
      }

      e.preventDefault();
      const updated = value.substring(0, start) + '\n' + indent + value.substring(textarea.selectionEnd);
      onChange(updated);
      setTimeout(() => {
        const newPos = start + 1 + indent.length;
        textarea.setSelectionRange(newPos, newPos);
        updateCursorInfo();
      }, 0);
      return;
    }
  };

  const positionCodeMagic = (textBefore: string, textarea: HTMLTextAreaElement) => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const linesArr = textBefore.split('\n');
    const lineNum = linesArr.length;
    const colNum = linesArr[linesArr.length - 1].length;
    const scrollTop = textarea.scrollTop;
    const scrollLeft = textarea.scrollLeft;

    const gutterWidth = 48;
    const cursorRelX = gutterWidth + 8 + (colNum * 7.22) - scrollLeft;
    const cursorRelY = 4 + ((lineNum - 1) * 18) - scrollTop;

    const popupWidth = 300;
    const popupHeight = 220;

    // Position above cursor if too close to bottom
    let top = cursorRelY + 22;
    if (top + popupHeight > cRect.height - 10) {
      top = Math.max(8, cursorRelY - popupHeight - 4);
    }
    // Clamp horizontally within container bounds
    let left = Math.max(gutterWidth + 4, Math.min(cursorRelX, cRect.width - popupWidth - 12));

    setMagicCoords({ top, left });
    setShowCodeMagic(true);
  };

  const triggerCodeMagicManual = () => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart;
    const textBefore = value.substring(0, pos);
    const dotMatch = textBefore.match(/(?:^|[^\w$])([a-zA-Z_$][a-zA-Z0-9_$.()\[\]]*)\.([a-zA-Z0-9_$]*)$/);
    const colonMatch = textBefore.match(/:\s*([a-zA-Z0-9_$]*)$/);
    const wordMatch = textBefore.match(/([a-zA-Z0-9_$]+)$/);

    const query = dotMatch ? dotMatch[2] : (colonMatch ? colonMatch[1] : (wordMatch ? wordMatch[1] : ''));
    setMagicQuery(query);
    setSelectedMagicIdx(0);
    positionCodeMagic(textBefore, textareaRef.current);
  };

  // Text change handler with live CodeMagic trigger on typing
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    onChange(newVal);
    updateCursorInfo();
    if (hoverInfo) setHoverInfo(null);

    const pos = e.target.selectionStart;
    const textBefore = newVal.substring(0, pos);
    const importMatch = textBefore.match(/import\s+([a-zA-Z0-9_$.*]*)$/);
    const newMatch = textBefore.match(/new\s+([a-zA-Z0-9_$.]*)$/);
    const dotMatch = textBefore.match(/(?:^|[^\w$])([a-zA-Z_$][a-zA-Z0-9_$.()\[\]]*)\.([a-zA-Z0-9_$]*)$/);
    const colonMatch = textBefore.match(/:\s*([a-zA-Z0-9_$]*)$/);
    const wordMatch = textBefore.match(/([a-zA-Z0-9_$]{2,})$/);

    if (importMatch) {
      setMagicQuery(importMatch[1].split('.').pop() || '');
      setSelectedMagicIdx(0);
      positionCodeMagic(textBefore, e.target);
    } else if (newMatch) {
      setMagicQuery(newMatch[1]);
      setSelectedMagicIdx(0);
      positionCodeMagic(textBefore, e.target);
    } else if (dotMatch) {
      setMagicQuery(dotMatch[2]);
      setSelectedMagicIdx(0);
      positionCodeMagic(textBefore, e.target);
    } else if (colonMatch) {
      setMagicQuery(colonMatch[1]);
      setSelectedMagicIdx(0);
      positionCodeMagic(textBefore, e.target);
    } else if (wordMatch) {
      setMagicQuery(wordMatch[1]);
      setSelectedMagicIdx(0);
      positionCodeMagic(textBefore, e.target);
    } else {
      setShowCodeMagic(false);
    }
  };

  // Mouse hover detection for accurate hover signatures & docs
  const handleMouseMove = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (contextMenu.visible || showCodeMagic) {
      if (hoverInfo) setHoverInfo(null);
      return;
    }

    const textarea = textareaRef.current;
    const container = containerRef.current;
    if (!textarea || !container) return;

    const rect = textarea.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(() => {
      const scrollTop = textarea.scrollTop;
      const scrollLeft = textarea.scrollLeft;
      const relY = clientY - rect.top + scrollTop;
      const relX = clientX - rect.left + scrollLeft;

      const lineIdx = Math.floor((relY - 4) / 18);
      if (lineIdx < 0 || lineIdx >= lines.length) {
        setHoverInfo(null);
        return;
      }

      const lineText = lines[lineIdx];
      const charIdx = Math.floor((relX - 8) / 7.22);
      if (charIdx < 0 || charIdx > lineText.length) {
        setHoverInfo(null);
        return;
      }

      // Extract token under cursor
      let start = charIdx;
      while (start > 0 && /[a-zA-Z0-9_$]/.test(lineText[start - 1])) {
        start--;
      }
      let end = charIdx;
      while (end < lineText.length && /[a-zA-Z0-9_$]/.test(lineText[end])) {
        end++;
      }

      const word = lineText.slice(start, end).trim();
      const lineNum = lineIdx + 1;

      if (!word) {
        setHoverInfo(null);
        return;
      }

      let info = analyzer.getHoverInfo(lineNum, charIdx + 1, word, diagnostics);
      if (!info) {
        let dotStart = start;
        while (dotStart > 0 && /[a-zA-Z0-9_$.]/.test(lineText[dotStart - 1])) {
          dotStart--;
        }
        let dotEnd = end;
        while (dotEnd < lineText.length && /[a-zA-Z0-9_$.]/.test(lineText[dotEnd])) {
          dotEnd++;
        }
        const dottedWord = lineText.slice(dotStart, dotEnd).trim();
        if (dottedWord && dottedWord !== word) {
          info = analyzer.getHoverInfo(lineNum, charIdx + 1, dottedWord, diagnostics);
        }
      }

      if (info) {
        const cRect = container.getBoundingClientRect();
        const tooltipWidth = 420;
        const tooltipHeight = 280;
        const mouseRelX = clientX - cRect.left;
        const mouseRelY = clientY - cRect.top;

        let x = mouseRelX + 12;
        if (x + tooltipWidth > cRect.width - 10) {
          x = Math.max(10, cRect.width - tooltipWidth - 12);
        }

        let y = mouseRelY + 16;
        if (y + tooltipHeight > cRect.height - 10) {
          y = Math.max(10, mouseRelY - tooltipHeight - 8);
        }

        setHoverCoords({ x, y });
        setHoverInfo(info);
      } else {
        setHoverInfo(null);
      }
    }, 150);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoverInfo(null);
  };

  // Synchronize scrolling between textarea, highlight layer, and gutter
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (hoverInfo) setHoverInfo(null);
    const { scrollTop, scrollLeft } = e.currentTarget;
    if (highlightRef.current) {
      highlightRef.current.scrollTop = scrollTop;
      highlightRef.current.scrollLeft = scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = scrollTop;
    }
  };

  const handleGutterWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop += e.deltaY;
    }
  };

  // Custom Context Menu on Right Click
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContextMenu({
        visible: true,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  // Indentation guidelines generator
  const renderIndentationGuides = (lineText: string) => {
    const leadingSpaces = lineText.match(/^( +)/);
    if (!leadingSpaces) return null;
    const count = leadingSpaces[1].length;
    const guides = [];
    for (let i = 2; i <= count; i += 2) {
      guides.push(
        <span
          key={i}
          className="absolute border-r border-dotted border-gray-300 pointer-events-none"
          style={{
            left: `${i}ch`,
            top: 0,
            bottom: 0,
            height: '100%',
          }}
        />
      );
    }
    return guides;
  };

  // Highlighted line tokens cache with multi-line comment state tracking
  const highlightedLines = useMemo(() => {
    const commentState = { inComment: false };
    return lines.map((line) => highlightLineTokens(line, commentState));
  }, [lines]);

  // Token-based syntax rendering for background layer (100% character matching)
  const renderHighlightedLine = (lineTokens: HighlightToken[], lineIndex: number, lineText: string) => {
    const isExecutionLine = activeExecutionLine === lineIndex + 1;
    const lineDiag = diagnosticMap.get(lineIndex + 1);

    return (
      <div
        key={lineIndex}
        style={{
          height: EDITOR_LINE_HEIGHT,
          lineHeight: EDITOR_LINE_HEIGHT,
          minHeight: EDITOR_LINE_HEIGHT,
          boxSizing: 'border-box',
          whiteSpace: 'pre',
        }}
        className={`relative ${
          isExecutionLine
            ? 'bg-[#b8cfe5]'
            : lineDiag?.severity === 'error'
            ? 'bg-[#ffebee]'
            : ''
        }`}
      >
        {/* Indentation guide markers */}
        {renderIndentationGuides(lineText)}

        {/* Tokens */}
        {lineTokens.length === 0 ? (
          <span className="invisible select-none">{"\u00A0"}</span>
        ) : (
          lineTokens.map((t, idx) => {
            let color = 'text-[#111111]';
            let font = '';
            if (t.type === 'keyword') {
              color = 'text-[#000099] font-bold';
            } else if (t.type === 'type') {
              color = 'text-[#006666] font-semibold';
            } else if (t.type === 'string') {
              color = 'text-[#008000]';
            } else if (t.type === 'number') {
              color = 'text-[#7b0099]';
            } else if (t.type === 'comment') {
              color = 'text-[#707070] italic';
            } else if (t.type === 'boolean') {
              color = 'text-[#000099] font-bold';
            } else if (t.type === 'method') {
              color = 'text-[#004085] font-semibold';
            } else if (t.type === 'property') {
              color = 'text-[#6f42c1]';
            }

            return (
              <span key={idx} className={`${color} ${font}`}>
                {t.text}
              </span>
            );
          })
        )}

        {/* Error Squiggly Underline */}
        {lineDiag && (
          <span
            className="absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none"
            style={{
              backgroundImage:
                lineDiag.severity === 'error'
                  ? 'radial-gradient(circle at 1px 1px, #d32f2f 1px, transparent 0)'
                  : 'radial-gradient(circle at 1px 1px, #f57c00 1px, transparent 0)',
              backgroundSize: '4px 2px',
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative flex flex-1 w-full h-full bg-white overflow-hidden select-none border-t border-l border-[#808080] border-b border-r border-white"
      onContextMenu={handleContextMenu}
    >
      {/* 2002 Java IDE Line Numbers & Breakpoint Gutter */}
      <div
        ref={gutterRef}
        onWheel={handleGutterWheel}
        style={{
          fontFamily: EDITOR_FONT_FAMILY,
          fontSize: '11px',
          paddingTop: '4px',
          paddingBottom: '4px',
          boxSizing: 'border-box',
        }}
        className="w-12 bg-[#ebe9e1] border-r border-[#c0beb6] flex flex-col select-none text-[#707070] shrink-0 overflow-hidden"
      >
        {lines.map((_, idx) => {
          const lineNum = idx + 1;
          const hasBp = breakpoints.has(lineNum);
          const isExec = activeExecutionLine === lineNum;
          const diag = diagnosticMap.get(lineNum);

          return (
            <div
              key={idx}
              onClick={() => onToggleBreakpoint(lineNum)}
              style={{
                height: EDITOR_LINE_HEIGHT,
                lineHeight: EDITOR_LINE_HEIGHT,
                boxSizing: 'border-box',
              }}
              className={`px-1 flex items-center justify-between cursor-pointer hover:bg-[#dedcd4] ${
                isExec ? 'bg-[#3a6ea5] text-white font-bold' : ''
              }`}
              title={
                diag
                  ? `[${diag.code}] ${diag.message}`
                  : hasBp
                  ? `Breakpoint at line ${lineNum}`
                  : `Click to toggle breakpoint at line ${lineNum}`
              }
            >
              <div className="w-3 flex items-center justify-center">
                {isExec ? (
                  <span className="text-yellow-300 font-bold text-xs">▶</span>
                ) : hasBp ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 border border-red-900 shadow-sm" />
                ) : diag ? (
                  <span
                    className={`w-2 h-2 rounded-xs ${
                      diag.severity === 'error' ? 'bg-red-600' : 'bg-amber-500'
                    }`}
                  />
                ) : null}
              </div>
              <span className="pr-1 text-[10px]">{lineNum}</span>
            </div>
          );
        })}
      </div>

      {/* Editor Content Area */}
      <div className="relative flex-1 h-full overflow-hidden bg-white">
        {/* Background Syntax Highlighting Layer */}
        <div
          ref={highlightRef}
          aria-hidden="true"
          style={{
            fontFamily: EDITOR_FONT_FAMILY,
            fontSize: EDITOR_FONT_SIZE,
            lineHeight: EDITOR_LINE_HEIGHT,
            tabSize: 2,
            MozTabSize: 2,
            letterSpacing: '0px',
            wordSpacing: '0px',
            padding: '4px 8px',
            margin: 0,
            border: 'none',
            boxSizing: 'border-box',
            whiteSpace: 'pre',
          }}
          className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden select-none z-0"
        >
          <div style={{ minWidth: '100%', display: 'inline-block' }}>
            {lines.map((line, idx) =>
              renderHighlightedLine(highlightedLines[idx], idx, line)
            )}
          </div>
        </div>

        {/* Real Transparent Textarea on Top for Typing, Selection & Clipboard */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          onClick={updateCursorInfo}
          onKeyUp={updateCursorInfo}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          style={{
            fontFamily: EDITOR_FONT_FAMILY,
            fontSize: EDITOR_FONT_SIZE,
            lineHeight: EDITOR_LINE_HEIGHT,
            tabSize: 2,
            MozTabSize: 2,
            letterSpacing: '0px',
            wordSpacing: '0px',
            padding: '4px 8px',
            margin: 0,
            border: 'none',
            outline: 'none',
            boxSizing: 'border-box',
            whiteSpace: 'pre',
            overflowWrap: 'normal',
          }}
          className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-black selection:bg-[#0a246a] selection:text-white resize-none overflow-auto z-10"
        />
      </div>

      {/* Code Completion (IntelliSense) Autocomplete Popup */}
      {showCodeMagic && magicItems.length > 0 && (
        <div
          className="absolute z-50 bg-[#ffffea] border border-[#808080] shadow-md text-[11px] w-80 select-none swing-bevel-raised"
          style={{
            top: `${magicCoords.top}px`,
            left: `${magicCoords.left}px`,
          }}
        >
          <div className="bg-[#ece9d8] px-1.5 py-0.5 border-b border-[#c0beb6] text-[10px] font-bold text-[#404040] flex justify-between">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#0a246a]"></span>
              CodeMagic Autocomplete
            </span>
            <span className="text-[9px] text-[#707070]">Ctrl+Space | Tab / Enter</span>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {magicItems.map((item, idx) => {
              const isSelected = idx === selectedMagicIdx;
              let kindBadge = 'K';
              let badgeColor = 'bg-blue-100 text-blue-800 border-blue-300';
              if (item.kind === 'type') {
                kindBadge = 'T';
                badgeColor = 'bg-teal-100 text-teal-800 border-teal-300';
              } else if (item.kind === 'function') {
                kindBadge = 'F';
                badgeColor = 'bg-purple-100 text-purple-800 border-purple-300';
              } else if (item.kind === 'method') {
                kindBadge = 'M';
                badgeColor = 'bg-indigo-100 text-indigo-800 border-indigo-300';
              } else if (item.kind === 'property' || item.kind === 'field') {
                kindBadge = item.kind === 'field' ? 'FLD' : 'P';
                badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
              } else if (item.kind === 'class') {
                kindBadge = 'C';
                badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
              } else if (item.kind === 'parameter') {
                kindBadge = 'PAR';
                badgeColor = 'bg-cyan-100 text-cyan-800 border-cyan-300';
              } else if (item.kind === 'variable') {
                kindBadge = 'V';
                badgeColor = 'bg-gray-100 text-gray-800 border-gray-300';
              } else if (item.kind === 'package') {
                kindBadge = 'PKG';
                badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
              } else if (item.kind === 'snippet') {
                kindBadge = 'S';
                badgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
              }

              return (
                <div
                  key={idx}
                  onClick={() => applyCodeMagic(item)}
                  className={`px-1.5 py-0.5 flex items-center gap-1.5 cursor-pointer font-mono text-[11px] ${
                    isSelected
                      ? 'bg-[#0a246a] text-white'
                      : 'hover:bg-[#f0eed8] text-black'
                  }`}
                >
                  <span
                    className={`min-w-[15px] h-3.5 px-0.5 rounded-xs flex items-center justify-center text-[8px] font-bold border ${badgeColor}`}
                  >
                    {kindBadge}
                  </span>
                  <span className="font-semibold truncate">{item.label}</span>
                  {item.packageName && (
                    <span
                      className={`text-[8px] px-1 rounded-xs font-mono truncate ${
                        isSelected ? 'bg-blue-800 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {item.packageName}
                    </span>
                  )}
                  <span
                    className={`text-[9px] truncate ml-auto ${
                      isSelected ? 'text-gray-200' : 'text-gray-500'
                    }`}
                  >
                    {item.detail}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="p-1.5 border-t border-[#d0ceb6] text-[10px] text-[#333] bg-[#f9f8f2] space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {magicItems[selectedMagicIdx]?.packageName && (
                <span className="text-[8.5px] px-1 py-0.2 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xs font-mono font-bold">
                  package {magicItems[selectedMagicIdx]?.packageName}
                </span>
              )}
              {magicItems[selectedMagicIdx]?.signature && (
                <div className="font-mono text-[10px] text-[#000080] font-bold truncate">
                  {magicItems[selectedMagicIdx]?.signature}
                </div>
              )}
            </div>
            <div className="text-[#555] leading-tight text-[10px]">
              {magicItems[selectedMagicIdx]?.documentation || 'Press Tab or Enter to insert symbol'}
            </div>
          </div>
        </div>
      )}

      {/* Advanced Technical Tooltip Inspector */}
      {!showCodeMagic && hoverInfo && hoverCoords && (
        <div
          className="absolute z-50 bg-[#ffffea] border border-[#7f9db9] shadow-lg text-[11px] w-96 select-none swing-bevel-raised pointer-events-none"
          style={{
            top: `${hoverCoords.y}px`,
            left: `${hoverCoords.x}px`,
          }}
        >
          {/* Header Bar */}
          <div className="bg-[#ece9d8] px-2 py-0.5 border-b border-[#c0beb6] text-[10px] flex items-center justify-between font-sans">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-[#0a246a] uppercase tracking-wider text-[9px] bg-[#dbe4f4] px-1 py-0.2 rounded-xs border border-[#b8c9e5]">
                {hoverInfo.kind}
              </span>
              {hoverInfo.packageName && (
                <span className="text-[#0e6251] font-mono text-[9px] font-bold bg-[#d4efdf] px-1 py-0.2 rounded-xs border border-[#a9dfbf]">
                  pkg: {hoverInfo.packageName}
                </span>
              )}
              {hoverInfo.declaredAt && (
                <span className="text-[#555] text-[9px] font-mono">
                  {hoverInfo.declaredAt}
                </span>
              )}
              {hoverInfo.enclosingScope && (
                <span className="text-[#666] text-[9px] italic">
                  in {hoverInfo.enclosingScope}
                </span>
              )}
            </div>
            <span className="text-[9px] text-[#777] font-mono">ECMA-262 4th Ed.</span>
          </div>

          <div className="p-2 space-y-2">
            {/* Signature or Title */}
            {hoverInfo.signature ? (
              <div className="font-mono text-[11px] font-bold text-[#000080] bg-[#f0f4fc] px-2 py-1 rounded-xs border border-[#d0d8e8] shadow-2xs whitespace-pre-wrap break-all leading-snug">
                {hoverInfo.signature}
              </div>
            ) : hoverInfo.title ? (
              <div className="font-bold text-[11px] text-[#0a246a]">
                {hoverInfo.title}
              </div>
            ) : null}

            {/* Diagnostic Alert if compiler reported an error/warning */}
            {hoverInfo.diagnostic && (
              <div
                className={`text-[10px] px-2 py-1 rounded-xs border font-sans ${
                  hoverInfo.diagnostic.severity === 'error'
                    ? 'bg-[#ffebe8] text-[#c00] border-[#f5c6cb]'
                    : 'bg-[#fff8e5] text-[#856404] border-[#ffeeba]'
                }`}
              >
                <div className="font-bold uppercase tracking-wider text-[9px]">
                  [{hoverInfo.diagnostic.severity.toUpperCase()} {hoverInfo.diagnostic.code}]
                </div>
                <div>{hoverInfo.diagnostic.message}</div>
              </div>
            )}

            {/* Structured Technical Metadata Badges (High-Contrast Colored Information) */}
            {hoverInfo.technicalBadges && hoverInfo.technicalBadges.length > 0 && (
              <div className="space-y-1">
                <div className="text-[8.5px] font-bold uppercase tracking-wider text-[#475569] flex items-center justify-between border-b border-[#e2e8f0] pb-0.5">
                  <span>Technical Specification</span>
                  <span className="font-mono font-normal text-[#64748b]">{hoverInfo.technicalBadges.length} attributes</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {hoverInfo.technicalBadges.map((badge, bIdx) => {
                    let badgeCls = 'bg-[#f8fafc] text-[#334155] border-[#cbd5e1]';
                    if (badge.category === 'storage') {
                      badgeCls = 'bg-[#e7f1ff] text-[#084298] border-[#9ec5fe]';
                    } else if (badge.category === 'type') {
                      badgeCls = 'bg-[#e6f9f0] text-[#0f5132] border-[#a3e6cb]';
                    } else if (badge.category === 'scope') {
                      badgeCls = 'bg-[#fff8e6] text-[#856404] border-[#ffe8a1]';
                    } else if (badge.category === 'modifier') {
                      badgeCls = 'bg-[#f4e8ff] text-[#581c87] border-[#d8b4fe]';
                    } else if (badge.category === 'timing') {
                      badgeCls = 'bg-[#ffe4e6] text-[#881337] border-[#fecdd3]';
                    } else if (badge.category === 'spec') {
                      badgeCls = 'bg-[#f1f5f9] text-[#1e293b] border-[#cbd5e1]';
                    }

                    return (
                      <div
                        key={bIdx}
                        className={`px-1.5 py-0.5 rounded-xs border text-[9.5px] flex items-center justify-between gap-1 leading-tight ${badgeCls}`}
                      >
                        <span className="text-[8px] uppercase font-bold tracking-wider opacity-80 whitespace-nowrap">
                          {badge.label}:
                        </span>
                        <span className="font-mono text-[9px] font-bold truncate text-right">
                          {badge.value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Formal Parameter Breakdown */}
            {hoverInfo.parameters && hoverInfo.parameters.length > 0 && (
              <div className="bg-[#fcfbf7] border border-[#e5e5d0] p-1.5 rounded-xs space-y-0.5">
                <div className="text-[8.5px] font-bold uppercase tracking-wider text-[#0a246a] border-b border-[#e5e5d0] pb-0.5 mb-1 flex justify-between">
                  <span>Parameters</span>
                  <span className="font-mono text-[8px] text-[#666]">{hoverInfo.parameters.length} defined</span>
                </div>
                <div className="space-y-0.5 font-mono text-[10px]">
                  {hoverInfo.parameters.map((p, pIdx) => (
                    <div key={pIdx} className="flex items-baseline gap-1 text-[9.5px]">
                      <span className="font-bold text-[#000080]">{p.name}</span>
                      <span className="text-[#008080] font-semibold">: {p.type}</span>
                      {p.optional && <span className="text-[#888] text-[8.5px] font-sans">(opt)</span>}
                      {p.description && <span className="text-[#444] font-sans text-[9px] ml-1 truncate">- {p.description}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Class Members Breakdown */}
            {hoverInfo.members && hoverInfo.members.length > 0 && (
              <div className="bg-[#fcfbf7] border border-[#e5e5d0] p-1.5 rounded-xs space-y-0.5 max-h-28 overflow-y-auto">
                <div className="text-[8.5px] font-bold uppercase tracking-wider text-[#0a246a] border-b border-[#e5e5d0] pb-0.5 mb-1 flex justify-between">
                  <span>Declared Members</span>
                  <span className="font-mono text-[8px] text-[#666]">{hoverInfo.members.length} items</span>
                </div>
                <div className="space-y-0.5 font-mono text-[9.5px]">
                  {hoverInfo.members.map((m, mIdx) => (
                    <div key={mIdx} className="flex items-center gap-1 text-[9.5px] truncate">
                      <span
                        className={`w-3 h-3 flex items-center justify-center text-[7.5px] font-bold rounded-xs border ${
                          m.kind === 'method'
                            ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        {m.kind === 'method' ? 'M' : 'F'}
                      </span>
                      <span className="font-semibold text-[#222] truncate">{m.signature || m.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Documentation */}
            {hoverInfo.documentation && (
              <div className="text-[10.5px] text-[#222] font-sans leading-snug bg-white/70 p-1.5 rounded-xs border border-[#e8e6d8]">
                {hoverInfo.documentation}
              </div>
            )}

            {/* Spec Reference */}
            {hoverInfo.specNote && (
              <div className="text-[9px] text-[#666] border-t border-[#e5e5d0] pt-1 italic font-sans flex items-center justify-between">
                <span>Ref: {hoverInfo.specNote}</span>
                <span className="text-[#999] font-mono">ECMA-262 4th Ed.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2002 Java Swing Retro Context Menu (JPopupMenu) */}
      {contextMenu.visible && (
        <div
          className="absolute z-50 bg-[#d4d0c8] swing-bevel-raised-strong shadow-lg py-0.5 w-52 select-none text-[11px]"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="px-3 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer flex justify-between"
            onClick={() => {
              document.execCommand('cut');
              setContextMenu({ visible: false, x: 0, y: 0 });
            }}
          >
            <span>Cut</span>
            <span className="text-gray-500 hover:text-white text-[10px]">Ctrl+X</span>
          </div>
          <div
            className="px-3 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer flex justify-between"
            onClick={() => {
              document.execCommand('copy');
              setContextMenu({ visible: false, x: 0, y: 0 });
            }}
          >
            <span>Copy</span>
            <span className="text-gray-500 hover:text-white text-[10px]">Ctrl+C</span>
          </div>
          <div
            className="px-3 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer flex justify-between"
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                document.execCommand('insertText', false, text);
              } catch (e) {
                // clipboard fallback
              }
              setContextMenu({ visible: false, x: 0, y: 0 });
            }}
          >
            <span>Paste</span>
            <span className="text-gray-500 hover:text-white text-[10px]">Ctrl+V</span>
          </div>

          <div className="border-t border-[#808080] border-b border-white my-0.5" />

          <div
            className="px-3 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer flex justify-between"
            onClick={() => {
              triggerCodeMagicManual();
              setContextMenu({ visible: false, x: 0, y: 0 });
            }}
          >
            <span className="font-semibold">Code Completion</span>
            <span className="text-gray-500 hover:text-white text-[10px]">Ctrl+Space</span>
          </div>
          <div
            className="px-3 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer flex justify-between"
            onClick={() => {
              onToggleBreakpoint(cursorPos.line);
              setContextMenu({ visible: false, x: 0, y: 0 });
            }}
          >
            <span>Toggle Breakpoint</span>
            <span className="text-gray-500 hover:text-white text-[10px]">F9</span>
          </div>

          <div className="border-t border-[#808080] border-b border-white my-0.5" />

          <div
            className="px-3 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer flex justify-between"
            onClick={() => {
              if (onCompileRequest) onCompileRequest();
              setContextMenu({ visible: false, x: 0, y: 0 });
            }}
          >
            <span>Compile to Binary (.es4b)</span>
            <span className="text-gray-500 hover:text-white text-[10px]">F7</span>
          </div>
          <div
            className="px-3 py-1 hover:bg-[#0a246a] hover:text-white cursor-pointer flex justify-between font-bold"
            onClick={() => {
              if (onRunRequest) onRunRequest();
              setContextMenu({ visible: false, x: 0, y: 0 });
            }}
          >
            <span>Run in ES4 VM</span>
            <span className="text-gray-500 hover:text-white text-[10px]">F5</span>
          </div>
        </div>
      )}
    </div>
  );
};
