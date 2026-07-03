import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

export interface Chunk {
  content: string
  metadata: {
    page_start: number
    page_end: number
    chunk_index: number
    filename: string
  }
}

export async function parsePdfToChunks(
  buffer: Buffer,
  filename: string
): Promise<Chunk[]> {
  if (typeof globalThis.DOMMatrix === 'undefined') {
    // @ts-expect-error stub for pdf-parse in serverless (text extraction only)
    globalThis.DOMMatrix = class DOMMatrix { constructor() { return Object.create(null) } }
  }
  if (typeof globalThis.Path2D === 'undefined') {
    // @ts-expect-error stub
    globalThis.Path2D = class Path2D {}
  }
  if (typeof globalThis.ImageData === 'undefined') {
    // @ts-expect-error stub
    globalThis.ImageData = class ImageData { constructor(public width = 0, public height = 0) {} }
  }
  const pdfParse = (await import('pdf-parse')).default as unknown as (buf: Buffer) => Promise<{ text: string; numpages: number }>
  const result = await pdfParse(buffer)

  if (!result.text.trim()) {
    throw new Error('PDF contains no extractable text')
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ['\n\n', '\n', '. ', ' ', ''],
  })

  const docs = await splitter.createDocuments([result.text])

  return docs.map((doc, i) => ({
    content: doc.pageContent,
    metadata: {
      page_start: 1,
      page_end: result.numpages,
      chunk_index: i,
      filename,
    },
  }))
}
