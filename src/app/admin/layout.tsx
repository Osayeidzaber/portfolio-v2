import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Studio",
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="min-h-[100svh] bg-ink text-paper">{children}</div>
}
