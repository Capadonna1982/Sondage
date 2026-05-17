import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const { action, password, newPassword } = await req.json()

    if (action === 'verify') {
      const { data } = await supabase
        .from('admin_config')
        .select('value')
        .eq('key', 'dashboard_password_hash')
        .single()

      if (!data) {
        return new Response(JSON.stringify({ valid: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const valid = await bcrypt.compare(password, data.value)
      return new Response(JSON.stringify({ valid }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'change') {
      const { data } = await supabase
        .from('admin_config')
        .select('value')
        .eq('key', 'dashboard_password_hash')
        .single()

      if (!data) throw new Error('Configuration introuvable')

      const currentValid = await bcrypt.compare(password, data.value)
      if (!currentValid) {
        return new Response(JSON.stringify({ success: false, error: 'Mot de passe actuel incorrect' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const newHash = await bcrypt.hash(newPassword)
      await supabase
        .from('admin_config')
        .update({ value: newHash, updated_at: new Date().toISOString() })
        .eq('key', 'dashboard_password_hash')

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    throw new Error('Action inconnue')
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
