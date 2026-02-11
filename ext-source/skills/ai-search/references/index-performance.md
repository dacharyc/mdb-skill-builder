# Index Performance

# Index Performance Best Practices

## Index Size and Configuration

### Index Size and Configuration

<Important>
  If you create a MongoDB Search index for a collection that has or will soon
  have more than 2.1 billion index objects, use the numPartitions
  index option to partition your index
  or Deploy a Sharded Cluster. Index partitions
  are limited to 2.1 billion objects per partition.
</Important>

When you create a MongoDB Search index a MongoDB Search index, field mapping
defaults to dynamic mappings, which means that
MongoDB Search dynamically indexes all the supported types in your collection. Other options
such as enabling highlights can also result in your index taking up more
disk space. You can reduce the size and performance footprint of your
MongoDB Search index by:

- Specifying a custom index definitions to narrow the amount and type of data that is
  indexed.

- Setting the `store` option to `false` when specifying a
  string type in an index definition.

Some limitations apply to MongoDB Search on `M0` and Flex clusters
only. To learn more, see
MongoDB Search Search Free and Flex Tier Limitations.

#### Considerations

Some index configuration options can lead to indexes that take up a
significant proportion of your disk space. In some cases, your index
could be many times larger than the size of your data. Although this is
expected behavior, it's important to be aware of the following
indexing-intensive features:

##### Autocomplete

The MongoDB Search autocomplete operator can be used to build
functionality similar to search-as-you-type in your application. The
MongoDB Search tokenization field type
can cause large indexes, especially in the following cases:

- Using `nGram` tokenization.

- Setting a wide `minGrams` to `maxGrams`  range.

- Setting a `minGram` value of `1` on a collection with millions of
  documents.

You can reduce the space used by the `autocomplete` type index by
doing the following:

- Reduce the range of `minGrams` and `maxGrams` to the minimum.
  Generally, we recommend setting `maxGrams` to the character count of
  the longest word in the field that you want to query. If you are
  unsure, for English language fields, we recommend starting with
  `maxGrams` value of `10`.

- Avoid `nGram` tokenization strategy as, for a given string, MongoDB Search
  creates more tokens for `nGram` than for `edgeGram` or
  `rightEdgeGram` tokenization.

When indexing a `string` field as the tokenization type, we recommend that you index the
field as the MongoDB Search string type also for
the following advantages:

- Boost the score of exact matches when using the
  autocomplete operator.

- Query the same field in the same query using the
  autocomplete operator and another operator that supports
  string search, such as the text operator. For an example,
  see the Search Across Multiple Fields example.

###### Embedded Documents

MongoDB Search stops replicating changes for indexes larger than 2,100,000,000
index objects per partition, on a replica set or single shard, where each indexed
embedded parent document counts as a single object. Surpassing this limit may
result in stale query results.

Using the `embeddedDocuments` field type can result in indexing objects over
this index size limit, because each indexed embedded document is counted as a single object.
If you create a MongoDB Search index that has or will soon
have more than 2.1 billion index objects, use the numPartitions index option
to partition your index (supported only on Search Nodes deployments) or Deploy a Sharded Cluster.

The exact number of index objects can vary based on the rate of document
changes and deletions. The MongoDB Search charts metric provides the upper bound of the
current number of index objects across all indexes per replica set or
shard. This metric indicates the largest count of Lucene documents in a
single search index within a replica set or shard. For example, if the
metric displays "1.5 billion", among all your search indexes, the index
with the highest number of Lucene documents contains about 1.5 billion
documents.

You can approximate the expected number of index objects in a single
index by doing the following steps:

- Calculate the number of index objects per document. For every level of nesting, each embedded document counts as a separate index object.

  ```shell
  number of index objects in document = 1 + number of nested embedded documents
  ```

- Multiply the number of index objects per document by the
  total number of documents in the collection

  ```shell
  total number of index objects = number of index objects in document x total number of documents in collection
  ```

Note that this approximation is a lower bound.

### Example

