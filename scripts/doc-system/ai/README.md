# AI Integration Layer

The AI Integration Layer provides RAG (Retrieval-Augmented Generation) exports and graph-based reasoning capabilities for AI-powered code understanding.

## Components

### AIIntegrationLayer

Main class that orchestrates AI integration features:

- **RAG Export**: Convert documentation to RAG-compatible format
- **Graph Queries**: Search and traverse the import graph
- **Semantic Search**: Find related functions using embeddings
- **Graph Export**: Export graph in multiple formats

### GraphExporter

Exports the import graph in various formats:

- **Mermaid**: Markdown-compatible diagrams
- **GraphML**: XML format for graph databases
- **JSON**: Full graph structure with metadata
- **DOT**: Graphviz format for visualization
- **Subgraph**: Export specific file dependencies

### EmbeddingGenerator

Generates and caches embeddings for semantic search:

- **Local Embeddings**: Simple TF-IDF-based vectors
- **API Embeddings**: OpenAI or other embedding APIs
- **Similarity Search**: Find related documents
- **Cache Management**: Persistent embedding cache

## Usage

### Basic RAG Export

```typescript
import { AIIntegrationLayer } from './ai/index.js';
import { ImportGraphBuilder } from './graph/ImportGraphBuilder.js';

// Build import graph
const graphBuilder = new ImportGraphBuilder(rootPath);
const graph = await graphBuilder.buildGraph();

// Create AI integration layer
const aiLayer = new AIIntegrationLayer(graph, 'docs', rootPath);

// Export for RAG
const ragExport = await aiLayer.exportForRAG();

console.log(`Exported ${ragExport.documents.length} documents`);
console.log(`Groups: ${ragExport.metadata.groups.join(', ')}`);
```

### Graph Queries

```typescript
// Find dependencies
const deps = await aiLayer.queryGraph({
  type: 'dependencies',
  target: 'src/lib/utils.ts',
  depth: 2,
});

console.log(`Found ${deps.nodes.length} dependencies`);

// Find dependents (reverse dependencies)
const dependents = await aiLayer.queryGraph({
  type: 'dependents',
  target: 'src/lib/utils.ts',
  depth: 1,
});

// Find path between two files
const path = await aiLayer.queryGraph({
  type: 'path',
  target: 'src/App.tsx:src/lib/utils.ts',
});

// Find related files
const related = await aiLayer.queryGraph({
  type: 'related',
  target: 'src/lib/utils.ts',
});
```

### Graph Export

```typescript
// Export as Mermaid diagram
const mermaid = aiLayer.exportToMermaid();
console.log(mermaid);

// Export as GraphML (for Neo4j, etc.)
const graphml = aiLayer.exportToGraphML();

// Export as JSON with statistics
const json = aiLayer.exportToJSON(true);

// Export subgraph for specific file
const subgraph = aiLayer.exportSubgraphMermaid('src/App.tsx', 2);
```

### Semantic Search with Embeddings

```typescript
// Create AI layer with embedding support
const aiLayer = new AIIntegrationLayer(
  graph,
  'docs',
  rootPath,
  {
    model: 'text-embedding-ada-002',
    cacheDir: '.cache/embeddings',
    apiKey: process.env.OPENAI_API_KEY,
  }
);

// Initialize embeddings
await aiLayer.initializeEmbeddings();

// Generate embeddings for documents
const ragExport = await aiLayer.exportForRAG();
await aiLayer.generateEmbeddings(ragExport.documents);

// Semantic search
const results = await aiLayer.semanticSearch(
  'authentication and user management',
  ragExport.documents,
  10,
  0.7
);

console.log('Similar functions:');
results.forEach((r) => {
  console.log(`  ${r.document.metadata.functionName} (${r.similarity.toFixed(2)})`);
});

// Find related functions
const related = await aiLayer.findRelatedFunctions(
  'authenticateUser',
  ragExport.documents,
  0.7,
  5
);
```

### Graph Statistics

