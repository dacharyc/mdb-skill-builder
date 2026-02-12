---
name: ai-search
description: Implement and optimize MongoDB Search, including Search indexes, queries, and configuration
---

# MongoDB Search

## Search Index Definition

Index definition JSON syntax and configuration options.

| Field | Type | Necessity | Description |
| --- | --- | --- | --- |
| analyzer | String | Optional | Specifies the analyzer to apply to string fields when indexing. If you set this only at the top and do not specify an analyzer for the fields in the index definition, MongoDB Search applies this analyzer to all the fields. To use a different analyzer for each field, you must specify a different analyzer for the field. If omitted, defaults to Standard Analyzer. |
| analyzers | Array of Custom Analyzers | Optional | Specifies the Custom Analyzers to use in this index. |
| mappings | Object | Required | Specifies how to index fields at different paths for this index. |
| mappings.dynamic | Boolean or Object | Optional | Enables dynamic mapping of field types or configures fields individually for this index. Value must be one of the following:boolean - set to true to recursively index all indexable field types or set to false to not dynamically index any of the indexable field types.object - specify the typeSet to use for recursively indexing all indexable field types. To learn more, see mappings.dynamic.typeSet. If omitted, defaults to false. If set to false, you must define the individual fields to statically index using mappings.fields. You can also configure fields individually to override default settings using mappings.fields. Settings for fields in mappings.fields override default settings. IMPORTANT: MongoDB Search automatically indexes all dynamically indexable field types in a document. MongoDB Search also recursively indexes all nested documents under the document, unless you explicitly override by setting dynamic to false. You can also configure dynamic indexing to only index specified field types using typeSets. To learn about the field types that you can enable for dynamic mappings, see MongoDB Search Field Types. For example index configurations, see Examples |
| mappings.dynamic.typeSet | String | Optional | References the name of the typeSets object that contains the list of field types to automatically and recursively index. Mutually exclusive with mappings.dynamic boolean flag. |
| mappings.fields | Object | Conditional | Specifies the fields that you want to index. Required only if dynamic mapping is false. You can't index fields that contain the dollar ($) sign at the start of the field name. To learn more, see Define Field Mappings. |
| searchAnalyzer | String | Optional | Specifies the analyzer to apply to query text before searching with it. If omitted, defaults to the analyzer that you specify for the analyzer option. If you omit both the searchAnalyzer and the analyzer options, defaults to the Standard Analyzer. |
| numPartitions | Integer | Optional | Specifies the number of sub-indexes to create if the document count exceeds two billion. The following values are valid: 1, 2, 4. If omitted, defaults to 1. To use index partitions, you must have search nodes deployed in your cluster. |
| storedSource | Boolean or Stored Source Definition | Optional | Specifies fields in the documents to store for query-time look-ups using the returnedStoredSource option. You can store fields of all MongoDB Search Field Types on MongoDB Search. Value can be one of the following:true, to store all fieldsfalse, to not store any fieldsObject that specifies the fields to include or exclude from storagestoredSource is only available on clusters running MongoDB 7.0+. If omitted, defaults to false. To learn more, see Define Stored Source Fields in Your MongoDB Search Index. |
| synonyms | Array of Synonym Mapping Definition | Optional | Specifies the synonym mappings to use in your index. An index definition can have only one synonym mapping. To learn more, see Define Synonym Mappings in Your MongoDB Search Index. |
| typeSets | Array of objects | Optional | Specifies the typeSets to use in this index for dynamic mappings. |
| typeSets.\[n].name | String | Required | Specifies the name of the typeSet configuration. |
| typeSets.\[n].types | Array of objects | Required | Specifies the field types, one per object, to index automatically using dynamic mappings. |
| typeSets.\[n].types.\[n].type | String | Required | Specifies the field type to automatically index. To learn more about the field types that you can configure for dynamic mapping, see Configure a typeSet. |

## Operators

Operators for $search and $searchMeta queries:

