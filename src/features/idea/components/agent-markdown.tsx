import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Segment = { text: string; bold: boolean; italic: boolean };

export type Block
  = | { kind: 'paragraph'; text: string }
    | { kind: 'hr' }
    | { kind: 'heading'; level: number; text: string }
    | { kind: 'table'; headers: string[]; rows: string[][] };

// ---------------------------------------------------------------------------
// Inline markdown parser — bold, italic, bold+italic
// ---------------------------------------------------------------------------

export function parseMarkdownInline(raw: string): Segment[] {
  const segments: Segment[] = [];
  const RE = /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_/gs;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = RE.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: raw.slice(lastIndex, match.index), bold: false, italic: false });
    }
    if (match[1] !== undefined) {
      segments.push({ text: match[1], bold: true, italic: true });
    }
    else if (match[2] !== undefined) {
      segments.push({ text: match[2], bold: true, italic: false });
    }
    else if (match[3] !== undefined || match[4] !== undefined) {
      segments.push({ text: (match[3] ?? match[4])!, bold: false, italic: true });
    }
    lastIndex = RE.lastIndex;
  }
  if (lastIndex < raw.length) {
    segments.push({ text: raw.slice(lastIndex), bold: false, italic: false });
  }
  return segments.length > 0 ? segments : [{ text: raw, bold: false, italic: false }];
}

// ---------------------------------------------------------------------------
// Block-level parser — hr, headings, tables, paragraphs
// ---------------------------------------------------------------------------

function parseTableRow(line: string): string[] {
  return line.split('|').slice(1, -1).map(c => c.trim());
}

export function parseBlocks(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Horizontal rule: ---, ***, ___
    if (/^[-*_]{3,}\s*$/.test(trimmed) && trimmed.length <= 6) {
      blocks.push({ kind: 'hr' });
      i++;
      continue;
    }

    // Heading: # / ## / ###
    const headingMatch = /^(#{1,3})\s+(.+)/.exec(trimmed);
    if (headingMatch) {
      blocks.push({ kind: 'heading', level: headingMatch[1].length, text: headingMatch[2] });
      i++;
      continue;
    }

    // Table: consecutive lines starting with |
    if (trimmed.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2) {
        const [headerLine, separatorLine, ...dataLines] = tableLines;
        if (/^[\s|:-]+$/.test(separatorLine)) {
          blocks.push({
            kind: 'table',
            headers: parseTableRow(headerLine),
            rows: dataLines.map(parseTableRow),
          });
          continue;
        }
      }
      // Not a real table — treat as paragraph
      blocks.push({ kind: 'paragraph', text: tableLines.join('\n') });
      continue;
    }

    // Paragraph — collect non-special lines
    const paraLines: string[] = [];
    while (i < lines.length) {
      const l = lines[i];
      const t = l.trim();
      if (/^[-*_]{3,}\s*$/.test(t) && t.length <= 6)
        break;
      if (/^#{1,3}\s+/.test(t))
        break;
      if (t.startsWith('|'))
        break;
      paraLines.push(l);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ kind: 'paragraph', text: paraLines.join('\n') });
    }
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// InlineText — renders a single line with inline bold/italic
// ---------------------------------------------------------------------------

export function InlineText({ text, baseStyle }: { text: string; baseStyle: object }) {
  const segments = parseMarkdownInline(text);
  if (segments.length === 1 && !segments[0].bold && !segments[0].italic) {
    return <Text style={baseStyle}>{text}</Text>;
  }
  return (
    <Text>
      {segments.map((seg, idx) => (
        <Text
          key={idx}
          style={[
            baseStyle,
            seg.bold && { fontWeight: '700' as const },
            seg.italic && { fontStyle: 'italic' as const },
          ]}
        >
          {seg.text}
        </Text>
      ))}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// AgentMarkdown — block-level renderer
// ---------------------------------------------------------------------------

export function AgentMarkdown({ text, baseStyle }: { text: string; baseStyle: object }) {
  const blocks = parseBlocks(text);
  return (
    <>
      {blocks.map((block, i) => {
        if (block.kind === 'hr') {
          return <View key={i} style={styles.hr} />;
        }
        if (block.kind === 'heading') {
          const headingStyle = block.level === 1 ? styles.h1 : block.level === 2 ? styles.h2 : styles.h3;
          return <InlineText key={i} text={block.text} baseStyle={headingStyle} />;
        }
        if (block.kind === 'table') {
          return (
            <View key={i} style={styles.table}>
              <View style={styles.tableRow}>
                {block.headers.map((h, ci) => (
                  <View key={ci} style={[styles.tableCell, styles.tableHeaderCell]}>
                    <InlineText text={h} baseStyle={styles.tableHeaderText} />
                  </View>
                ))}
              </View>
              {block.rows.map((row, ri) => (
                <View key={ri} style={[styles.tableRow, ri % 2 === 1 && styles.tableRowAlt]}>
                  {row.map((cell, ci) => (
                    <View key={ci} style={styles.tableCell}>
                      <InlineText text={cell} baseStyle={styles.tableCellText} />
                    </View>
                  ))}
                </View>
              ))}
            </View>
          );
        }
        return <InlineText key={i} text={block.text} baseStyle={baseStyle} />;
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  hr: {
    borderBottomColor: '#D4C8B8',
    borderBottomWidth: 1,
    marginVertical: 10,
    opacity: 0.6,
  },
  h1: {
    color: '#2C1810',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 4,
    marginTop: 10,
  },
  h2: {
    color: '#2C1810',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 4,
    marginTop: 8,
  },
  h3: {
    color: '#5C3D28',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 2,
    marginTop: 6,
  },
  table: {
    borderColor: '#E0D8CC',
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 8,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableRowAlt: {
    backgroundColor: '#F9F5EE',
  },
  tableHeaderCell: {
    backgroundColor: '#F0E8DC',
  },
  tableCell: {
    borderColor: '#E0D8CC',
    borderRightWidth: 1,
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tableHeaderText: {
    color: '#2C1810',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tableCellText: {
    color: '#3D2010',
    fontSize: 12,
    lineHeight: 18,
  },
});
