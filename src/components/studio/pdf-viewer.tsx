"use client"

import { useEffect, useRef, useState } from "react"
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist"

import { previewInvoiceAction } from "@/app/admin/oz-studio/actions"
import type { Invoice } from "@/lib/studio/schema"

/** Render the actual PDF ourselves, including on browsers without a native PDF plug-in. */
export function PdfViewer({ invoice }: { invoice: Invoice }) {
  const [url, setUrl] = useState("")
  const [error, setError] = useState("")
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [width, setWidth] = useState(0)
  const [rendered, setRendered] = useState(false)
  const canvas = useRef<HTMLCanvasElement>(null)
  const container = useRef<HTMLDivElement>(null)
  const signature = JSON.stringify(invoice)
  const saved = invoice.status !== "draft"

  useEffect(() => {
    let active = true
    let objectUrl = ""
    let loading: PDFDocumentLoadingTask | undefined
    async function open() {
      const invoice = JSON.parse(signature) as Invoice
      let bytes: Uint8Array
      if (saved) {
        const response = await fetch(`/api/studio/invoices/${invoice.id}/pdf`, { cache: "no-store" })
        if (!response.ok) throw new Error("The saved PDF could not be loaded. Reload and check your session.")
        bytes = new Uint8Array(await response.arrayBuffer())
      } else {
        const result = await previewInvoiceAction(invoice, invoice.business)
        if (!result.ok) throw new Error(result.error)
        bytes = Uint8Array.from(atob(result.pdf), (character) => character.charCodeAt(0))
      }
      const pdfjs = await import("pdfjs-dist")
      if (!active) return
      objectUrl = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }))
      setUrl(objectUrl)
      pdfjs.GlobalWorkerOptions.workerSrc = "/oz-studio/pdf.worker.min.mjs"
      loading = pdfjs.getDocument({ data: bytes.slice() })
      const document = await loading.promise
      if (active) setPdf(document)
    }
    open().catch((error) => { if (active) setError(error instanceof Error ? error.message : "Could not open the PDF.") })
    return () => { active = false; if (loading) void loading.destroy().catch(() => {}); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [signature, saved])

  useEffect(() => {
    const element = container.current
    if (!element) return
    const observer = new ResizeObserver((entries) => setWidth(Math.floor(entries[0].contentRect.width)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!pdf || !width || !canvas.current) return
    let active = true
    let render: RenderTask | undefined
    pdf.getPage(pageNumber).then(async (page) => {
      if (!active || !canvas.current) return
      setRendered(false)
      const base = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: Math.min(Math.max(width - 32, 200) / base.width, 1.3) * zoom })
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      const element = canvas.current
      const context = element.getContext("2d")
      if (!context) throw new Error("Your browser cannot render the PDF canvas. You can still download or open the PDF.")
      element.width = Math.ceil(viewport.width * pixelRatio)
      element.height = Math.ceil(viewport.height * pixelRatio)
      element.style.width = `${Math.floor(viewport.width)}px`
      element.style.height = `${Math.floor(viewport.height)}px`
      render = page.render({ canvas: element, canvasContext: context, viewport, transform: [pixelRatio, 0, 0, pixelRatio, 0, 0] })
      await render.promise
      if (active) setRendered(true)
    }).catch((error) => { if (active && error?.name !== "RenderingCancelledException") setError("The PDF could not be rendered. You can still download or open it in a new tab.") })
    return () => { active = false; render?.cancel() }
  }, [pdf, pageNumber, zoom, width])

  return <section aria-label="PDF preview">
    <div className="oz-pdf-toolbar"><p className="oz-form-hint">{invoice.status === "draft" ? "Live PDF preview · Draft, not yet issued" : `${invoice.number} · Saved invoice`}</p>{url && <div className="oz-row-actions"><a href={url} className="oz-button" download={`${invoice.number.replace(/[^A-Za-z0-9-]/g, "-")}.pdf`}>{invoice.status === "draft" ? "Download preview PDF" : "Download PDF"}</a><a href={url} className="oz-small-button" target="_blank" rel="noreferrer">Open / print ↗</a></div>}</div>
    <div className="oz-pdf-controls" role="group" aria-label="PDF controls"><div><button type="button" aria-label="Previous PDF page" disabled={!pdf || pageNumber <= 1} onClick={() => setPageNumber(pageNumber - 1)}>←</button><span aria-live="polite">Page {pageNumber} / {pdf?.numPages || "—"}</span><button type="button" aria-label="Next PDF page" disabled={!pdf || pageNumber >= pdf.numPages} onClick={() => setPageNumber(pageNumber + 1)}>→</button></div><div><button type="button" aria-label="Zoom out" disabled={!pdf || zoom <= 0.5} onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}>−</button><span>{Math.round(zoom * 100)}%</span><button type="button" aria-label="Zoom in" disabled={!pdf || zoom >= 2} onClick={() => setZoom(Math.min(2, zoom + 0.25))}>+</button><button type="button" className="oz-pdf-fit" disabled={!pdf} onClick={() => setZoom(1)}>Fit</button></div></div>
    {error && <p className="oz-notice" role="alert">{error}</p>}
    <div ref={container} className="oz-pdf-canvas">{!pdf && !error && <p role="status">Building your invoice PDF…</p>}<canvas ref={canvas} role="img" aria-label={`Invoice page ${pageNumber} of ${pdf?.numPages || 1}`} data-rendered={rendered} hidden={!pdf} /></div>
    <p className="oz-form-hint" style={{ marginTop: 12 }}>This is the actual generated PDF. Use the invoice preview tab for its accessible text and table view.</p>
  </section>
}
