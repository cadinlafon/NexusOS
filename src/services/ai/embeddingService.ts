import { aiService } from './aiService'

// Searching by meaning, kept deliberately small.
//
// It embeds the question and the documents it is handed, in memory, each time
// it is asked. There is no vector database and nothing is stored, so it suits a
// handful of documents, not a school's files. Real semantic search needs a
// later step: an index kept on a server, filled in as documents change.
//
// Permissions are the caller's job and are simple here: this service only ever
// sees the documents it is given, so hand it only what the person may read.

export interface SearchDocument {
  id: string
  title: string
  text: string
}

export interface SearchHit {
  document: SearchDocument
  /** Cosine similarity with the question, from -1 to 1. */
  score: number
}

export interface SearchResult {
  model: string
  dimensions: number
  hits: SearchHit[]
}

/** The embedding model reads about this much of each document. */
const MAX_CHARACTERS = 4000
const MAX_DOCUMENTS = 40

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let lengthA = 0
  let lengthB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    lengthA += a[i] * a[i]
    lengthB += b[i] * b[i]
  }
  return lengthA && lengthB ? dot / Math.sqrt(lengthA * lengthB) : 0
}

/** Ranks the given documents by how close their meaning is to the question. */
export async function semanticSearch(query: string, documents: SearchDocument[]): Promise<SearchResult> {
  const searchable = documents.filter((d) => (d.title + d.text).trim()).slice(0, MAX_DOCUMENTS)
  const { model, dimensions, embeddings } = await aiService.embed([
    query,
    ...searchable.map((d) => `${d.title}\n${d.text}`.slice(0, MAX_CHARACTERS)),
  ])
  const [queryVector, ...vectors] = embeddings
  const hits = searchable
    .map((document, index) => ({ document, score: cosineSimilarity(queryVector, vectors[index]) }))
    .sort((a, b) => b.score - a.score)
  return { model, dimensions, hits }
}
