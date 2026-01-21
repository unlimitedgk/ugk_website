 'use client'

 import { useEffect, useState } from 'react'
 import { useRouter } from 'next/navigation'
 import { supabase } from '@/lib/supabaseClient'

 export default function AdminLayout({ children }: { children: React.ReactNode }) {
   const router = useRouter()
   const [isAuthorized, setIsAuthorized] = useState(false)
   const [loading, setLoading] = useState(true)

   useEffect(() => {
     let isMounted = true

     const checkAdmin = async () => {
       setLoading(true)

       const { data, error } = await supabase.auth.getUser()

       if (!isMounted) {
         return
       }

       if (error || !data?.user?.id) {
         router.replace('/login')
         setLoading(false)
         return
       }

       const { data: profile, error: profileError } = await supabase
         .from('profiles')
         .select('role')
         .eq('id', data.user.id)
         .single()

       if (!isMounted) {
         return
       }

       if (profileError || profile?.role !== 'admin') {
         router.replace('/login')
         setLoading(false)
         return
       }

       setIsAuthorized(true)
       setLoading(false)
     }

     checkAdmin()

     return () => {
       isMounted = false
     }
   }, [router])

   if (loading) {
     return <p className="p-6">Loading…</p>
   }

   if (!isAuthorized) {
     return null
   }

   return <>{children}</>
 }
