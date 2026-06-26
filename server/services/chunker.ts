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
  // Dynamic import so pdf-parse doesn't crash the server at startup
  // (it requires DOMMatrix which isn't available in serverless environments)
  const pdfParse = (await import('pdf-parse')).default as unknown as (buf: Buffer) => Promise<{ text: string }>
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
