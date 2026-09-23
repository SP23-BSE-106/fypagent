// Verifies that pdf-parse v2 (the API now used by /api/rag/upload) actually
// extracts readable text — not xref/trailer garbage.
import fs from 'node:fs'

function buildPdf(text) {
  const objs = []
  objs.push(`<< /Type /Catalog /Pages 2 0 R >>`)
  objs.push(`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`)
  objs.push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`
  )
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`
  objs.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  objs.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`)

  let pdf = `%PDF-1.4\n`
  const offsets = []
  objs.forEach((body, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`
  })
  const xrefStart = pdf.length
  pdf += `xref\n0 ${objs.length + 1}\n`
  pdf += `0000000000 65535 f \n`
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`
  return Buffer.from(pdf, 'latin1')
}

const SAMPLE =
  'Employee Probation Period Policy. The probationary period is 90 days from the date of hire.'

const buffer = buildPdf(SAMPLE)
fs.writeFileSync('.tmp-test.pdf', buffer)

const { PDFParse } = await import('pdf-parse')
const parser = new PDFParse({ data: buffer })
let text = ''
try {
  const result = await parser.getText()
  text = result.text || ''
} finally {
  await parser.destroy().catch(() => {})
}

console.log('--- EXTRACTED TEXT ---')
console.log(JSON.stringify(text))
console.log('----------------------')

const looksRaw =
  text.startsWith('%PDF-') || text.includes('startxref') || text.includes('trailer')
const hasContent = text.includes('90 days')

console.log('length      :', text.length)
console.log('raw-pdf-like:', looksRaw)
console.log('has "90 days":', hasContent)

if (looksRaw || !hasContent) {
  console.log('\nRESULT: FAIL — extraction still returns PDF structure data')
  process.exit(1)
}
console.log('\nRESULT: PASS — readable text extracted correctly')

// Also confirm the OLD (broken) call style really throws, proving the diagnosis.
let oldThrew = false
try {
  const mod = await import('pdf-parse')
  const fn = mod.default ?? mod
  await fn(buffer)
} catch (e) {
  oldThrew = true
  console.log('old v1-style call threw:', e.constructor.name + ':', e.message)
}
console.log('old-style-throws:', oldThrew)
