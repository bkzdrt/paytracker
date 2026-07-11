import { useState } from 'react'
import { useApp } from '../app/store'
import { haptics } from '../services/haptics'
import { GUIDE_SECTIONS } from '../domain/guideContent'

function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)
  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      resolve()
    } catch (e) { reject(e) }
  })
}

function CopyButton({ text, label, copiedLabel, small }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className={`copy-btn${small ? ' copy-btn--sm' : ''}${copied ? ' copy-btn--done' : ''}`}
      onClick={e => {
        e.stopPropagation()
        copyText(text).then(() => {
          haptics.success()
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        }).catch(() => {})
      }}
    >
      {copied ? copiedLabel : label}
    </button>
  )
}

export default function Guide() {
  const { t } = useApp()
  const [openId, setOpenId] = useState(null)
  const g = t.guide

  return (
    <div className="page page--guide">
      <h1 className="page-title">{g.title}</h1>
      <p className="muted guide-intro">{g.intro}</p>

      {GUIDE_SECTIONS.map(section => {
        const isOpen = openId === section.id
        return (
          <div key={section.id} className={`guide-section${isOpen ? ' guide-section--open' : ''}`}>
            <button type="button" className="guide-section__header"
              onClick={() => { haptics.light(); setOpenId(prev => (prev === section.id ? null : section.id)) }}>
              <span className="guide-section__icon">{section.icon}</span>
              <span className="guide-section__title">{section.title}</span>
              <span className={`guide-section__chevron${isOpen ? ' guide-section__chevron--open' : ''}`}>›</span>
            </button>
            {isOpen && (
              <div className="guide-section__body">
                {section.blocks.map((block, i) => (
                  <div key={i} className="guide-block">
                    <p className="guide-block__text">{block}</p>
                    <CopyButton text={block} label={g.copy} copiedLabel={g.copied} small />
                  </div>
                ))}
                <CopyButton
                  text={section.title + '\n\n' + section.blocks.join('\n\n')}
                  label={g.copyAll}
                  copiedLabel={g.copied}
                />
              </div>
            )}
          </div>
        )
      })}

      <p className="muted guide-disclaimer">{g.disclaimer}</p>
    </div>
  )
}
