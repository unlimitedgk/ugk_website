import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

type Camp = {
  id: string
  title: string
  start_date: string
  end_date: string
  daily_start_time: string | null
  daily_end_time: string | null
  city: string
  location_name: string
  price: number | string
}

export default async function CampsPage() {
  const formatPrice = (price: number | string) => {
    const numericPrice = Number(price)
    if (Number.isNaN(numericPrice)) {
      return '—'
    }

    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(numericPrice)
  }

  const { data: camps } = await supabase
    .from('camps')
    .select(
      'id, title, start_date, end_date, daily_start_time, daily_end_time, city, location_name, price'
    )
    .order('start_date', { ascending: true })

  return (
    <main
      style={{
        padding: 40,
        maxWidth: 1100,
        margin: '0 auto',
        fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
      }}
    >
      <h1 style={{ marginBottom: 8 }}>Bevorstehende Torwart-Camps</h1>
      <p style={{ marginTop: 0, color: '#5b5b5b' }}>
        Finde dein nächstes Camp und melde dich mit einem Klick an.
      </p>

      <section
        style={{
          marginTop: 24,
          padding: '20px 22px',
          borderRadius: 16,
          background:
            'linear-gradient(135deg, rgba(13,107,221,0.08), rgba(255,213,79,0.18))',
          border: '1px solid rgba(13,107,221,0.12)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 14 }}>
          Was macht ein Camp besonders?
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 14,
          }}
        >
          {[
            {
              icon: '🗓️',
              title: 'Mehrtägiges Event',
              description:
                'Training, Regeneration und Wachstum über mehrere Tage.',
            },
            {
              icon: '🌍',
              title: 'Nicht altersgebunden',
              description: 'Alle Levels willkommen – von jung bis erfahren.',
            },
            {
              icon: '🤝',
              title: 'Gruppentrainings',
              description: 'Unterschiedliche Gruppen für echte Teamdynamik.',
            },
            {
              icon: '🎉',
              title: 'Spaß',
              description: 'Energie, Challenges und Erinnerungen am Platz.',
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 12,
                background: '#ffffff',
                border: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 6px 16px rgba(0,0,0,0.06)',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  background: 'rgba(13,107,221,0.1)',
                }}
              >
                {item.icon}
              </span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {item.title}
                </div>
                <div style={{ color: '#5b5b5b', fontSize: 13 }}>
                  {item.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {!camps || camps.length === 0 ? (
        <p style={{ marginTop: 24 }}>
          Aktuell sind keine Camps verfügbar.
        </p>
      ) : (
        <div
          style={{
            marginTop: 24,
            border: '1px solid #e6e6e6',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr
                style={{
                  background: '#f7f7f7',
                  textAlign: 'left',
                  fontSize: 14,
                  letterSpacing: 0.2,
                }}
              >
                <th style={{ padding: '14px 16px' }}>Camp</th>
                <th style={{ padding: '14px 16px' }}>Datum</th>
                <th style={{ padding: '14px 16px' }}>Start-Endzeit</th>
                <th style={{ padding: '14px 16px' }}>Ort</th>
                <th style={{ padding: '14px 16px' }}>Preis</th>
                <th style={{ padding: '14px 16px' }}>Anmeldung</th>
              </tr>
            </thead>
            <tbody>
              {camps.map((camp, index) => (
                <tr
                  key={camp.id}
                  style={{
                    background: index % 2 === 0 ? '#ffffff' : '#fbfbfb',
                    borderTop: '1px solid #ededed',
                  }}
                >
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 600 }}>{camp.title}</div>
                    <div style={{ color: '#6b6b6b', fontSize: 13 }}>
                      {camp.location_name}
                    </div>
                  </td>
                  <td style={{ padding: '16px', whiteSpace: 'nowrap' }}>
                    {camp.start_date} – {camp.end_date}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {camp.daily_start_time && camp.daily_end_time
                      ? `${camp.daily_start_time}–${camp.daily_end_time}`
                      : '—'}
                  </td>
                  <td style={{ padding: '16px' }}>{camp.city}</td>
                  <td style={{ padding: '16px', whiteSpace: 'nowrap' }}>
                    {formatPrice(camp.price)}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <Link href={`/camps/register`}>
                      Details ansehen & anmelden →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}