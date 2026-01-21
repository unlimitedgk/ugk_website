'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function CampRegistrationsPage() {
  const params = useParams()
  const campId = params.id as string

  const [registrations, setRegistrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadRegistrations = async () => {
      setLoading(true)

      const { data, error } = await supabase
        .from('camp_registrations')
        .select('*')
        .eq('camp_id', campId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error(error)
      } else {
        setRegistrations(data ?? [])
      }

      setLoading(false)
    }

    loadRegistrations()
  }, [campId])

  const exportCSV = () => {
    if (registrations.length === 0) return

    const headers = Object.keys(registrations[0])

    const csvRows = [
      headers.join(','),
      ...registrations.map((row) =>
        headers
          .map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`)
          .join(',')
      ),
    ]

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `camp_${campId}_registrations.csv`
    a.click()

    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <p className="p-6">Loading registrations…</p>
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          Registrations ({registrations.length})
        </h1>

        <button
          onClick={exportCSV}
          className="px-4 py-2 bg-black text-white rounded"
        >
          Export CSV
        </button>
      </div>

      {registrations.length === 0 ? (
        <p>No registrations yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border text-sm">
            <thead>
              <tr>
                <th className="border p-2">Parent name</th>
                <th className="border p-2">Parent email</th>
                <th className="border p-2">Phone</th>
                <th className="border p-2">Child name</th>
                <th className="border p-2">Birth date</th>
                <th className="border p-2">Team</th>
                <th className="border p-2">Glove size</th>
                <th className="border p-2">Diet</th>
                <th className="border p-2">Allergies</th>
                <th className="border p-2">Medication</th>
              </tr>
            </thead>

            <tbody>
              {registrations.map((r) => (
                <tr key={r.id}>
                  <td className="border p-2">{r.parent_first_name + ' ' + r.parent_last_name}</td>
                  <td className="border p-2">{r.parent_email}</td>
                  <td className="border p-2">{r.parent_phone}</td>
                  <td className="border p-2">{r.child_first_name + ' ' + r.child_last_name}</td>
                  <td className="border p-2">{r.child_birth_date}</td>
                  <td className="border p-2">{r.child_home_club}</td>
                  <td className="border p-2">{r.glove_size}</td>
                  <td className="border p-2">{r.diet}</td>
                  <td className="border p-2">{r.allergies}</td>
                  <td className="border p-2">{r.medication}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}