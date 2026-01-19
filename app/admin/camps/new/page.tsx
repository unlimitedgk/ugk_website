'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function CreateCampPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    const { error } = await supabase.from('camps').insert({
      title: formData.get('title'),
      description: formData.get('description'),
      start_date: formData.get('start_date'),
      end_date: formData.get('end_date'),
      daily_start_time: formData.get('daily_start_time'),
      daily_end_time: formData.get('daily_end_time'),
      location_name: formData.get('location_name'),
      street: formData.get('street'),
      postal_code: formData.get('postal_code'),
      city: formData.get('city'),
      location_notes: formData.get('location_notes'),
      capacity: formData.get('capacity')
        ? Number(formData.get('capacity'))
        : null,
      age_min: formData.get('age_min')
        ? Number(formData.get('age_min'))
        : null,
      age_max: formData.get('age_max')
        ? Number(formData.get('age_max'))
        : null,
      created_by: user.id,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/admin/camps')
  }

  return (
    <main style={{ padding: 40, maxWidth: 700 }}>
      <h1>Create Camp</h1>

      <form onSubmit={handleSubmit}>
        <h3>Basic Info</h3>
        <input name="title" placeholder="Camp title" required />
        <textarea name="description" placeholder="Description" />

        <h3>Dates & Time</h3>
        <input type="date" name="start_date" required />
        <input type="date" name="end_date" required />
        <input type="time" name="daily_start_time" required />
        <input type="time" name="daily_end_time" required />

        <h3>Location</h3>
        <input name="location_name" placeholder="Location name" required />
        <input name="street" placeholder="Street" />
        <input name="postal_code" placeholder="Postal code" />
        <input name="city" placeholder="City" required />
        <textarea name="location_notes" placeholder="Location notes" />

        <h3>Optional</h3>
        <input type="number" name="capacity" placeholder="Capacity" />
        <input type="number" name="age_min" placeholder="Min age" />
        <input type="number" name="age_max" placeholder="Max age" />

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Camp'}
        </button>
      </form>
    </main>
  )
}