# Tutorial: Using RAG Exports with AI Tools

This tutorial shows you how to export documentation in RAG-compatible format and integrate with AI tools for intelligent code understanding.

## Prerequisites

- Generated documentation
- Documentation index
- Import graph built
- (Optional) OpenAI API key for embeddings

## Overview

RAG (Retrieval-Augmented Generation) integration enables:
- AI-powered code search and understanding
- Semantic similarity search
- Intelligent code recommendations
- Context-aware documentation queries
- Graph-based reasoning about dependencies

## Step 1: Generate RAG Export

Export documentation in RAG-compatible format:

```bash
node scripts/doc-system/cli.js rag-export --docs ./docs --output rag-export.json
```

**Expected output:**
```
Generating RAG export...
Processing 38 function documents...
Processing 5 group documents...
Building metadata...

RAG export complete!
- 43 documents exported
- Metadata included
- File saved to: rag-export.json
```

## Step 2: Examine the RAG Export

View the export structure:

```bash
cat rag-export.json | jq '.' | head -50
```

Structure:
```json
{
  "documents": [
    {
      "id": "func_fetchDocuments_1234",
      "content": "# fetchDocuments\n\nFetches documents from Supabase...",
      "metadata": {
        "type": "function",
        "name": "fetchDocuments",
        "filePath": "src/services/supabase/queries/fetchDocuments.ts",
        "docPath": "docs/services/supabase/queries/fetchDocuments.md",
        "group": "supabase",
        "complexity": 8,
        "dependencies": [
          "src/services/supabase/client/createClient.ts",
          "src/types/Document.ts"
        ],
        "usedBy": [
          "src/hooks/useDocuments/useDocuments.ts",
          "src/components/ui/DocumentList/DocumentList.tsx"
        ],
        "tags": ["database", "query", "supabase"],
        "exported": true
      }
    }
  ],
  "metadata": {
    "totalDocuments": 43,
    "groups": ["supabase", "search", "ui-components", "hooks", "utils"],
    "generatedAt": "2024-01-15T10:30:00.000Z",
    "version": "1.0.0",
    "projectName": "my-app",
    "statistics": {
      "totalFunctions": 38,
      "documentationCoverage": 100,
      "averageComplexity": 6.2
    }
  }
}
```

## Step 3: Generate Embeddings (Optional)

Generate vector embeddings for semantic search:

```bash
export OPENAI_API_KEY="your-api-key"
node scripts/doc-system/cli.js rag-export --embeddings --model text-embedding-ada-002
```

This adds embedding vectors to each document:

```json
{
  "id": "func_fetchDocuments_1234",
  "content": "...",
  "metadata": {...},
  "embedding": [0.123, -0.456, 0.789, ...]
}
```

## Step 4: Import into Vector Database

### Using Pinecone

```javascript
import { Pinecone } from '@pinecone-database/pinecone';
import ragExport from './rag-export.json';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

const index = pinecone.index('codebase-docs');

// Upsert documents
const vectors = ragExport.documents.map(doc => ({
  id: doc.id,
  values: doc.embedding,
  metadata: {
    content: doc.content,
    ...doc.metadata
  }
}));

await index.upsert(vectors);
```

### Using Weaviate

```javascript
import weaviate from 'weaviate-ts-client';
import ragExport from './rag-export.json';

const client = weaviate.client({
  scheme: 'http',
  host: 'localhost:8080'
});

// Create schema
await client.schema
  .classCreator()
  .withClass({
    class: 'CodeDocumentation',
    vectorizer: 'text2vec-openai',
    properties: [
      { name: 'content', dataType: ['text'] },
      { name: 'functionName', dataType: ['string'] },
      { name: 'filePath', dataType: ['string'] },
      { name: 'group', dataType: ['string'] },
      { name: 'complexity', dataType: ['int'] }
    ]
  })
  .do();

// Import documents
for (const doc of ragExport.documents) {
  await client.data
    .creator()
    .withClassName('CodeDocumentation')
    .withProperties({
      content: doc.content,
      functionName: doc.metadata.name,
      filePath: doc.metadata.filePath,
      group: doc.metadata.group,
      complexity: doc.metadata.complexity
    })
    .do();
}
```

### Using Chroma

```python
import chromadb
import json

# Load RAG export
with open('rag-export.json') as f:
    rag_data = json.load(f)

# Initialize Chroma
client = chromadb.Client()
collection = client.create_collection("codebase_docs")

# Add documents
collection.add(
    ids=[doc['id'] for doc in rag_data['documents']],
    documents=[doc['content'] for doc in rag_data['documents']],
    metadatas=[doc['metadata'] for doc in rag_data['documents']],
    embeddings=[doc.get('embedding') for doc in rag_data['documents']]
)
```

