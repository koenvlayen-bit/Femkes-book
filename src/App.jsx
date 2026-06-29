import { useState, useEffect, useRef } from 'react'
import { getData, setData } from './jsonbin.js'
import BOOK_TEXT from './bookText.js'
import './App.css'

const BOOK_NAME = 'Voor de zon opkwam'
const BOOK_DATE = '28 juni 2026'
const USERS = {
  'Femke Janssens': { role: 'writer', displayName: 'Femke' },
  'Koen Vlayen':    { role: 'editor', displayName: 'Koen' },
}

function BookContent({ text }) {
  const lines = text.split('\n')
  const els = []
  let i = 0, k = 0
  const syn = []
  while (i < lines.length && !lines[i].startsWith('Proloog') && !lines[i].match(/^\d+[\.\s]*$/)) {
    if (lines[i].trim()) syn.push(lines[i].trim())
    i++
  }
  if (syn.length) els.push(<div key={k++} className="book-synopsis">{syn.join(' ')}</div>)
  while (i < lines.length) {
    const t = lines[i].trim()
    if (!t) { i++; continue }
    if (t.startsWith('**') || t.startsWith('BREAKING')) {
      els.push(<div key={k++} className="breaking-news">{t.replace(/\*\*/g, '')}</div>)
      i++; continue
    }
    if (t.match(/^(Proloog|Epiloog|Notities|\d+\.?)\.?\s*$/)) {
      const raw = t.replace('.', '').trim()
      const label = raw === 'Proloog' ? 'Proloog' : raw === 'Epiloog' ? 'Epiloog' : raw === 'Notities' ? 'Notities' : `Hoofdstuk ${raw}`
      els.push(<div key={k++} className="chapter-heading">{label}</div>)
      i++
      if (i < lines.length && lines[i].trim().match(/^\d+\s+\w+/)) {
        els.push(<div key={k++} className="chapter-sub">{lines[i].trim()}</div>)
        i++
      }
      continue
    }
    if (t.match(/^\d+\s+\w+(\s+\d{4})?\s+\d+[.:]/)) {
      els.push(<div key={k++} className="chapter-sub">{t}</div>)
      i++; continue
    }
    els.push(<p key={k++} className="book-para">{t}</p>)
    i++
  }
  return <>{els}</>
}

