import Link from "next/link"

import { LoginForm } from "@/components/admin/login-form"

export default function LoginPage() {
  return (
    <main className="gutter flex min-h-[100svh] flex-col justify-between py-8">
      <span className="folio">OZ studio</span>
      <div className="mx-auto flex w-full max-w-[420px] flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h1 className="text-[44px] font-bold leading-none tracking-[-0.03em]">Sign in</h1>
          <p className="text-[16px] leading-[1.5] text-dust">Manage your portfolio and OZ Studio invoices.</p>
        </div>
        <LoginForm />
      </div>
      <Link href="/" className="folio self-start hover:!text-paper">
        ← Back to the site
      </Link>
    </main>
  )
}
