import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { PDFParse } from 'pdf-parse'

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
  const parser = new PDFParse({ data: buffer })
  await parser.load()
  const { text, numpages } = await parser.getText()

  if (!text.trim()) {
    throw new Error('PDF contains no extractable text')
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ['\n\n', '\n', '. ', ' ', ''],
  })

  const docs = await splitter.createDocuments([text])

  return docs.map((doc, i) => ({
    content: doc.pageContent,
    metadata: {
      page_start: 1,
      page_end: numpages,
      chunk_index: i,
      filename,
    },
  }))
}
