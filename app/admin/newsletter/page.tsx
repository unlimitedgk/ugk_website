'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import Navbar from '@/components/Navbar'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabaseClient'

type NewsletterContact = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  source: 'profile' | 'event_registration'
  subscribed: boolean
  resend_contact_id: string | null
  resend_synced_at: string | null
  subscribed_at: string | null
  unsubscribed_at: string | null
  updated_at: string
}

const SOURCE_LABELS: Record<NewsletterContact['source'], string> = {
  profile: 'Account',
  event_registration: 'Gast-Anmeldung',
}

function formatDateTime(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminNewsletterPage() {
  const [search, setSearch] = useState('')

  const { data, error, isLoading } = useSWR('newsletter-contacts', async () => {
    const { data, error } = await supabase
      .from('newsletter_contacts')
      .select(
        'id, email, first_name, last_name, source, subscribed, resend_contact_id, resend_synced_at, subscribed_at, unsubscribed_at, updated_at'
      )
      .order('updated_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as NewsletterContact[]
  })

  const contacts = data ?? []

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return contacts
    return contacts.filter((contact) => {
      const name = `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.toLowerCase()
      return contact.email.toLowerCase().includes(query) || name.includes(query)
    })
  }, [contacts, search])

  const subscribedCount = contacts.filter((c) => c.subscribed).length
  const unsyncedCount = contacts.filter((c) => c.subscribed && !c.resend_contact_id).length

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-900">Newsletter</h1>
          <p className="text-sm text-slate-500">
            Übersicht der Newsletter-Kontakte und ihres Sync-Status mit Resend.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Kontakte gesamt</CardDescription>
              <CardTitle>{contacts.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Abonniert</CardDescription>
              <CardTitle>{subscribedCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Noch nicht mit Resend synchronisiert</CardDescription>
              <CardTitle>{unsyncedCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Kontakte</CardTitle>
            <Input
              placeholder="Suche nach E-Mail oder Name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-slate-500">Laden…</p>
            ) : error ? (
              <p className="text-sm text-red-600">Fehler beim Laden der Newsletter-Kontakte.</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-slate-500">Keine Kontakte gefunden.</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/80">
                <table className="w-full min-w-[900px] table-auto text-left">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3">Name</th>
                      <th scope="col" className="px-4 py-3">E-Mail</th>
                      <th scope="col" className="px-4 py-3">Quelle</th>
                      <th scope="col" className="px-4 py-3">Status</th>
                      <th scope="col" className="px-4 py-3">Mit Resend synchronisiert</th>
                      <th scope="col" className="px-4 py-3">Seit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((contact) => {
                      const name = `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || '—'
                      return (
                        <tr key={contact.id}>
                          <td className="px-4 py-3 text-sm text-slate-700">{name}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{contact.email}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {SOURCE_LABELS[contact.source]}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                contact.subscribed
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {contact.subscribed ? 'Abonniert' : 'Abgemeldet'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {contact.resend_contact_id ? formatDateTime(contact.resend_synced_at) : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {formatDateTime(contact.subscribed ? contact.subscribed_at : contact.unsubscribed_at)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
