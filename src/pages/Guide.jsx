import { useState } from 'react'
import { GUIDE_SECTIONS } from '../utils/guideContent'

function copyText(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text)
  }
  // Fallback for older WebViews
  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      resolve()
    } catch (e) { reject(e) }
  })
}

function CopyButton({ text, label, copiedLabel, haptic, small }) {
  const [copied, setCopied] = useState(false)

  function handleCopy(e) {
    e.stopPropagation()
    copyText(text).then(() => {
      haptic?.success?.()
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    }).catch(() => {})
  }

  return (
    <button
      className={`guide-copy-btn${small ? ' guide-copy-btn--small' : ''}${copied ? ' guide-copy-btn--copied' : ''}`}
      onClick={handleCopy}
      aria-label={label}
    >
      {copied ? copiedLabel : label}
    </button>
  )
}

export default function Guide({ t, haptic }) {
  const [openId, setOpenId] = useState(null)
  const g = t.guide

  function toggle(id) {
    haptic?.selection?.()
    setOpenId(prev => (prev === id ? null : id))
  }

  return (
    <div className="page guide-page">
      <h1 className="page-title">{g.title}</h1>
      <p className="guide-intro">{g.intro}</p>

      {GUIDE_SECTIONS.map(section => {
        const isOpen = openId === section.id
        const fullText = section.title + '\n\n' + section.blocks.join('\n\n')
        return (
          <div key={section.id} className={`guide-section${isOpen ? ' guide-section--open' : ''}`}>
            <button className="guide-section__header" onClick={() => toggle(section.id)}>
              <span className="guide-section__icon">{section.icon}</span>
              <span className="guide-section__title">{section.title}</span>
              <span className={`guide-section__chevron${isOpen ? ' guide-section__chevron--open' : ''}`}>›</span>
            </button>

            {isOpen && (
              <div className="guide-section__body">
                {section.blocks.map((block, i) => (
                  <div key={i} className="guide-block">
                    <p className="guide-block__text">{block}</p>
                    <CopyButton
                      text={block}
                      label={g.copy}
                      copiedLabel={g.copied}
                      haptic={haptic}
                      small
                    />
                  </div>
                ))}
                <CopyButton
                  text={fullText}
                  label={g.copyAll}
                  copiedLabel={g.copied}
                  haptic={haptic}
                />
              </div>
            )}
          </div>
        )
      })}

      <p className="guide-disclaimer">{g.disclaimer}</p>
    </div>
  )
}
