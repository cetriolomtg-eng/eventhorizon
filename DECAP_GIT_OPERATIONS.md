# Decap CMS - Git Operations & GitHub API Integration

## 1. GitHub API Integration Architecture

### API Base Configuration
```javascript
// GitHub API configuration (inferito dal debugging)
const githubAPI = {
  baseURL: 'https://api.github.com',
  repository: 'eventhorizon-mtg/eventhorizon-mtg.github.io',
  branch: 'main',
  headers: {
    'Authorization': `token ${getUserToken()}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Decap-CMS/3.8.4'
  }
};
```

### API Endpoint Mapping
```javascript
// GitHub API endpoints utilizzati da Decap
const apiEndpoints = {
  // Repository info
  repo: `/repos/${owner}/${repo}`,
  
  // File operations
  contents: `/repos/${owner}/${repo}/contents/{path}`,
  
  // Tree operations (for directory listing)
  trees: `/repos/${owner}/${repo}/git/trees/{sha}`,
  
  // Commit operations
  commits: `/repos/${owner}/${repo}/commits`,
  createCommit: `/repos/${owner}/${repo}/git/commits`,
  
  // Reference operations
  refs: `/repos/${owner}/${repo}/git/refs/heads/${branch}`,
  
  // User info
  user: '/user'
};
```

## 2. File Operations Deep Dive

### File Reading Process
```javascript
// Read file sequence (dal nostro fetch monitoring)
async function readFile(path) {
  // 1. GET contents API
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );
  
  const data = await response.json();
  
  // 2. Decode base64 content
  const content = atob(data.content.replace(/\n/g, ''));
  
  // 3. Parse based on file type
  if (path.endsWith('.yml') || path.endsWith('.yaml')) {
    return yaml.load(content);
  } else if (path.endsWith('.json')) {
    return JSON.parse(content);
  } else {
    return content; // Markdown, text, etc.
  }
}
```

### File Writing Process
```javascript
// Write file sequence (pattern inferito)
async function writeFile(path, content, message) {
  // 1. Get current file SHA (if exists)
  let fileSHA = null;
  try {
    const currentFile = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
    );
    if (currentFile.ok) {
      const data = await currentFile.json();
      fileSHA = data.sha;
    }
  } catch (e) {
    // File doesn't exist - new file
  }
  
  // 2. Encode content
  const encodedContent = btoa(unescape(encodeURIComponent(content)));
  
  // 3. Update file via Contents API
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message,
        content: encodedContent,
        sha: fileSHA, // Required for updates
        branch: branch
      })
    }
  );
  
  return response.json();
}
```

## 3. Content Serialization System

### YAML Content Processing
```javascript
// Content serialization per different formats
const serializers = {
  yaml: {
    serialize: (data) => {
      // Add frontmatter delimiters
      const frontmatter = yaml.dump(data.frontmatter || data);
      const body = data.body || '';
      
      if (body) {
        return `---\n${frontmatter}---\n${body}`;
      } else {
        return frontmatter;
      }
    },
    
    deserialize: (content) => {
      if (content.startsWith('---')) {
        // Parse frontmatter + body
        const parts = content.split(/\n---\n/);
        const frontmatter = yaml.load(parts[1]);
        const body = parts.slice(2).join('\n---\n');
        
        return { ...frontmatter, body };
      } else {
        // Pure YAML file
        return yaml.load(content);
      }
    }
  },
  
  json: {
    serialize: (data) => JSON.stringify(data, null, 2),
    deserialize: (content) => JSON.parse(content)
  }
};
```

### Content Transform Pipeline
```javascript
// Transform process: UI data → File content
function prepareContentForSave(entryData, collectionConfig) {
  const serializer = serializers[collectionConfig.format || 'yaml'];
  
  // 1. Apply field transforms
  const transformedData = applyFieldTransforms(entryData, collectionConfig.fields);
  
  // 2. Add metadata
  const withMetadata = {
    ...transformedData,
    date: transformedData.date || new Date().toISOString(),
    slug: generateSlug(transformedData.title)
  };
  
  // 3. Serialize to string
  return serializer.serialize(withMetadata);
}
```

## 4. Collection Scanning & File Discovery

### Directory Scanning Process
```javascript
// Scan collection folder (folder-based collections)
async function scanCollectionFolder(collectionConfig) {
  const { folder } = collectionConfig;
  
  // 1. Get repository tree
  const treeResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
  );
  const tree = await treeResponse.json();
  
  // 2. Filter files in collection folder
  const collectionFiles = tree.tree.filter(item => 
    item.path.startsWith(folder) && 
    item.type === 'blob' &&
    (item.path.endsWith('.md') || item.path.endsWith('.yml'))
  );
  
  // 3. Load file metadata
  const entries = await Promise.all(
    collectionFiles.map(file => loadFileMetadata(file.path))
  );
  
  return entries;
}
```

### Entry Metadata Extraction
```javascript
// Extract entry metadata for collection listing
async function loadFileMetadata(filePath) {
  const content = await readFile(filePath);
  const parsed = deserializeContent(content);
  
  return {
    slug: path.basename(filePath, path.extname(filePath)),
    path: filePath,
    title: parsed.title || 'Untitled',
    date: parsed.date || null,
    author: parsed.author || null,
    // ... other metadata fields
    lastModified: await getFileLastModified(filePath)
  };
}
```

## 5. Commit Strategy Analysis

### Single File Commit Pattern
```javascript
// Standard commit per single file change
async function commitSingleFile(filePath, content, message) {
  // Uses Contents API - creates automatic commit
  return await writeFile(filePath, content, message);
}
```

### Batch Commit Pattern (Advanced)
```javascript
// Multiple files in single commit (se supportato)
async function commitMultipleFiles(changes, message) {
  // 1. Get current commit SHA
  const refResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`
  );
  const ref = await refResponse.json();
  const currentCommitSHA = ref.object.sha;
  
  // 2. Get current tree
  const commitResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/commits/${currentCommitSHA}`
  );
  const commit = await commitResponse.json();
  const currentTreeSHA = commit.tree.sha;
  
  // 3. Create new tree with changes
  const tree = changes.map(change => ({
    path: change.path,
    mode: '100644',
    type: 'blob',
    content: change.content
  }));
  
  const treeResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees`,
    {
      method: 'POST',
      headers: githubHeaders,
      body: JSON.stringify({
        base_tree: currentTreeSHA,
        tree: tree
      })
    }
  );
  const newTree = await treeResponse.json();
  
  // 4. Create new commit
  const newCommitResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/commits`,
    {
      method: 'POST',
      headers: githubHeaders,
      body: JSON.stringify({
        message: message,
        tree: newTree.sha,
        parents: [currentCommitSHA]
      })
    }
  );
  const newCommit = await newCommitResponse.json();
  
  // 5. Update branch reference
  return await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
    {
      method: 'PATCH',
      headers: githubHeaders,
      body: JSON.stringify({
        sha: newCommit.sha
      })
    }
  );
}
```

## 6. Media Upload System

### Image Upload Process
```javascript
// Media upload to static folder
async function uploadMedia(file, mediaFolder) {
  // 1. Read file as base64
  const reader = new FileReader();
  const base64Content = await new Promise(resolve => {
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(file);
  });
  
  // 2. Generate unique filename
  const timestamp = Date.now();
  const filename = `${timestamp}-${file.name}`;
  const filePath = `${mediaFolder}/${filename}`;
  
  // 3. Upload to repository
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      method: 'PUT',
      headers: githubHeaders,
      body: JSON.stringify({
        message: `Upload media: ${filename}`,
        content: base64Content,
        branch: branch
      })
    }
  );
  
  const result = await response.json();
  
  // 4. Return public URL
  return {
    path: filePath,
    url: `/${mediaFolder}/${filename}`, // Public folder path
    sha: result.content.sha
  };
}
```

## 7. Conflict Resolution & Error Handling

### Conflict Detection
```javascript
// Handle concurrent edits
async function saveWithConflictDetection(filePath, content, originalSHA) {
  try {
    return await writeFile(filePath, content, 'Update content', originalSHA);
  } catch (error) {
    if (error.status === 409) {
      // Conflict detected
      return handleConflict(filePath, content, originalSHA);
    }
    throw error;
  }
}

