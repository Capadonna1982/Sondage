import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, answers, questions, submittedAt } = await req.json()

    const answerLines = questions
      .map((q: any) => {
        const ans = answers[q.id]
        if (!ans) return null
        let val = ''
        if (Array.isArray(ans)) val = ans.join(', ')
        else if (typeof ans === 'object') val = Object.entries(ans).map(([k, v]) => `${k}: #${v}`).join(', ')
        else val = String(ans)
        return `<tr>
          <td style="padding:10px 16px;border-bottom:1px solid #f0ebe4;color:#8a7e78;font-size:13px;vertical-align:top;width:40%">${q.text}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #f0ebe4;color:#2c2420;font-size:13px;font-weight:500">${val}</td>
        </tr>`
      })
      .filter(Boolean)
      .join('')

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#faf8f5;margin:0;padding:2rem">
  <div style="max-width:580px;margin:0 auto">
    <div style="background:#3d5a3e;border-radius:14px 14px 0 0;padding:2rem;text-align:center">
      <p style="color:rgba(255,255,255,0.7);font-size:12px;letter-spacing:0.06em;text-transform:uppercase;margin:0 0 8px">Centre de bien-être · Québec</p>
      <h1 style="color:white;font-size:24px;margin:0;font-weight:400">Nouvelle réponse au sondage</h1>
    </div>
    <div style="background:white;border:1px solid #e4ddd6;border-top:none;padding:1.5rem 2rem">
      <div style="display:flex;gap:16px;margin-bottom:1.5rem;padding:14px 16px;background:#eef5ee;border-radius:10px">
        <div>
          <p style="font-size:12px;color:#7a9e7e;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.05em">Répondante</p>
          <p style="font-size:15px;font-weight:500;color:#2c2420;margin:0">${email || 'Anonyme'}</p>
        </div>
        <div style="margin-left:auto;text-align:right">
          <p style="font-size:12px;color:#7a9e7e;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.05em">Soumis le</p>
          <p style="font-size:15px;font-weight:500;color:#2c2420;margin:0">${submittedAt}</p>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e4ddd6;border-radius:10px;overflow:hidden">
        <thead>
          <tr style="background:#faf8f5">
            <th style="text-align:left;padding:10px 16px;font-size:11px;color:#b8a898;font-weight:500;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #e4ddd6">Question</th>
            <th style="text-align:left;padding:10px 16px;font-size:11px;color:#b8a898;font-weight:500;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #e4ddd6">Réponse</th>
          </tr>
        </thead>
        <tbody>${answerLines}</tbody>
      </table>
      <p style="font-size:12px;color:#b8a898;text-align:center;margin-top:1.5rem">
        Centre de bien-être pour mamans · Québec<br>
        Ce courriel est automatique — ne pas répondre directement.
      </p>
    </div>
  </div>
</body>
</html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Centre de bien-être <onboarding@resend.dev>',
        to: [ADMIN_EMAIL],
        subject: `📋 Nouvelle réponse au sondage${email ? ` — ${email}` : ' (anonyme)'}`,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Resend error: ${err}`)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
