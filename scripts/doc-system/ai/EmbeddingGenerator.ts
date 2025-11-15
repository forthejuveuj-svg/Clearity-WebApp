/**
 * Embedding Generator - Generate and cache embeddings for semantic search
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { createHash } from 'crypto';
import { RAGDocument } from './types.js';

export interface EmbeddingCache {
  version: string;
  model: string;
  embeddings: Map<string, number[]>;
  metadata: {
    totalEmbeddings: number;
    lastUpdated: string;
  };
}

export interface SimilarityResult {
  documentId: string;
  similarity: number;
  document: RAGDocument;
}

export class EmbeddingGenerator {
  private model: string;
  private cacheDir: string;
  private cache: Map<string, number[]>;
  private apiKey?: string;

  constructor(model: string, cacheDir: string, apiKey?: string) {
    this.model = model;
    this.cacheDir = cacheDir;
    this.cache = new Map();
    this.apiKey = apiKey;
  }

  /**
   * Initialize the embedding generator and load cache
   */
  async initialize(): Promise<void> {
    await this.loadCache();
  }

  /**
   * Generate embeddings for documents
   */
  async generateEmbeddings(documents: RAGDocument[]): Promise<void> {
    console.log(`🧠 Generating embeddings for ${documents.length} documents...`);

    let generated = 0;
    let cached = 0;

    for (const doc of documents) {
      // Check if embedding already exists in cache
      if (this.cache.has(doc.id)) {
        doc.embedding = this.cache.get(doc.id);
        cached++;
        continue;
      }

      // Generate new embedding
      try {
        const embedding = await this.generateEmbedding(doc.content);
        doc.embedding = embedding;
        this.cache.set(doc.id, embedding);
        generated++;

        // Rate limiting for API calls
        if (this.apiKey) {
          await this.sleep(100); // 100ms delay between API calls
        }
      } catch (error) {
        console.error(`Failed to generate embedding for ${doc.id}:`, error);
      }
    }

    console.log(
      `✅ Generated ${generated} new embeddings, used ${cached} from cache`
    );

    // Save cache
    await this.saveCache();
  }

  /**
   * Generate embedding for a single text
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // Check if API key is provided for external API
    if (this.apiKey) {
      return await this.generateEmbeddingAPI(text);
    }

    // Use local embedding generation (simple TF-IDF-like approach)
    return this.generateEmbeddingLocal(text);
  }

  /**
   * Generate embedding using external API (OpenAI, etc.)
   */
  private async generateEmbeddingAPI(text: string): Promise<number[]> {
    // This is a placeholder for API-based embedding generation
    // In production, this would call OpenAI's embedding API or similar

    if (this.model.includes('openai') || this.model.includes('ada')) {
      // OpenAI API call
      try {
        const response = await fetch(
          'https://api.openai.com/v1/embeddings',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
              model: this.model,
              input: text.substring(0, 8000), // Limit text length
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        const data = (await response.json()) as {
          data: Array<{ embedding: number[] }>;
        };
        return data.data[0].embedding;
      } catch (error) {
        console.error('API embedding generation failed:', error);
        // Fall back to local generation
        return this.generateEmbeddingLocal(text);
      }
    }

    // For other models, fall back to local generation
    return this.generateEmbeddingLocal(text);
  }

  /**
   * Generate embedding locally using simple vector representation
   * This is a basic implementation for demonstration purposes
   */
  private generateEmbeddingLocal(text: string): number[] {
    // Normalize text
    const normalized = text.toLowerCase();

    // Extract features (simple bag-of-words approach)
    const words = normalized.match(/\b\w+\b/g) || [];
    const wordFreq = new Map<string, number>();

    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }

    // Create a fixed-size embedding vector (384 dimensions)
    const embeddingSize = 384;
    const embedding = new Array(embeddingSize).fill(0);

    // Use hash-based feature mapping
    for (const [word, freq] of wordFreq) {
      const hash = this.hashString(word);
      const index = Math.abs(hash) % embeddingSize;

      // TF-IDF-like weighting (simplified)
      const tf = freq / words.length;
      embedding[index] += tf;
    }

    // Normalize the vector
    const magnitude = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0)
    );

    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }

    return embedding;
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Find similar documents using cosine similarity
   */
  async findSimilar(
    query: string | number[],
    documents: RAGDocument[],
    topK: number = 10,
    minSimilarity: number = 0.5
  ): Promise<SimilarityResult[]> {
    // Generate embedding for query if it's a string
    const queryEmbedding =
      typeof query === 'string'
        ? await this.generateEmbedding(query)
        : query;

    // Calculate similarities
    const results: SimilarityResult[] = [];

    for (const doc of documents) {
      if (!doc.embedding) {
        continue;
      }

      const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);

      if (similarity >= minSimilarity) {
        results.push({
          documentId: doc.id,
          similarity,
          document: doc,
        });
      }
    }

    // Sort by similarity (descending) and return top K
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Load embedding cache from disk
   */
  private async loadCache(): Promise<void> {
    const cachePath = this.getCachePath();

    if (!existsSync(cachePath)) {
      console.log('📦 No embedding cache found, starting fresh');
      return;
    }

    try {
      const content = await readFile(cachePath, 'utf-8');
      const data = JSON.parse(content);

      // Validate cache version and model
      if (data.version !== '1.0.0' || data.model !== this.model) {
        console.log(
          '⚠️  Cache version or model mismatch, starting fresh'
        );
        return;
      }

      // Load embeddings
      this.cache = new Map(Object.entries(data.embeddings));

      console.log(
        `📦 Loaded ${this.cache.size} embeddings from cache`
      );
    } catch (error) {
      console.error('Failed to load embedding cache:', error);
    }
  }

  /**
   * Save embedding cache to disk
   */
  private async saveCache(): Promise<void> {
    const cachePath = this.getCachePath();

    // Ensure directory exists
    const dir = dirname(cachePath);
    await mkdir(dir, { recursive: true });

    const data = {
      version: '1.0.0',
      model: this.model,
      embeddings: Object.fromEntries(this.cache),
      metadata: {
        totalEmbeddings: this.cache.size,
        lastUpdated: new Date().toISOString(),
      },
    };

    try {
      await writeFile(cachePath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`💾 Saved ${this.cache.size} embeddings to cache`);
    } catch (error) {
      console.error('Failed to save embedding cache:', error);
    }
  }

  /**
   * Get cache file path
   */
  private getCachePath(): string {
    const modelHash = createHash('md5')
      .update(this.model)
      .digest('hex')
      .substring(0, 8);
    return join(this.cacheDir, `embeddings-${modelHash}.json`);
  }

  /**
   * Clear embedding cache
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
    const cachePath = this.getCachePath();

    if (existsSync(cachePath)) {
      const { unlink } = await import('fs/promises');
      await unlink(cachePath);
      console.log('🗑️  Embedding cache cleared');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    model: string;
    cacheDir: string;
  } {
    return {
      size: this.cache.size,
      model: this.model,
      cacheDir: this.cacheDir,
    };
  }

  /**
   * Sleep utility for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Batch generate embeddings with progress reporting
   */
  async generateEmbeddingsBatch(
    documents: RAGDocument[],
    batchSize: number = 10
  ): Promise<void> {
    console.log(
      `🧠 Generating embeddings in batches of ${batchSize}...`
    );

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      await this.generateEmbeddings(batch);

      const progress = Math.min(
        ((i + batchSize) / documents.length) * 100,
        100
      );
      console.log(`Progress: ${progress.toFixed(1)}%`);
    }

    console.log('✅ Batch embedding generation complete');
  }
}