async function handleConflict(filePath, localContent, originalSHA) {
  // 1. Get current file state
  const currentFile = await readFile(filePath);
  
  // 2. Show conflict resolution UI
  return showConflictResolution({
    originalContent: originalContent,
    localContent: localContent,
    currentContent: currentFile.content,
    onResolve: (resolvedContent) => {
      return writeFile(filePath, resolvedContent, 'Resolve conflict');
    }
  });
}
```

### Rate Limiting Handling
```javascript
// GitHub API rate limit management
const rateLimiter = {
  requests: [],
  
  async makeRequest(requestFn) {
    // Track request timing
    this.requests.push(Date.now());
    
    // Clean old requests (1 hour window)
    const oneHour = 60 * 60 * 1000;
    this.requests = this.requests.filter(time => 
      Date.now() - time < oneHour
    );
    
    try {
      return await requestFn();
    } catch (error) {
      if (error.status === 403 && error.headers['x-ratelimit-remaining'] === '0') {
        // Rate limited - show user notification
        const resetTime = new Date(error.headers['x-ratelimit-reset'] * 1000);
        throw new RateLimitError(`Rate limit exceeded. Resets at ${resetTime}`);
      }
      throw error;
    }
  }
};
```

## 8. Performance Optimizations

### Caching Strategy
```javascript
// File content caching
const fileCache = new Map();

