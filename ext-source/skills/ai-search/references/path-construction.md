# Query Path Construction

## Query Path Construction

The `path` parameter specifies fields to search:
- Single: `"path": "title"`
- Multiple: `"path": ["title", "plot"]`
- Nested: `"path": "address.city"`
- Wildcard: `"path": { "wildcard": "*" }`
- Multi-analyzer: `"path": { "value": "title", "multi": "english" }`