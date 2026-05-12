'use client'

import type { AppView } from '@/types'

interface Props {
  view: AppView
  onViewChange: (v: AppView) => void
}

export default function TopBar({ view, onViewChange }: Props) {
  return (
    <header className="topbar">
      <a
        className="logo"
        href="#"
        onClick={(e) => { e.preventDefault(); onViewChange('check') }}
      >
        <span className="logo-mark" aria-hidden="true">
          <span className="logo-glyph">ನ</span>
          <span className="logo-tick">
            <svg viewBox="0 0 8 8" fill="none">
              <path d="M1.5 4.2 L3.2 5.8 L6.5 2.2"
                stroke="#FFFFFF" strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </span>
        <span className="logo-name">NammaSatya</span>
        <span className="logo-tag">BLR · Truth check</span>
      </a>

      <nav className="nav">
        <button
          data-on={view === 'check' ? '1' : '0'}
          onClick={() => onViewChange('check')}
        >
          Check a claim
        </button>
        <button
          data-on={view === 'dashboard' ? '1' : '0'}
          onClick={() => onViewChange('dashboard')}
        >
          Operations
        </button>
      </nav>
    </header>
  )
}
