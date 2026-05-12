'use client'

import { useRef, useEffect } from 'react'
import type { Citation as CitationType } from '@/types'
import { isOfficialSource, indexedAgo, isStale } from '@/lib/api'

interface Props {
  citation: CitationType
  index: number
  expanded: boolean
  flash: boolean
  onToggle: () => void
  refCallback: (el: HTMLDivElement | null) => void
}

export default function Citation({ citation, index, expanded, flash, onToggle, refCallback }: Props) {
  const elRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    refCallback(elRef.current)
  }, [refCallback])

  const official  = isOfficialSource(citation.source)
  const ago       = indexedAgo(citation.indexed_at)
  const stale     = isStale(citation.indexed_at)
  const dateLabel = citation.date ? `${citation.date}${ago ? ` · ${ago} ago` : ''}` : ago ? `${ago} ago` : ''

  return (
    <div
      ref={elRef}
      className="cite"
      data-on={expanded ? '1' : '0'}
      data-flash={flash ? '1' : '0'}
      onClick={onToggle}
    >
      <div className="cite-head">
        <span className="cite-num">{index + 1}</span>
        <span className="cite-src" data-type={official ? 'official' : 'news'}>
          <i />
          {citation.source}
        </span>
        <span className="cite-date">{dateLabel}</span>
        <span />
      </div>

      <div className="cite-body">
        {citation.excerpt && (
          <div className="cite-excerpt">{citation.excerpt}</div>
        )}
        {stale && (
          <div className="cite-stale">⚠ Data may be stale</div>
        )}
        <div className="cite-foot">
          <a
            href={citation.url}
            target="_blank"
            rel="noreferrer noopener"
            onClick={(e) => e.stopPropagation()}
          >
            Read original →
          </a>
          <span style={{ color: 'var(--rule)' }}>·</span>
          <span>{official ? 'Official source' : 'News source'}</span>
        </div>
      </div>
    </div>
  )
}
