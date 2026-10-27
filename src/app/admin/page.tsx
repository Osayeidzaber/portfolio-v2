import { Suspense } from "react"

import { Studio } from "@/components/admin/studio"
import { requireAdmin } from "@/lib/auth/session"

async function Gate() {
  await requireAdmin()
  return <Studio />
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100svh] items-center justify-center">
          <span className="folio">Loading studio…</span>
        </div>
      }
    >
      <Gate />
    </Suspense>
  )
}
