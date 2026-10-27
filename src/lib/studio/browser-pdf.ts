import type { Invoice } from "./schema"

// Retain only the latest document, shared by preview, download and email attachment.
let signature = ""
let pending: Promise<Uint8Array> | undefined

export async function browserInvoicePdf(invoice: Invoice): Promise<Uint8Array> {
  const next = JSON.stringify(invoice)
  if (!pending || signature !== next) {
    signature = next
    const operation = import("./pdf").then(({ invoicePdf }) => invoicePdf(invoice))
    pending = operation
    operation.catch(() => { if (pending === operation) pending = undefined })
  }
  return (await pending).slice()
}

export function pdfBase64(bytes: Uint8Array): string {
  let binary = ""
  for (let index = 0; index < bytes.length; index += 8192) binary += String.fromCharCode(...bytes.subarray(index, index + 8192))
  return btoa(binary)
}