async function readFileWithCache(filePath) {
  const cacheKey = `${owner}/${repo}/${branch}/${filePath}`;
  
  if (fileCache.has(cacheKey)) {
    const cached = fileCache.get(cacheKey);
    
    // Check if cache is still valid (5 minutes)
    if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.content;
    }
  }
  
  const content = await readFile(filePath);
  fileCache.set(cacheKey, {
    content,
    timestamp: Date.now()
  });
  
  return content;
}
```

### Lazy Loading Implementation
```javascript
// Lazy load collection entries
async function loadCollectionEntries(collectionConfig, page = 1, limit = 20) {
  const entries = await scanCollectionFolder(collectionConfig);
  
  // Sort by date (newest first)
  entries.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Paginate
  const start = (page - 1) * limit;
  const end = start + limit;
  const pageEntries = entries.slice(start, end);
  
  // Load full content for visible entries only
  return await Promise.all(
    pageEntries.map(entry => loadEntryContent(entry.path))
  );
}
```

## 9. API Call Monitoring & Debug

### Network Monitoring Pattern
Dal nostro debug tool implementato:

```javascript
// Monitor all API calls for analysis
function monitorGitHubAPICalls() {
  const apiCalls = [];
  
  const originalFetch = window.fetch;
  window.fetch = function(url, options = {}) {
    if (url.includes('api.github.com')) {
      console.group(`📡 GitHub API: ${options.method || 'GET'} ${url}`);
      console.log('Headers:', options.headers);
      if (options.body) {
        console.log('Body:', JSON.parse(options.body));
      }
      
      const startTime = Date.now();
      
      return originalFetch(url, options)
        .then(response => {
          const duration = Date.now() - startTime;
          console.log(`✅ ${response.status} (${duration}ms)`);
          
          // Log rate limit headers
          if (response.headers.get('x-ratelimit-remaining')) {
            console.log('Rate limit remaining:', response.headers.get('x-ratelimit-remaining'));
          }
          
          console.groupEnd();
          return response;
        })
        .catch(error => {
          console.error('❌ API Error:', error);
          console.groupEnd();
          throw error;
        });
    }
    
    return originalFetch(url, options);
  };
}
```

### Common API Call Patterns Observed
```javascript
// Typical API call sequence for loading CMS
const typicalSequence = [
  'GET /user',                           // Verify authentication
  'GET /repos/owner/repo',               // Repository info
  'GET /repos/owner/repo/contents/config.yml', // Load CMS config
  'GET /repos/owner/repo/git/trees/main?recursive=1', // Scan content
  'GET /repos/owner/repo/contents/path/to/file.md', // Load specific files
];
```

---

*Analisi basata su monitoring delle API calls e reverse engineering - Ottobre 2025*