## Step 5: Query with AI

### Semantic Search

```javascript
// Query: "How do I fetch documents from the database?"
const results = await index.query({
  vector: await generateEmbedding("How do I fetch documents from the database?"),
  topK: 5,
  includeMetadata: true
});

results.matches.forEach(match => {
  console.log(`Function: ${match.metadata.name}`);
  console.log(`File: ${match.metadata.filePath}`);
  console.log(`Relevance: ${match.score}`);
  console.log('---');
});
```

### Natural Language Queries

```javascript
import OpenAI from 'openai';

const openai = new OpenAI();

async function askAboutCode(question) {
  // 1. Find relevant documentation
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: question
  });
  
  const results = await index.query({
    vector: embedding.data[0].embedding,
    topK: 3,
    includeMetadata: true
  });
  
  // 2. Build context from results
  const context = results.matches
    .map(m => m.metadata.content)
    .join('\n\n---\n\n');
  
  // 3. Ask GPT with context
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant that answers questions about a codebase using the provided documentation.'
      },
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${question}`
      }
    ]
  });
  
  return completion.choices[0].message.content;
}

// Usage
const answer = await askAboutCode("How do I fetch documents with filters?");
console.log(answer);
```

## Step 6: Graph-Based Reasoning

Export the import graph for dependency analysis:

```bash
node scripts/doc-system/cli.js graph --format json --output graph.json
```

### Query Dependencies

```javascript
import graph from './graph.json';

function findDependencies(functionName, depth = 1) {
  const node = graph.nodes.get(functionName);
  if (!node) return [];
  
  const deps = new Set();
  
  function traverse(nodeName, currentDepth) {
    if (currentDepth > depth) return;
    
    const node = graph.nodes.get(nodeName);
    node.imports.forEach(imp => {
      deps.add(imp.source);
      traverse(imp.source, currentDepth + 1);
    });
  }
  
  traverse(functionName, 1);
  return Array.from(deps);
}

// Find all dependencies of fetchDocuments
const deps = findDependencies('fetchDocuments', 2);
console.log('Dependencies:', deps);
```

### Find Usage Paths

```javascript
function findUsagePath(from, to) {
  const visited = new Set();
  const queue = [[from]];
  
  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];
    
    if (current === to) {
      return path;
    }
    
    if (visited.has(current)) continue;
    visited.add(current);
    
    const node = graph.nodes.get(current);
    node.usedBy.forEach(user => {
      queue.push([...path, user]);
    });
  }
  
  return null;
}

// Find how fetchDocuments is used in Dashboard
const path = findUsagePath('fetchDocuments', 'Dashboard');
console.log('Usage path:', path.join(' → '));
```

## Step 7: Build AI-Powered Tools

### Code Search Tool

```javascript
async function searchCode(query) {
  // Semantic search
  const embedding = await generateEmbedding(query);
  const results = await index.query({
    vector: embedding,
    topK: 10,
    includeMetadata: true
  });
  
  // Filter by relevance
  const relevant = results.matches.filter(m => m.score > 0.8);
  
  // Group by category
  const grouped = relevant.reduce((acc, match) => {
    const group = match.metadata.group;
    if (!acc[group]) acc[group] = [];
    acc[group].push(match);
    return acc;
  }, {});
  
  return grouped;
}
```

### Code Recommendation Tool

```javascript
async function recommendSimilarFunctions(functionName) {
  // Get function documentation
  const doc = ragExport.documents.find(d => 
    d.metadata.name === functionName
  );
  
  if (!doc) return [];
  
  // Find similar functions
  const results = await index.query({
    vector: doc.embedding,
    topK: 6, // +1 for self
    includeMetadata: true
  });
  
  // Exclude self and return
  return results.matches
    .filter(m => m.id !== doc.id)
    .map(m => ({
      name: m.metadata.name,
      similarity: m.score,
      reason: `Similar to ${functionName} (${(m.score * 100).toFixed(1)}% match)`
    }));
}
```

### Dependency Impact Analysis

```javascript
function analyzeImpact(functionName) {
  const node = graph.nodes.get(functionName);
  if (!node) return null;
  
  // Find all functions that depend on this one
  const directUsers = node.usedBy;
  const indirectUsers = new Set();
  
  function findIndirectUsers(fname) {
    const n = graph.nodes.get(fname);
    n.usedBy.forEach(user => {
      if (!indirectUsers.has(user)) {
        indirectUsers.add(user);
        findIndirectUsers(user);
      }
    });
  }
  
  directUsers.forEach(findIndirectUsers);
  
  return {
    function: functionName,
    directImpact: directUsers.length,
    totalImpact: directUsers.length + indirectUsers.size,
    affectedFiles: [...directUsers, ...indirectUsers]
  };
}
```

## Step 8: Create a Documentation Chatbot

```javascript
import OpenAI from 'openai';
import ragExport from './rag-export.json';

