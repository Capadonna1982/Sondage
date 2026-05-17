import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { sendAdminNotification } from '../lib/email'

export default function Survey() {
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(0)
  const tracked = useRef(false)

  useEffect(() => {
    loadQuestions()
    if (!tracked.current) {
      tracked.current = true
      supabase.from('page_views').insert({ event: 'view' }).then(() => {})
    }
  }, [])

  useEffect(() => {
    if (!questions.length) return
    const required = questions.filter(q => q.required)
    const filled = questions.filter(q => {
      const a = answers[q.id]
      return a !== undefined && a !== '' && !(Array.isArray(a) && a.length === 0)
    })
    setProgress(Math.round((filled.length / questions.length) * 100))
  }, [answers, questions])

  async function loadQuestions() {
    const { data } = await supabase.from('questions').select('*').eq('active', true).order('order_index')
    setQuestions(data || [])
    setLoading(false)
  }

  function handleAnswer(qid, value) {
    setAnswers(prev => ({ ...prev, [qid]: value }))
  }

  function handleCheckbox(qid, option, checked) {
    setAnswers(prev => {
      const current = prev[qid] || []
      return { ...prev, [qid]: checked ? [...current, option] : current.filter(o => o !== option) }
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const missing = questions.filter(q => {
      if (!q.required) return false
      const a = answers[q.id]
      return !a || (Array.isArray(a) && a.length === 0)
    })
    if (missing.length > 0) {
      setError('Veuillez répondre aux questions obligatoires marquées d\'un *')
      document.getElementById('q-' + missing[0].id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setError(null)
    setSubmitting(true)

    const { data: resp, error: respErr } = await supabase
      .from('responses').insert({ email: email || null }).select().single()

    if (respErr) { setError('Une erreur est survenue. Veuillez réessayer.'); setSubmitting(false); return }

    const answerRows = Object.entries(answers).map(([qid, value]) => ({
      response_id: resp.id,
      question_id: qid,
      value: JSON.stringify(value)
    }))

    await supabase.from('answers').insert(answerRows)
    await supabase.from('page_views').insert({ event: 'submit' })
    await sendAdminNotification({ email, answers, questions })

    setSubmitted(true)
    setSubmitting(false)
  }

  if (submitted) return <SuccessPage email={email} answers={answers} questions={questions} />

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ background: 'var(--forest)', padding: '2.5rem 1.5rem 4rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -10, fontSize: 120, opacity: 0.06, transform: 'rotate(15deg)', lineHeight: 1 }}>🌿</div>
        <div style={{ position: 'absolute', bottom: -30, left: -20, fontSize: 100, opacity: 0.05, transform: 'rotate(-20deg)', lineHeight: 1 }}>🌸</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', fontSize: 12, padding: '4px 14px', borderRadius: 20, marginBottom: 16, letterSpacing: '0.04em' }}>
          <span>🌿</span> Centre de bien-être · Québec
        </div>
        <h1 style={{ color: 'white', fontSize: 30, fontFamily: 'Playfair Display, serif', marginBottom: 10, letterSpacing: '-0.01em', lineHeight: 1.2 }}>Parlez-nous de vous</h1>
        <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 14, maxWidth: 400, margin: '0 auto 1.5rem' }}>Vos réponses nous aident à créer un espace qui vous ressemble vraiment</p>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.18)', borderRadius: 2, maxWidth: 400, margin: '0 auto' }}>
          <div style={{ height: '100%', background: '#b8d4b0', borderRadius: 2, width: progress + '%', transition: 'width 0.4s ease' }} />
        </div>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 6 }}>{progress}% complété</p>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '1.5rem 1.25rem 3rem' }}>
        <div className="card" style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Votre courriel <span style={{ color: 'var(--text-hint)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optionnel)</span></label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@courriel.com" />
          <p style={{ fontSize: 12, color: 'var(--text-hint)', marginTop: 6 }}>🔒 Pour être informée de notre ouverture. Jamais partagé.</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-soft)' }}>Chargement…</div>
        ) : (
          <form onSubmit={handleSubmit}>
            {questions.map((q, idx) => (
              <div key={q.id} id={'q-' + q.id} className="card" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, background: 'var(--forest-light)', color: 'var(--forest)', padding: '2px 10px', borderRadius: 12 }}>Q{idx + 1}</span>
                  {q.required && <span style={{ fontSize: 11, color: '#c0605e' }}>* obligatoire</span>}
                </div>
                <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 14, lineHeight: 1.5 }}>{q.text}</p>
                <QuestionInput q={q} value={answers[q.id]} onChange={handleAnswer} onCheckbox={handleCheckbox} />
              </div>
            ))}

            {error && <div style={{ background: '#fef2f2', border: '1px solid #f5c0c0', borderRadius: 10, padding: '12px 16px', marginBottom: 14, fontSize: 13, color: '#c0605e' }}>{error}</div>}

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: 15, fontSize: 16 }} disabled={submitting}>
              {submitting ? 'Envoi en cours…' : 'Soumettre mes réponses'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-hint)', marginTop: 10 }}>🔒 Confidentiel · données jamais revendues · Québec</p>
          </form>
        )}
      </div>
    </div>
  )
}

