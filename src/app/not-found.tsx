import Link from "next/link"

export default function NotFound() {
  return (
    <main className="gutter flex min-h-[100svh] flex-col justify-between bg-ink py-8">
      <span className="folio">404 — Missing page</span>
      <div className="flex flex-col gap-8">
        <h1 className="display text-[clamp(72px,16vw,240px)]">
          Not <span className="aside">here</span>
        </h1>
        <p className="max-w-[520px] text-[18px] leading-[1.6] text-mist">
          This page doesn&apos;t exist, or a project was renamed on GitHub. The index has everything that&apos;s live.
        </p>
        <Link href="/#work" className="pill pill-solid self-start">
          Back to the work
        </Link>
      </div>
      <span className="folio">OZ — Vol. 26</span>
    </main>
  )
}