| Operator | Description | Supported MongoDB Search Types |
| --- | --- | --- |
| autocomplete | Performs a search-as-you-type query from an incomplete input string. | autocomplete |
| compound | Combines other operators into a single query. | Field types supported by the operators used inside the compound operator. |
| embeddedDocument | Queries fields in embedded documents, which are documents that are elements of an array. | embeddedDocuments and field types supported by the operators used inside the embeddedDocument operator. |
| equals | Checks whether the field contains the specified value, including null value. | booleandateobjectIdnumbertokenuuid |
| exists | Tests for the presence of a specified field, regardless of the field type. | Field type isn't used by the exists operator. |
| geoShape | Queries for values with specified geo shapes. | geo |
| geoWithin | Queries for points within specified geographic shapes. | geo |
| hasAncestor | Queries intermediary ancestor-level fields using returnScope. | Field type supported by the operator used in the query. |
| hasRoot | Queries root-level fields using returnScope. | Field type supported by the operator used in the query. |
| in | Queries both single value and array of values. | booleandateobjectIdnumbertokenuuid |
| knnBeta | (Deprecated) Performs semantic search using Hierarchical Navigable Small Worlds algorithm. | knnVector |
| moreLikeThis | Queries for similar documents. | string |
| near | Queries for values near a specified number, date, or geo point. | dategeo pointnumber |
| phrase | Searches documents for terms in an order similar to the query. | string |
| queryString | Supports querying a combination of indexed fields and values. | string |
| range | Queries for values within a specific numeric, date, string, and objectId range. | datenumberobjectIdtoken |
| regex | Interprets the query field as a regular expression. | string |
| span | (Deprecated) Specifies relative positional requirements for query predicates within specified regions of a text field. | string |
| text | Performs textual analyzed search. | string |
| vectorSearch | Performs semantic search using lexical pre-filters. | vector |
| wildcard | Supports special characters in the query string that can match any character. | string |

## Query Path Construction

The `path` parameter specifies fields to search:
- Single: `"path": "title"`
- Multiple: `"path": ["title", "plot"]`
- Nested: `"path": "address.city"`
- Wildcard: `"path": { "wildcard": "*" }`
- Multi-analyzer: `"path": { "value": "title", "multi": "english" }`

## Collectors

Collectors return metadata about query results:

| Collector | Description | Supported Field Types |
| --- | --- | --- |
| facet | Groups query results by values or ranges in specified, faceted fields and returns the count for each of those groups. | datenumbertoken (string) |

## Reference Documentation

Load these references for detailed information on specific topics:

- [$search and $searchMeta stages](references/search-and-searchMeta.md): Use these aggregation stages to run Search queries. $search returns matching documents; $searchMeta returns only metadata like counts and facets.
- [compound operator](references/compound-operator.md): Use the compound operator to combine multiple operators into a single query with must, mustNot, should, and filter clauses.
- [text operator](references/text-operator.md): Use the text operator for full-text search on string fields. Supports fuzzy matching, synonyms, and score boosting.
- [scoring](references/scoring.md): Documents are scored by relevance. Use this reference to understand how scoring works and how to modify scores with boost, constant, and function options.
- [field mappings](references/field-mappings.md): Define static or dynamic field mappings to control how fields are indexed. Required for specifying field types and analyzers.
- [analyzers](references/analyzers.md): Analyzers process text during indexing and querying. Choose from built-in analyzers (standard, simple, whitespace, keyword, language) or create custom analyzers.
- [synonyms configuration](references/synonyms.md): Configure synonym mappings to match equivalent terms (e.g., "car" matches "automobile"). Requires a synonyms source collection.
- [query performance](references/query-performance.md): Best practices for optimizing query performance, including using compound.filter instead of $match and avoiding $skip for pagination.
- [index performance](references/index-performance.md): Best practices for index sizing, avoiding mapping explosions, and configuring indexes for optimal performance.
- [index management](references/manage-indexes.md): Create, view, update, and delete MongoDB Search indexes using mongosh shell commands.