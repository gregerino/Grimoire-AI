import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { extractText, getDocumentProxy } from 'unpdf'

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
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const { text, totalPages } = await extractText(pdf, { mergePages: true })
  const fullText = Array.isArray(text) ? text.join('\n\n') : text

  if (!fullText.trim()) {
    throw new Error('PDF contains no extractable text')
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ['\n\n', '\n', '. ', ' ', ''],
  })

  const docs = await splitter.createDocuments([fullText])

  return docs.map((doc, i) => ({
    content: doc.pageContent,
    metadata: {
      page_start: 1,
      page_end: totalPages,
      chunk_index: i,
      filename,
    },
  }))
}