function QuestionInput({ q, value, onChange, onCheckbox }) {
  const [hoverStar, setHoverStar] = useState(null)
  const opts = q.options || []

  if (q.type === 'radio') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {opts.map(opt => {
        const sel = value === opt
        return (
          <button key={opt} type="button" onClick={() => onChange(q.id, opt)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderRadius: 10, border: `1px solid ${sel ? 'var(--forest)' : 'var(--border)'}`, background: sel ? 'var(--forest-light)' : 'white', cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s' }}>
            <span style={{ width: 17, height: 17, borderRadius: '50%', border: `1.5px solid ${sel ? 'var(--forest)' : '#ccc'}`, background: sel ? 'var(--forest)' : 'white', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {sel && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'white' }} />}
            </span>
            <span style={{ fontSize: 14, color: sel ? 'var(--forest-dark)' : 'var(--text)', fontWeight: sel ? 500 : 400 }}>{opt}</span>
          </button>
        )
      })}
    </div>
  )

  if (q.type === 'checkbox') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {opts.map(opt => {
        const checked = (value || []).includes(opt)
        return (
          <button key={opt} type="button" onClick={() => onCheckbox(q.id, opt, !checked)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderRadius: 10, border: `1px solid ${checked ? 'var(--forest)' : 'var(--border)'}`, background: checked ? 'var(--forest-light)' : 'white', cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s' }}>
            <span style={{ width: 17, height: 17, borderRadius: 4, border: `1.5px solid ${checked ? 'var(--forest)' : '#ccc'}`, background: checked ? 'var(--forest)' : 'white', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {checked && <span style={{ color: 'white', fontSize: 11, lineHeight: 1 }}>✓</span>}
            </span>
            <span style={{ fontSize: 14, color: checked ? 'var(--forest-dark)' : 'var(--text)', fontWeight: checked ? 500 : 400 }}>{opt}</span>
          </button>
        )
      })}
    </div>
  )

  if (q.type === 'yesno') return (
    <div style={{ display: 'flex', gap: 8 }}>
      {['Oui', 'Non'].map(opt => (
        <button key={opt} type="button" onClick={() => onChange(q.id, opt)}
          style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1px solid ${value === opt ? 'var(--forest)' : 'var(--border)'}`, background: value === opt ? 'var(--forest-light)' : 'white', cursor: 'pointer', fontWeight: value === opt ? 500 : 400, color: value === opt ? 'var(--forest-dark)' : 'var(--text)', fontSize: 14, transition: 'all 0.12s' }}>
          {opt}
        </button>
      ))}
    </div>
  )

  if (q.type === 'scale') return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        {[1,2,3,4,5].map(n => (
          <button key={n} type="button"
            onMouseEnter={() => setHoverStar(n)} onMouseLeave={() => setHoverStar(null)}
            onClick={() => onChange(q.id, n)}
            style={{ fontSize: 30, color: n <= (hoverStar || value || 0) ? '#d4a854' : '#ddd', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', transition: 'color 0.1s' }}>
            ★
          </button>
        ))}
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-hint)' }}>1 = peu prioritaire · 5 = absolument essentiel</p>
    </div>
  )

  if (q.type === 'rank') return (
    <div>
      <p style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 10 }}>Classez par ordre de préférence (1 = plus important) :</p>
      {opts.map((opt) => (
        <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'white', marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: 'var(--text-hint)' }}>☰</span>
          <select value={(value || {})[opt] || ''} onChange={e => onChange(q.id, { ...(value || {}), [opt]: parseInt(e.target.value) })}
            style={{ width: 60, padding: '4px 8px', fontSize: 13, borderRadius: 6 }}>
            <option value="">—</option>
            {opts.map((_, j) => <option key={j+1} value={j+1}>{j+1}</option>)}
          </select>
          <span style={{ fontSize: 14 }}>{opt}</span>
        </div>
      ))}
    </div>
  )

  if (q.type === 'textarea') return (
    <textarea rows={4} placeholder="Partagez librement ce qui compte pour vous…"
      value={value || ''} onChange={e => onChange(q.id, e.target.value)}
      style={{ resize: 'vertical', width: '100%' }} />
  )

  return <input type="text" placeholder="Votre réponse…" value={value || ''} onChange={e => onChange(q.id, e.target.value)} />
}

function SuccessPage({ email, answers, questions }) {
  const profile = questions.find(q => q.type === 'radio' && q.order_index === 1)
  const budget = questions.find(q => q.type === 'radio' && q.order_index === 4)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ background: 'var(--forest)', padding: '2.5rem 1.5rem 3rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', fontSize: 12, padding: '4px 14px', borderRadius: 20, marginBottom: 16 }}>
          🌿 Centre de bien-être · Québec
        </div>
        <h1 style={{ color: 'white', fontSize: 30, fontFamily: 'Playfair Display, serif', marginBottom: 8 }}>Merci !</h1>
        <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 14 }}>Vos réponses ont bien été enregistrées</p>
      </div>
      <div style={{ maxWidth: 560, margin: '-1.5rem auto 0', padding: '0 1.25rem 3rem' }}>
        <div className="card" style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--forest-light)', border: '1px solid #c8ddc9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', fontSize: 28 }}>✓</div>
          <h2 style={{ fontSize: 22, fontFamily: 'Playfair Display, serif', marginBottom: 10, color: 'var(--text)' }}>Merci de votre confiance</h2>
          <p style={{ fontSize: 14, color: 'var(--text-soft)', lineHeight: 1.75, marginBottom: email ? 12 : 0 }}>
            Vos réponses nous aident à bâtir un espace qui vous ressemble vraiment, ancré dans la réalité des mamans de Québec.
          </p>
          {email && <p style={{ fontSize: 13, color: 'var(--forest)', background: 'var(--forest-light)', padding: '8px 16px', borderRadius: 8, display: 'inline-block' }}>Nous vous écrirons à <strong>{email}</strong> lors de notre ouverture.</p>}
        </div>
        {(answers[profile?.id] || answers[budget?.id]) && (
          <div className="card" style={{ background: 'var(--forest-light)', border: '1px solid #c8ddc9' }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--forest-dark)', marginBottom: 10 }}>Votre profil enregistré</p>
            {answers[profile?.id] && <p style={{ fontSize: 13, color: 'var(--forest)', marginBottom: 4 }}>👤 {answers[profile.id]}</p>}
            {answers[budget?.id] && <p style={{ fontSize: 13, color: 'var(--forest)' }}>💚 Budget : {answers[budget.id]}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
