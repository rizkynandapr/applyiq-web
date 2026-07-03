import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { extractResumeText } from '../lib/resumeParser'
import './FormPage.css'

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL

const STEPS = ['Profile', 'Target', 'Resume']

function FormPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [parsing, setParsing] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    target_job: '',
    target_location: '',
    experience_level: 'Fresh Graduate',
    resume_text: '',
  })

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError('')
  }

  const goNext = () => {
    if (step === 1) {
      if (!form.full_name.trim() || !form.email.trim()) {
        setError('Name and email are required.')
        return
      }
      if (!form.email.includes('@')) {
        setError('Enter a valid email address.')
        return
      }
    }
    if (step === 2) {
      if (!form.target_job.trim() || !form.target_location.trim()) {
        setError('Target role and location are required.')
        return
      }
    }
    setStep((s) => s + 1)
  }

  const goBack = () => setStep((s) => s - 1)

  const handleFile = async (file) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('File exceeds the 5 MB limit.')
      return
    }
    setError('')
    setParsing(true)
    setFileName(file.name)
    try {
      const text = await extractResumeText(file)
      if (text.trim().length < 50) {
        throw new Error('Could not read this file. Try another one, or paste the text below.')
      }
      update('resume_text', text)
    } catch (err) {
      setError(err.message || 'Could not read this file. Try another one, or paste the text below.')
      setFileName('')
    } finally {
      setParsing(false)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    handleFile(e.dataTransfer.files?.[0])
  }

  const handleSubmit = async () => {
    if (form.resume_text.trim().length < 200) {
      setError('Resume text must be at least 200 characters for a reliable analysis.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    } catch (err) {
      console.error('Webhook error:', err)
    }
    setTimeout(() => {
      setLoading(false)
      navigate('/dashboard', { state: { email: form.email, submitted: true } })
    }, 1500)
  }

  return (
    <div className="intake">
      <header className="intake-bar">
        <a href="/" className="wordmark">
          APPLY<span>IQ</span>
        </a>
        <span className="bar-meta">RESUME INTAKE</span>
      </header>

      <main className="intake-body">
        <aside className="intake-rail">
          <div className="rail-label">SEQUENCE</div>
          {STEPS.map((label, i) => {
            const n = i + 1
            const state = step > n ? 'done' : step === n ? 'active' : ''
            return (
              <div key={label} className={`rail-step ${state}`}>
                <span className="rail-index">{String(n).padStart(2, '0')}</span>
                <span className="rail-name">{label}</span>
                <span className="rail-mark">{step > n ? '●' : step === n ? '◐' : '○'}</span>
              </div>
            )
          })}
          <div className="rail-foot">
            Runs a resume audit, searches live listings, and scores every match against your profile.
          </div>
        </aside>

        <section className="intake-panel">
          {loading ? (
            <div className="run-state">
              <div className="run-meter" aria-hidden="true">
                <span /><span /><span /><span /><span />
              </div>
              <h2>Analysis running</h2>
              <p>
                Parsing your resume, querying live job listings, and scoring each match.
                This takes about a minute — you'll land on your dashboard when it's ready.
              </p>
            </div>
          ) : (
            <>
              {step === 1 && (
                <div className="panel-step">
                  <div className="panel-head">
                    <span className="panel-tag">01 / PROFILE</span>
                    <h1>Who is applying</h1>
                    <p>Results are keyed to your email — it's how you retrieve them later.</p>
                  </div>

                  <label className="f-label" htmlFor="full_name">Full name</label>
                  <input
                    id="full_name"
                    className="f-input"
                    placeholder="e.g. Sam Kurniawan"
                    value={form.full_name}
                    onChange={(e) => update('full_name', e.target.value)}
                  />

                  <label className="f-label" htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    className="f-input"
                    placeholder="you@email.com"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                  />

                  <label className="f-label" htmlFor="phone">Phone <em>optional</em></label>
                  <input
                    id="phone"
                    className="f-input"
                    placeholder="+62 812 3456 7890"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                  />
                </div>
              )}

              {step === 2 && (
                <div className="panel-step">
                  <div className="panel-head">
                    <span className="panel-tag">02 / TARGET</span>
                    <h1>What you're after</h1>
                    <p>The search and every match score are calibrated to this target.</p>
                  </div>

                  <label className="f-label" htmlFor="target_job">Target role</label>
                  <input
                    id="target_job"
                    className="f-input"
                    placeholder="e.g. Data Analyst"
                    value={form.target_job}
                    onChange={(e) => update('target_job', e.target.value)}
                  />

                  <label className="f-label" htmlFor="target_location">Location</label>
                  <input
                    id="target_location"
                    className="f-input"
                    placeholder="Jakarta, Surabaya, remote…"
                    value={form.target_location}
                    onChange={(e) => update('target_location', e.target.value)}
                  />

                  <label className="f-label">Experience level</label>
                  <div className="level-row">
                    {['Fresh Graduate', 'Junior', 'Mid-Level', 'Senior'].map((lvl) => (
                      <button
                        type="button"
                        key={lvl}
                        className={`level-chip ${form.experience_level === lvl ? 'on' : ''}`}
                        onClick={() => update('experience_level', lvl)}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="panel-step">
                  <div className="panel-head">
                    <span className="panel-tag">03 / RESUME</span>
                    <h1>Load your resume</h1>
                    <p>PDF, DOCX, or TXT. Parsed locally in your browser — the file itself never leaves your machine.</p>
                  </div>

                  <label
                    className={`dropzone ${parsing ? 'busy' : ''} ${fileName ? 'loaded' : ''}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDrop}
                  >
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={(e) => handleFile(e.target.files?.[0])}
                      hidden
                    />
                    {parsing ? (
                      <>
                        <span className="dz-status">READING…</span>
                        <strong>{fileName}</strong>
                      </>
                    ) : fileName ? (
                      <>
                        <span className="dz-status ok">LOADED</span>
                        <strong>{fileName}</strong>
                        <span className="dz-hint">Select to replace</span>
                      </>
                    ) : (
                      <>
                        <span className="dz-status">AWAITING FILE</span>
                        <strong>Drop your resume here, or click to browse</strong>
                        <span className="dz-hint">PDF · DOCX · TXT — max 5 MB</span>
                      </>
                    )}
                  </label>

                  <details className="paste-alt">
                    <summary>Paste the text instead</summary>
                    <textarea
                      className="f-textarea"
                      placeholder="Paste your resume text…"
                      value={form.resume_text}
                      onChange={(e) => { update('resume_text', e.target.value); setFileName('') }}
                    />
                  </details>

                  <div className={`readout ${form.resume_text.length >= 200 ? 'ok' : ''}`}>
                    CHARS {String(form.resume_text.length).padStart(5, '0')} / MIN 00200
                  </div>
                </div>
              )}

              {error && <div className="panel-error">{error}</div>}

              <div className="panel-actions">
                {step > 1 && (
                  <button className="btn-ghost" onClick={goBack}>Back</button>
                )}
                {step < 3 ? (
                  <button className="btn-solid" onClick={goNext}>Continue →</button>
                ) : (
                  <button className="btn-solid" onClick={handleSubmit}>Run analysis →</button>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}

export default FormPage
