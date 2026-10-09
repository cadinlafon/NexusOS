import { Fragment, type ReactNode } from 'react'

// Models answer in light Markdown. This draws the common parts (paragraphs,
// lists, headings, bold, italics and code) as React elements. Nothing is ever
// inserted as HTML, so a reply cannot inject markup into NEXUS.

const INLINE = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\s][^*\n]*\*)/g

function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, index) => {
    if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>
    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>
    return <Fragment key={index}>{part}</Fragment>
  })
}

const BULLET = /^\s*[-*•]\s+/
const NUMBERED = /^\s*\d+[.)]\s+/
const HEADING = /^#{1,6}\s+/
const TABLE_ROW = /^\s*\|.*\|\s*$/
const TABLE_RULE = /^\s*\|[\s:|-]+\|\s*$/

function blocks(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const lines = text.split('\n')
  let index = 0

  while (index < lines.length) {
    const line = lines[index]

    if (!line.trim()) {
      index++
    } else if (TABLE_ROW.test(line) && TABLE_RULE.test(lines[index + 1] ?? '')) {
      // A Markdown table: a header row, a row of dashes, then the body.
      const start = index
      const cells = (row: string) => row.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim())
      const head = cells(line)
      index += 2
      const body: string[][] = []
      while (index < lines.length && TABLE_ROW.test(lines[index])) body.push(cells(lines[index++]))
      out.push(
        <div key={start} className="ai-text__table">
          <table>
            <thead>
              <tr>
                {head.map((cell, i) => (
                  <th key={i}>{inline(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, i) => (
                    <td key={i}>{inline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
    } else if (HEADING.test(line)) {
      out.push(<h4 key={index}>{inline(line.replace(HEADING, ''))}</h4>)
      index++
    } else if (BULLET.test(line) || NUMBERED.test(line)) {
      const pattern = BULLET.test(line) ? BULLET : NUMBERED
      const List = pattern === BULLET ? 'ul' : 'ol'
      const start = index
      const items: ReactNode[] = []
      while (index < lines.length && pattern.test(lines[index])) {
        items.push(<li key={index}>{inline(lines[index].replace(pattern, ''))}</li>)
        index++
      }
      out.push(<List key={start}>{items}</List>)
    } else {
      const start = index
      // Always takes this line, so a line no other rule wants cannot stall the loop.
      const paragraph: string[] = [lines[index++]]
      while (
        index < lines.length &&
        lines[index].trim() &&
        !HEADING.test(lines[index]) &&
        !TABLE_ROW.test(lines[index]) &&
        !BULLET.test(lines[index]) &&
        !NUMBERED.test(lines[index])
      ) {
        paragraph.push(lines[index])
        index++
      }
      out.push(<p key={start}>{inline(paragraph.join('\n'))}</p>)
    }
  }
  return out
}

/** An AI reply, with code blocks kept apart from running text. */
export function RichText({ text }: { text: string }) {
  // Odd pieces sit between ``` fences. A reply still arriving may not have closed its last one yet.
  const pieces = text.split('```')
  return (
    <div className="ai-text">
      {pieces.map((piece, index) =>
        index % 2 === 1 ? (
          <pre key={index}>
            <code>{piece.replace(/^[\w+-]*\n/, '').replace(/\n$/, '')}</code>
          </pre>
        ) : (
          <Fragment key={index}>{blocks(piece)}</Fragment>
        ),
      )}
    </div>
  )
}
