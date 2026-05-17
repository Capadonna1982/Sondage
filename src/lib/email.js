import { supabase } from './supabase'

export async function sendAdminNotification({ email, answers, questions }) {
  try {
    const { error } = await supabase.functions.invoke('send-notification', {
      body: {
        email: email || null,
        answers,
        questions,
        submittedAt: new Date().toLocaleString('fr-CA', { timeZone: 'America/Toronto' })
      }
    })
    if (error) console.error('Erreur envoi courriel:', error)
  } catch (err) {
    console.error('Erreur envoi courriel:', err)
  }
}