Consider the [collection](https://search-playground.mongodb.com/tools/code-sandbox/snapshots/6601831bf3ec7476bd9da8c9) named
`schools`, described in this About this Tutorial, and suppose the
collection contains 1000 documents similar to the following:

```json
{
  "_id": 0,
  "name": "Springfield High",
  "mascot": "Pumas",
  "teachers": [
    {
      "first": "Jane",
      "last": "Smith",
      "classes": [
        {
          "subject": "art of science",
          "grade": "12th"
        },
        ... // 2 more embedded documents
      ]
    },
    ... // 1 more embedded document
  ],
  "clubs": {
    "stem": [
      {
        "club_name": "chess",
        "description": "provides students opportunity to play the board game of chess informally and competitively in tournaments."
      },
      ... // 1 more embedded document
    ],
    ... // 1 more embedded document
  }
}
```

Now consider the index definition for the following fields in the
`schools` collection:

#### Nested Array

Nested Array

The array of documents named `teachers` is indexed as the
`embeddedDocuments` type with dynamic mappings enabled.
However, the `classes` field *isn't indexed*. Use the
following to calculate the index objects:

- Calculate the number of index objects per document.

      ```shell
      Number of ``teachers`` embedded documents = up to 2
      Total number of index objects per document = 1 + 2 = 3
      ```

- Multiply by the total number of documents in the collection.

      ```shell
      Number of documents in the collection = 1000
      Number of index objects per document = 3
      Total number of index objects for collection = 1000 x 3 = 3000
      ```

#### Nested Within Array

Nested Array Within Array

The arrays of documents named `teachers` and
`teachers.classes` are indexed as the `embeddedDocuments`
type with dynamic mappings enabled. Use the following to
calculate the index objects:

- Calculate the number of index objects per document:

      ```shell
      Number of documents = 1
      Number of ``teachers`` embedded documents  = up to 2
      Number of ``classes`` embedded documents = up to 3
      Number of index objects per document = 1 + ( 2 x 3 ) = 7
      ```

- Multiply by the total number of documents in the collection.

      ```shell
      Number of documents in the collection = 1000
      Number of index objects per document = 7
      Total number of index objects: 1000 x 7 = 7000
      ```

If your collection has large arrays that might generate 2,100,000,000
index objects, you must Deploy a Sharded Cluster any
clusters that contain indexes with the `embeddedDocuments` type.

#### Faceted Search

If you want to filter and facet your data using the same field, we
recommend that you index the field as following MongoDB Search types:

- token

- number

- date

For an example of filtering the data by another field for faceting, see
the How to Use Facets with MongoDB Search tutorial.

##### `multi` Analyzers

Using a `multi` analyzer to analyze the same field multiple
different ways can cause large indexes, especially when analyzing
fields with very long values.

###### Multilingual Search

You can use the MongoDB Search Language awareness to index many
languages. For the list of languages for which MongoDB Search provides built-in
analyzers, see the Language awareness. To index and query
languages that are currently not in the list of built-in
Language awareness, you can create a Custom analyzers. For an example, see the
Custom Language Analyzer Example.

Suppose you have one document for each language in your collection.
Consider the following:

- You can index the fields separately in the same index using the
  Language awareness. A single index can support multiple
  languages in the same query.

- Alternatively, you can create an index per language, which is useful
  in isolating the different language documents. Note that each index
  is a change stream cursor and so this might be expensive to
  maintain.

- If you have the language documents nested inside a parent document,
  you can create a single index. However, your index definition payload
  might be large and your query might be complex.

To learn more about these data models and index definitions, see the
[MongoDB blog](https://www.mongodb.com/developer/products/atlas/atlas-search-multi-language-data-modeling.md).

###### Synonym Collections

Inserts and updates to a synonym source collection are fast only if the
synonym source collection is small. For best performance, we recommend
batching inserts and updates to synonym source collections.

A Synonym definition doesn't require
additional disk space aside from the disk space utilized by the synonym
collection in the database. However, synonym mappings create artifacts
in memory and therefore, for synonym collections with many documents,
MongoDB Search creates artifacts that occupy more memory.

## Avoid Mapping Explosions

### Document Mapping Explosions

Mapping explosions occur when MongoDB Search indexes a document with arbitrary
keys and you have a dynamic mappings.
The `mongot` process might consume increasing amounts of memory and
could crash. If you add too many fields to an index, mapping explosions
can occur. To address this issue, you can upgrade your cluster or use a
dynamic mappings that does not index all
fields in your data.

When searching over fields using a wildcard path, design your search to use
a tuple-like schema. If you perform a wildcard path search that uses a
key-value schema, MongoDB Search indexes each key as its own field,
which can cause mapping explosions.

### Example

An example of a key-value schema
is as follows:

```
ruleBuilder: {
  ruleName1: <data>,
  ruleName2: <data>,
  .....
  ruleName1025: <data>
}
```

An example of the same data
restructured to use a tuple-like schema is as follows:

```
{
  ruleBuilder: [
    {name: ruleName1, data: <data>},
    {name: ruleName2, data: <data>},
    ...
    {name: ruleName1025, data: <data>}
  ]
}
```

## Storing Source Fields

### Storing Source Fields

You can storedSource fields to
store on MongoDB Search and improve performance of subsequent aggregation
pipeline stages like $sort, $match,
$group, and $skip. Use this optimization if
your original documents and matched dataset are so large that a full
data lookup is inefficient. To learn more about storing specific fields
on MongoDB Search and returning those stored fields only, see
storedSource and
Return Stored Source Fields.

We recommend storing only the minimum number of fields required for
subsequent stages. If necessary, you can use $lookup at
the end of the pipeline stage to retrieve entire documents as shown in
the $sort Example. Storing unnecessary fields
increases disk utilization and could negatively impact performance
during indexing and querying.

## Scaling Considerations

### MongoDB Search Upgrade

MongoDB Search is deployed on your Atlas cluster. When a new version of
MongoDB Search is deployed, your Atlas cluster might experience brief
network failures in returning query results. To mitigate issues during
deployment and minimize impact to your application, consider the
following:

- Implement retry logic in your application.

- Configure Atlas Configure Maintenance Window.

  MongoDB Search upgrades start only during the maintenance window and might
  continue after the maintenance window.

To learn more about the changes in each release, see MongoDB Search Changelog.