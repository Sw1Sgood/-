import type { LessonBlock, LessonSection } from '../content/types'

function Block({ block }: { block: LessonBlock }) {
  switch (block.type) {
    case 'p':
      return <p>{block.text}</p>
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul'
      return (
        <Tag className={`${block.ordered ? 'list-decimal' : 'list-disc'} space-y-1.5 pl-5`}>
          {block.items.map((item) => <li key={item}>{item}</li>)}
        </Tag>
      )
    }
    case 'table':
      return (
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full border-collapse text-sm">
            <caption className="bg-surface-2 px-3 py-2 text-left font-medium">{block.caption}</caption>
            <thead className="text-left">
              <tr>
                {block.head.map((h) => <th key={h} scope="col" className="min-w-36 border-y border-line px-3 py-2 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="align-top">
                  {row.map((cell, j) => (
                    <td key={j} className={`border-b border-line px-3 py-2 ${j === 0 ? 'font-medium' : ''}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'example':
      return (
        <aside className="rounded-md border-l-4 border-accent bg-accent-soft/60 px-4 py-3">
          <div className="text-xs font-medium tracking-wide text-accent uppercase">Учебный пример · вымышленный, числа условные</div>
          <div className="mt-1 font-semibold">{block.title}</div>
          <div className="prose-text mt-2">
            {block.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </aside>
      )
    case 'case':
      return (
        <aside className="rounded-md border-l-4 border-good bg-good-soft/60 px-4 py-3">
          <div className="text-xs font-medium tracking-wide text-good uppercase">Из реальной практики</div>
          <div className="mt-1 font-semibold">{block.title}</div>
          <div className="prose-text mt-2">
            {block.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <p className="mt-2 text-xs text-muted">Где проверить: {block.source}</p>
        </aside>
      )
    case 'note':
      return (
        <aside className={`rounded-md px-4 py-3 ${block.tone === 'warn' ? 'bg-warn-soft text-ink' : 'bg-surface-2'}`}>
          <span className="font-medium">{block.tone === 'warn' ? 'Важно: ' : 'Вывод: '}</span>
          {block.text}
        </aside>
      )
  }
}

/** Оглавление и разделы развёрнутого урока. */
export function LessonBody({ sections }: { sections: LessonSection[] }) {
  return (
    <div>
      <nav aria-label="Содержание урока" className="mb-6 rounded-md bg-surface-2 p-4">
        <div className="mb-2 text-sm font-medium">Содержание</div>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {sections.map((s) => (
            <li key={s.id}><a href={`#${s.id}`} className="link" onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' }) }}>{s.title}</a></li>
          ))}
        </ol>
      </nav>
      <div className="space-y-8">
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-20" aria-labelledby={`${s.id}-h`}>
            <h3 id={`${s.id}-h`} className="mb-3 text-lg font-semibold">{i + 1}. {s.title}</h3>
            <div className="space-y-4 text-[15px] leading-relaxed">
              {s.blocks.map((b, j) => (
                <div key={j} className={b.type === 'table' ? '' : 'max-w-prose'}>
                  <Block block={b} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