```typescript
const stats = aiLayer.getGraphStatistics();

console.log(`Total nodes: ${stats.totalNodes}`);
console.log(`Total edges: ${stats.totalEdges}`);
console.log(`Average dependencies: ${stats.averageDependencies}`);
console.log(`Max depth: ${stats.maxDepth}`);
console.log(`Circular dependencies: ${stats.circularDependencies}`);
```

## RAG Document Format

Each RAG document includes:

```typescript
{
  id: string;              // Unique document ID
  content: string;         // Full markdown content
  metadata: {
    type: 'function' | 'group' | 'component';
    filePath: string;      // Source file path
    group: string;         // Logical group
    complexity?: number;   // Cyclomatic complexity
    dependencies: string[]; // Import dependencies
    functionName?: string; // Function name (if applicable)
    usedIn?: string[];     // Files that use this function
  };
  embedding?: number[];    // Vector embedding (if generated)
}
```

## Embedding Models

### Local Embeddings

Simple TF-IDF-based embeddings (no API required):

```typescript
const aiLayer = new AIIntegrationLayer(
  graph,
  'docs',
  rootPath,
  {
    model: 'local-tfidf',
    cacheDir: '.cache/embeddings',
  }
);
```

### OpenAI Embeddings

High-quality embeddings using OpenAI API:

```typescript
const aiLayer = new AIIntegrationLayer(
  graph,
  'docs',
  rootPath,
  {
    model: 'text-embedding-ada-002',
    cacheDir: '.cache/embeddings',
    apiKey: process.env.OPENAI_API_KEY,
  }
);
```

## Cache Management

Embeddings are cached to avoid regeneration:

```typescript
// Get cache statistics
const stats = aiLayer.getEmbeddingStats();
console.log(`Cached embeddings: ${stats?.size}`);

// Clear cache
await aiLayer.clearEmbeddingCache();
```

## Integration with AI Tools

### LangChain

```typescript
import { Document } from 'langchain/document';

const ragExport = await aiLayer.exportForRAG();

const documents = ragExport.documents.map(
  (doc) =>
    new Document({
      pageContent: doc.content,
      metadata: doc.metadata,
    })
);

// Use with LangChain vector store
```

### Custom RAG Pipeline

```typescript
// Export RAG documents
const ragExport = await aiLayer.exportForRAG();

// Generate embeddings
await aiLayer.generateEmbeddings(ragExport.documents);

// Save to your vector database
for (const doc of ragExport.documents) {
  await vectorDB.insert({
    id: doc.id,
    content: doc.content,
    embedding: doc.embedding,
    metadata: doc.metadata,
  });
}

// Query with semantic search
const query = 'How do I authenticate users?';
const results = await aiLayer.semanticSearch(
  query,
  ragExport.documents,
  5,
  0.6
);
```

## Graph Database Integration

### Neo4j

```typescript
// Export as GraphML
const graphml = aiLayer.exportToGraphML();

// Import into Neo4j using APOC
// CALL apoc.import.graphml(graphml, {})
```

### Custom Graph Database

```typescript
// Export as JSON
const graphJson = aiLayer.exportToJSON(true);
const graph = JSON.parse(graphJson);

// Insert nodes
for (const node of graph.nodes) {
  await db.createNode({
    id: node.id,
    filePath: node.filePath,
    type: node.type,
    exports: node.exports,
  });
}

// Insert edges
for (const edge of graph.edges) {
  await db.createEdge({
    from: edge.from,
    to: edge.to,
    symbols: edge.symbols,
  });
}
```

## Performance Considerations

- **Embedding Generation**: Can be slow for large codebases. Use caching and batch processing.
- **Graph Queries**: Depth-limited queries prevent infinite loops in circular dependencies.
- **Memory Usage**: Large graphs may require streaming or pagination.
- **API Rate Limits**: Built-in rate limiting for external embedding APIs.

## Future Enhancements

- Support for more embedding models (Cohere, HuggingFace, etc.)
- Incremental embedding updates
- Distributed graph processing
- Real-time semantic search
- Graph visualization UI
