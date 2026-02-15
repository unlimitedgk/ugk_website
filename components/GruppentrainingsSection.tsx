'use client'

import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, A11y } from 'swiper/modules'
import { Button } from '@/components/ui/button'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

const TRAINING_IMAGES = [
  '/images/training/01.png',
  '/images/training/02.png',
  '/images/training/03.png',
  '/images/training/04.jpg',
  '/images/training/05.png',
  // Add more up to 10 when available: Training_03.jpg, etc.
].filter(Boolean)

export default function GruppentrainingsSection() {
  if (TRAINING_IMAGES.length === 0) return null

  return (
    <section id="gruppentrainings" className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Gruppentrainings</h2>
          <p className="mb-12 mx-auto max-w-3xl rounded-2xl border-2 border-slate-200 bg-white px-2 py-1 text-base font-bold uppercase tracking-wide text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.18)]">
            🧤 Wöchentliches Gruppentraining jeden Samstag von 9:00 bis 10:00
          </p>

          <div className="mx-auto max-w-4xl">
            <div className="gruppentrainings-carousel relative">
              <Swiper
                modules={[Navigation, Pagination, A11y]}
                spaceBetween={16}
                slidesPerView={1}
                grabCursor
                touchEventsTarget="container"
                pagination={{ clickable: true }}
                navigation={TRAINING_IMAGES.length > 1 ? {} : false}
                className="gruppentrainings-swiper"
                breakpoints={{
                  640: { spaceBetween: 20 },
                }}
              >
                {TRAINING_IMAGES.map((src, i) => (
                  <SwiperSlide key={src}>
                    <div className="aspect-[4/3] w-full max-w-md mx-auto sm:max-w-lg max-h-[220px] sm:max-h-[280px] rounded-2xl overflow-hidden border-2 border-slate-200 shadow-[0_12px_30px_rgba(15,23,42,0.18)] bg-slate-100">
                      <img
                        src={src}
                        alt={`Gruppentraining ${i + 1}`}
                        className="w-full h-full object-cover block select-none"
                        draggable={false}
                      />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>

            <Button
              as="a"
              href="/trial_training/register"
              size="slg"
              className="mt-10 w-auto border border-black bg-black/80 text-white text-lg"
            >
              Kostenloses Schnuppertraining
            </Button>
          </div>
        </div>
      </section>
  )
}
