import type { Metadata } from "next"
import { Suspense } from "react"

import { requireAdmin } from "@/lib/auth/session"
import { Workspace } from "@/components/studio/workspace"
import "@/app/oz-studio/theme.css"

export const metadata: Metadata = { title: "OZ Studio workspace", robots: { index: false, follow: false } }
async function Gate() { await requireAdmin(); return <Workspace /> }
export default function OzWorkspacePage() {
  return <Suspense fallback={<div className="oz-loading" role="status">Opening your workspace…</div>}><Gate /></Suspense>
}
