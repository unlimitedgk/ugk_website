'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Navbar from '@/components/Navbar'

export default function AdminCampsShowPage() {
  const [camps, setCamps] = useState<any[]>([])
  const [registrationCountMap, setRegistrationCountMap] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)

      // 1️⃣ Fetch camps
      const { data: campsData, error: campsError } = await supabase
        .from('camps')
        .select('*')
        .order('start_date', { ascending: true })

      if (campsError) {
        console.error(campsError)
        setLoading(false)
        return
      }

      // 2️⃣ Fetch registrations (ONLY camp_id needed)
      const { data: registrationsData, error: regError } = await supabase
        .from('camp_registrations')
        .select('camp_id')

      if (regError) {
        console.error(regError)
        setLoading(false)
        return
      }

      // 3️⃣ BUILD COUNT MAP  ✅ THIS IS THE KEY PART
      const countMap = new Map<string, number>()

      registrationsData?.forEach((r) => {
        const campId = String(r.camp_id)
        countMap.set(campId, (countMap.get(campId) ?? 0) + 1)
      })

      // 4️⃣ Save everything to state
      setCamps(campsData ?? [])
      setRegistrationCountMap(countMap)
      setLoading(false)
    }

    loadData()
  }, [])

  // ⛔ Do NOT build the map here — only use it

  if (loading) {
    return <p className="p-6">Loading camps…</p>
  }

  // 5️⃣ USE THE MAP IN RETURN
  return (
    <div className="min-h-screen">
      <Navbar showLogout />
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Camps overview</h1>

        <table className="w-full border-collapse border">
          <thead>
            <tr>
              <th className="border p-2">Camp</th>
              <th className="border p-2 text-center">Registered</th>
              <th className="border p-2 text-center">Capacity</th>
              <th className="border p-2 text-center">Status</th>
              <th className="border p-2 text-center">Registrations</th>
            </tr>
          </thead>

          <tbody>
            {camps.map((camp) => {
              const registered = registrationCountMap.get(String(camp.id)) ?? 0
              const isFull = registered >= camp.capacity

              return (
                <tr key={camp.id}>
                  <td className="border p-2">{camp.title}</td>
                  <td className="border p-2 text-center">{registered}</td>
                  <td className="border p-2 text-center">{camp.capacity}</td>
                  <td className="border p-2 text-center">
                    {isFull ? (
                      <span className="text-red-600 font-semibold">Full</span>
                    ) : (
                      <span className="text-green-600 font-semibold">Open</span>
                    )}
                  </td>
                  <td className="border p-2 text-center">
                    <a
                      href={`admin/camps/${camp.id}/registrations`}
                      className="text-blue-600 underline"
                    >
                      Show
                    </a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}