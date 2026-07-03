import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import mammoth from 'mammoth'

// worker lokal via Vite bundler — lebih stabil daripada CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

async function extractFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let text = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map((item) => item.str).join(' ')
    text += pageText + '\n'
  }

  return text.trim()
}

async function extractFromDocx(file) {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value.trim()
}

export async function extractResumeText(file) {
  const ext = file.name.split('.').pop().toLowerCase()

  if (ext === 'pdf') {
    return extractFromPdf(file)
  }
  if (ext === 'docx') {
    return extractFromDocx(file)
  }
  if (ext === 'txt') {
    return file.text()
  }

  throw new Error('Format file tidak didukung. Gunakan PDF, DOCX, atau TXT.')
}