class DocumentationChatbot {
  constructor(apiKey) {
    this.openai = new OpenAI({ apiKey });
    this.conversationHistory = [];
  }
  
  async ask(question) {
    // Find relevant docs
    const embedding = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: question
    });
    
    const results = await index.query({
      vector: embedding.data[0].embedding,
      topK: 5,
      includeMetadata: true
    });
    
    // Build context
    const context = results.matches
      .map(m => `## ${m.metadata.name}\n${m.metadata.content}`)
      .join('\n\n');
    
    // Add to conversation
    this.conversationHistory.push({
      role: 'user',
      content: question
    });
    
    // Get response
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that answers questions about a codebase. 
                   Use the provided documentation to answer questions accurately.
                   If you don't know something, say so.
                   
                   Documentation:\n${context}`
        },
        ...this.conversationHistory
      ]
    });
    
    const answer = completion.choices[0].message.content;
    
    this.conversationHistory.push({
      role: 'assistant',
      content: answer
    });
    
    return answer;
  }
}

// Usage
const bot = new DocumentationChatbot(process.env.OPENAI_API_KEY);

console.log(await bot.ask("How do I fetch documents?"));
console.log(await bot.ask("What about filtering them?"));
console.log(await bot.ask("Show me an example"));
```

## Step 9: IDE Integration

### VSCode Extension

Create a VSCode extension that uses RAG exports:

```javascript
// extension.js
const vscode = require('vscode');
const ragExport = require('./rag-export.json');

function activate(context) {
  // Command: Search documentation
  let searchCommand = vscode.commands.registerCommand(
    'codebase-docs.search',
    async () => {
      const query = await vscode.window.showInputBox({
        prompt: 'Search documentation'
      });
      
      if (!query) return;
      
      // Search RAG export
      const results = ragExport.documents.filter(doc =>
        doc.content.toLowerCase().includes(query.toLowerCase())
      );
      
      // Show results
      const items = results.map(doc => ({
        label: doc.metadata.name,
        description: doc.metadata.filePath,
        detail: doc.content.substring(0, 100) + '...'
      }));
      
      const selected = await vscode.window.showQuickPick(items);
      
      if (selected) {
        // Open file
        const uri = vscode.Uri.file(selected.description);
        vscode.window.showTextDocument(uri);
      }
    }
  );
  
  context.subscriptions.push(searchCommand);
}

exports.activate = activate;
```

## Best Practices

1. **Update regularly**: Regenerate RAG exports when docs change
2. **Use embeddings**: Enable semantic search for better results
3. **Cache queries**: Cache common queries to reduce API costs
4. **Monitor usage**: Track which queries are most common
5. **Provide feedback**: Allow users to rate answer quality
6. **Combine approaches**: Use both semantic search and graph reasoning
7. **Keep context fresh**: Regenerate embeddings periodically

## Troubleshooting

### Issue: Embeddings are expensive

**Solution:** Generate embeddings only for changed documents:

```bash
node scripts/doc-system/cli.js rag-export --embeddings --incremental
```

### Issue: Search results are irrelevant

**Solution:** Improve document content and metadata:
- Add more detailed purpose descriptions
- Include usage examples
- Add relevant tags

### Issue: Graph queries are slow

**Solution:** Use a graph database:

```bash
node scripts/doc-system/cli.js graph --format graphml --output graph.graphml
# Import into Neo4j or similar
```

## Summary

You've learned how to:
- ✅ Generate RAG-compatible exports
- ✅ Create vector embeddings
- ✅ Import into vector databases
- ✅ Query with AI
- ✅ Use graph-based reasoning
- ✅ Build AI-powered tools
- ✅ Create a documentation chatbot
- ✅ Integrate with IDEs

## Next Steps

- Explore advanced RAG techniques
- Build custom AI tools for your team
- Integrate with your development workflow
- Share insights with your team

---

**Congratulations!** You've completed all tutorials for the Automated Documentation System. You now have a fully documented, AI-friendly codebase!
