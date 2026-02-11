# Manage Search Indexes

# Manage Search Indexes with mongosh

MongoDB Search indexes can be managed through multiple interfaces: Atlas UI, Atlas CLI, Admin API, and driver methods. The examples below show the mongosh shell commands for the most common operations.

## Create an Index

To create a MongoDB Search index using mongosh:

**Step 1:** Connect using `mongosh`.

  To learn more, see MongoDB Shell.

**Step 2:** Create a MongoDB Search index.

  Use the db.collection.createSearchIndex() method.

  The command has the following syntax.
  If you omit the index name, MongoDB Search names the index
  `default`. To learn more, see index definitions.

  ```javascript
  db.<collection>.createSearchIndex(
       "<index-name>",
       {
           /* search index definition */
       }
  )
  ```

  For example:

  To create an index named `example-index` that
  dynamically indexes the fields in the `movies`
  collection, run the following command:

**Input:**

  ```shell
  db.movies.createSearchIndex(
      "example-index",
      { mappings: { dynamic: true } }
  )
  ```

**Output:**

  ```
  example-index
  ```

## View Indexes

To retrieve your MongoDB Search indexes through mongosh, use
the db.collection.getSearchIndexes() method.

The command has the following syntax.
If you omit the index name, MongoDB Search returns all
indexes on the collection.

```javascript
db.<collection>.getSearchIndexes("<index-name>")
```

### Example

The following command retrieves a search
index named `default` from the `movies` collection.
Your results should resemble the example output:

**Input:**

```shell
db.movies.getSearchIndexes("default")
```

**Output:**

```json
[
   {
      id: '648b4ad4d697b73bf9d2e5e0',
      name: 'default',
      status: 'READY',
      queryable: true,
      latestDefinition: { mappings: { dynamic: true } }
   }
]
```

## Edit an Index

To edit a MongoDB Search index through mongosh, use
the db.collection.updateSearchIndex() method.

The command has the following syntax.
Specify the name of the index that you want to edit
and define the new index definition. This definition
replaces the index's existing definition. To learn more,
see index definitions.

```javascript
db.<collection>.updateSearchIndex(
     "<index-name>",
     /* updated search index definition */
)
```

### Example

The following command updates a search
index named `default` from the `movies` collection
to use dynamic mappings:

```
db.movies.updateSearchIndex(
    "default",
    {
        "mappings": {
        "dynamic": false,
        "fields": {
            "<field-name>": {
                 "type": "<field-type>"
            }
        }
    }
)
```

The dropSearchIndex() method doesn't return an output. To view your
index status, you can use the
Atlas CLI to list MongoDB Search indexes. To learn more, see
[atlas clusters search index list](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-search-indexes-list.md) or [atlas
deployments search index list](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-deployments-search-indexes-list/).

## Delete an Index

To delete a MongoDB Search index through mongosh, use
the db.collection.dropSearchIndex() method.

The command has the following syntax:

```javascript
db.<collection>.dropSearchIndex("<index-name>")
```

### Example

The following command deletes a search
index named `default` from the `movies` collection:

```javascript
db.movies.dropSearchIndex("default")
```

The dropSearchIndex() method doesn't return an output. To view your
index status, you can use the
Atlas CLI to list MongoDB Search indexes. To learn more, see
[atlas clusters search index list](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-search-indexes-list.md) or [atlas
deployments search index list](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-deployments-search-indexes-list/).