function Login({ onLogin }) {
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  function doLogin() {
    const t = name.trim()
    if (!t) { setErr('Vul je naam in.'); return }
    setErr('')
    onLogin(t)
  }
  return (
    <div className="login-bg">
      <div className="login-overlay" />
      <div className="login-card">
        <div className="login-eyebrow">Een roman van Femke Janssens</div>
        <div className="login-title">Voor de zon opkwam</div>
        <div className="login-sub">Vul je naam in om het verhaal te lezen</div>
        <label className="login-label">Jouw naam</label>
        <input
          className="login-input" type="text" placeholder="Naam Achternaam"
          value={name}
          onChange={e => { setName(e.target.value); setErr('') }}
          onKeyDown={e => e.key === 'Enter' && doLogin()}
          autoFocus
        />
        <button className="login-btn" onClick={doLogin}>Betreden</button>
        {name.trim() && <div className="login-confirm">Inloggen als: {name.trim()}</div>}
        {err && <div className="login-err">{err}</div>}
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [viewingEnabled, setViewingEnabled] = useState(true)
  const [suggestions, setSuggestions] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [overrideBook, setOverrideBook] = useState(null)
  const fileRef = useRef()

  const ui = user ? (USERS[user] || { role: 'reader', displayName: user.split(' ')[0] }) : null
  const book = overrideBook || { content: BOOK_TEXT, name: BOOK_NAME, date: BOOK_DATE }

  useEffect(() => {
    getData().then(d => {
      if (d.viewingEnabled !== undefined) setViewingEnabled(d.viewingEnabled)
      if (d.suggestions) setSuggestions(d.suggestions)
      if (d.overrideBook) setOverrideBook(d.overrideBook)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const canView = ui?.role === 'writer' || ui?.role === 'editor' || viewingEnabled

  async function toggleViewing() {
    const next = !viewingEnabled
    setViewingEnabled(next); setSaving(true)
    try { const d = await getData(); await setData({ ...d, viewingEnabled: next }) }
    finally { setSaving(false) }
  }

  async function sendSuggestion() {
    if (!draft.trim()) return
    const s = { id: Date.now(), text: draft.trim(),
      date: new Date().toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' }),
      time: new Date().toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' }) }
    const updated = [s, ...suggestions]
    setSuggestions(updated); setDraft(''); setSaving(true)
    try { const d = await getData(); await setData({ ...d, suggestions: updated }) }
    finally { setSaving(false) }
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]; if (!file) return
    setUploadStatus('Lezen...')
    try {
      const text = await file.text()
      const ob = { content: text, name: file.name.replace(/\.(docx|txt)$/i, ''),
        date: new Date().toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' }) }
      setOverrideBook(ob)
      const d = await getData(); await setData({ ...d, overrideBook: ob })
      setUploadStatus('✓ Geüpload op ' + ob.date)
    } catch { setUploadStatus('Fout bij uploaden.') }
    e.target.value = ''
  }

  if (!user) return <Login onLogin={setUser} />
  if (loading) return <div className="loading">Laden…</div>

  const roleLabel = ui.role === 'writer' ? 'Schrijver' : ui.role === 'editor' ? 'Redacteur' : 'Lezer'

  return (
    <div className="app">
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-title">Voor de zon opkwam</span>
          <span className="topbar-divider" />
          <span className="book-label">Femke Janssens</span>
        </div>
        <div className="topbar-right">
          {saving && <span className="saving-indicator">Opslaan…</span>}
          <div className={`badge badge-${ui.role}`}>
            <div className="badge-dot" />{ui.displayName} · {roleLabel}
          </div>
          <button className="logout-btn" onClick={() => setUser(null)}>Afmelden</button>
        </div>
      </div>
      <div className="main">
        <div className="reading-area">
          <div className="reading-area-inner">
            {ui.role === 'writer' && (
              <div className="writer-panel">
                <h3>Schrijversbeheer</h3>
                <div className="panel-row">
                  <label className="file-label" htmlFor="txt-upload">📄 Nieuw manuscript (.txt)</label>
                  <input id="txt-upload" className="file-input" type="file" accept=".txt" ref={fileRef} onChange={handleFileUpload} />
                  {overrideBook && <span className="file-name">{overrideBook.name}</span>}
                </div>
                {uploadStatus && <div className={`upload-status ${uploadStatus.startsWith('Fout') ? 'error' : ''}`}>{uploadStatus}</div>}
                <div className="toggle-row">
                  <button className={`toggle ${viewingEnabled ? 'on' : ''}`} onClick={toggleViewing} />
                  <span className="toggle-label">Anderen mogen lezen</span>
                  <span className="status-text">{viewingEnabled ? 'Zichtbaar voor iedereen' : 'Enkel jij & Koen'}</span>
                </div>
              </div>
            )}
            {!canView ? (
              <div className="locked-state">
                <div className="locked-icon">🔒</div>
                <h3>Nog niet beschikbaar</h3>
                <p>Femke heeft het lezen tijdelijk uitgeschakeld.</p>
              </div>
            ) : (
              <>
                <div className="book-header">
                  <div className="book-title">{book.name}</div>
                  <div className="book-author">door Femke Janssens</div>
                  <div className="book-date">Versie {book.date}</div>
                </div>
                <BookContent text={book.content} />
              </>
            )}
          </div>
        </div>
        {(ui.role === 'editor' || ui.role === 'writer') && (
          <div className="editor-sidebar">
            <div className="sidebar-header">
              <h3>{ui.role === 'editor' ? 'Jouw opmerkingen' : 'Opmerkingen van Koen'}</h3>
              <p>{ui.role === 'editor' ? 'Schrijf notities voor Femke' : 'Feedback van de redacteur'}</p>
            </div>
            <div className="suggestions-list">
              {suggestions.length === 0
                ? <div className="no-suggestions">{ui.role === 'editor' ? 'Voeg je eerste notitie toe.' : 'Koen heeft nog geen opmerkingen.'}</div>
                : suggestions.map(s => (
                  <div className="suggestion-card" key={s.id}>
                    <div className="suggestion-text">{s.text}</div>
                    <div className="suggestion-meta">Koen · {s.date} om {s.time}</div>
                  </div>
                ))
              }
            </div>
            {ui.role === 'editor' && (
              <div className="suggestion-form">
                <textarea className="suggestion-textarea" placeholder="Opmerking of suggestie…"
                  value={draft} onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendSuggestion() }} />
                <button className="send-btn" onClick={sendSuggestion}>Opmerking versturen</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
