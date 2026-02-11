# Field Mappings

## Field Mappings

Control how fields are indexed. Use `"dynamic": true` to auto-index all fields, or `"dynamic": false` with explicit `fields` definitions.

Common field types: `string` (full-text), `token` (exact match/facets), `number`, `date`, `boolean`, `geo`, `autocomplete`.

Example static mapping:

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "title": { "type": "string", "analyzer": "lucene.standard" },
      "year": { "type": "number" },
      "genres": { "type": "token" }
    }
  }
}
```