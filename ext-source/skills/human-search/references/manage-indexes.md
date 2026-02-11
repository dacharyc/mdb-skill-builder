# Manage Search Indexes

To create a MongoDB Search index through the Node Driver:

- Define the search index from your application.

- Run the `createSearchIndex` or `createSearchIndexes` helper method.

The MongoDB Search index management methods run asynchronously. The
driver methods can return before confirming that they ran
successfully. To determine the current status of the indexes, call the
`listSearchIndexes()` method on your collection.

**Step 1:** Create a file named `create-index.js`.

**Step 2:** Define the search index.

## Create One

  Create One Search Index

  Replace the placeholder values in the following example application named
  `create-index.js`, which uses the `createSearchIndex` command to define
  a MongoDB Search index:

  | Value               | Description                                                                                 |
  | ------------------- | ------------------------------------------------------------------------------------------- |
  | \<connectionString> | Your Atlas connection string. To learn more, see
  Connect to a Cluster via Drivers.      |
  | \<databaseName>     | Database for which you want to create the index.                                            |
  | \<collectionName>   | Collection for which you want to create the index.                                          |
  | \<indexName>        | Name of your index. If you omit the index name, MongoDB Search
  names the index default. |
  | \<IndexDefinition>  | The definition of your index. To learn about index definition syntax, see Index Reference.  |

      ```javascript
      import { MongoClient } from "mongodb";

      // connect to your Atlas deployment
      const uri =  "<connectionString>";

      const client = new MongoClient(uri);

      async function run() {
        try {
          const database = client.db("<databaseName>");
          const collection = database.collection("<collectionName>");

          // define your MongoDB Search index
          const index = {
              name: "<indexName>",
              definition: {
                  /* search index definition fields */
                  <indexDefinition>
              }
          }

          // run the helper method
          const result = await collection.createSearchIndex(index);
          console.log(result);
        } finally {
          await client.close();
        }
      }
      run().catch(console.dir);
      ```

## Create Multiple

  Create Multiple Search Indexes

  | Value               | Description                                                                                 |
  | ------------------- | ------------------------------------------------------------------------------------------- |
  | \<connectionString> | Your Atlas connection string. To learn more, see
  Connect to a Cluster via Drivers.      |
  | \<databaseName>     | Database for which you want to create the index.                                            |
  | \<collectionName>   | Collection for which you want to create the index.                                          |
  | \<indexName>        | Name of your index. If you omit the index name, MongoDB Search
  names the index default. |
  | \<IndexDefinition>  | The definition of your index. To learn about index definition syntax, see Index Reference.  |

  Replace the placeholder values in the following example application named
  `create-index.js`, which uses the `createSearchIndexes` command to define
  a MongoDB Search index:

      ```javascript
      import { MongoClient } from "mongodb";

      // connect to your Atlas deployment
      const uri =  "<connection-string>";

      const client = new MongoClient(uri);

      async function run() {
        try {
          const database = client.db("<databaseName>");
          const collection = database.collection("<collectionName>");

          // define an array of MongoDB Search indexes
          const indexes = [
              {
                  name: "<first-index-name>",
                  definition: {
                      /* search index definition fields */
                  }
              },
              ...
              {
                  name: "<last-index-name>",
                  definition: {
                      /* search index definition fields */
                  }
              }
          ]

          // run the helper method
          const result = await collection.createSearchIndexes(indexes);
          console.log(result);
        } finally {
          await client.close();
        }
      }
      run().catch(console.dir);
      ```

**Step 3:** Run the sample application to create the index.

  Use the following command:

**Input:**

  ```shell
  node create-index.js
  ```

**Output:**

  ```
  <index-name>
  ```

To retrieve your MongoDB Search indexes through the Node Driver,
use the `listSearchIndexes` helper method.

## Example

You can use the following sample application named `list-indexes.js`
to return the indexes on your collection. Specify the following values:

- Your Atlas connection string. To learn more, see Driver.

- The database and collection that contains the search indexes
  that you want to retrieve.

- The index name if you want to retrieve a specific index. To return all
  indexes on the collection, omit this value.

The `listSearchIndexes` command returns a cursor. As a result,
it doesn't immediately return the indexes matched by the command.
To access the results, use a cursor paradigm such
as the `toArray()` method. To learn more, see Access Data From a Cursor.

```javascript
import { MongoClient } from "mongodb";

// connect to your Atlas deployment
const uri =  "<connection-string>";

const client = new MongoClient(uri);

async function run() {
  try {
    const database = client.db("<databaseName>");
    const collection = database.collection("<collectionName>");

    // run the helper method
    const result = await collection.listSearchIndexes("<index-name>").toArray();
    console.log(result);
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
```

To run the sample application, use the following command.
Your results should resemble the example output:

**Input:**

```shell
node list-indexes.js
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
   },
   {
      id: '648b4ad4d697b73bf9d2e5e1',
      name: 'example-index',
      status: 'PENDING',
      queryable: false,
      latestDefinition: {
         mappings: { dynamic: false, fields: { text: { type: 'string' } } }
      }
   }
]
```

To edit a MongoDB Search index through the Node Driver,
use the `updateSearchIndex` helper method.

### Example

You can use the following sample application named `update-index.js`
to update an existing index definition. Specify the following values:

- Your Atlas connection string. To learn more, see Driver.

- The database and collection where you created the search index.

- The new index definition to replace the existing definition. In the example,
  you update an index to use dynamic mappings.
  You can alter this definition to suit your specific indexing needs. To learn more,
  see index definitions.

- The name of the index that you want to update.

```javascript
import { MongoClient } from "mongodb";

// connect to your Atlas deployment
const uri =  "<connection-string>";

const client = new MongoClient(uri);

async function run() {
  try {
    const database = client.db("<databaseName>");
    const collection = database.collection("<collectionName>");

    // define your MongoDB Search index
    const index = {
        /* updated search index definition */
        "mappings": {
            "dynamic": false,
            "fields": {
              "<field-name>": {
                "type": "<field-type>"
              }
            }
        }
    }

    // run the helper method
    await collection.updateSearchIndex("<index-name>", index);
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
```

To run the sample application, use the following command:

```
node update-index.js
```

The dropSearchIndex() method doesn't return an output. To view your
index status, you can use the
Atlas CLI to list MongoDB Search indexes. To learn more, see
[atlas clusters search index list](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-search-indexes-list.md) or [atlas
deployments search index list](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-deployments-search-indexes-list/).

To delete a MongoDB Search index through the Node Driver,
use the `dropSearchIndex` helper method.

#### Example

You can use the following sample application named `drop-index.js`
to delete an index on your collection. Specify the following values:

- Your Atlas connection string. To learn more, see Driver.

- The database and collection where you created the search index.

- The name of the index that you want to delete.

```javascript
// connect to your Atlas deployment
const uri = "<connection-string>";

const client = new MongoClient(uri);

async function run() {
  try {
    const database = client.db("<databaseName>");
    const collection = database.collection("<collectionName>");

    // run the helper method
    await collection.dropSearchIndex("<index-name>");

  } finally {
    await client.close();
  }
}
run().catch(console.dir);
```

To run the sample application, use the following command.

```
node drop-index.js
```

The dropSearchIndex() method doesn't return an output. To view your
index status, you can use the
Atlas CLI to list MongoDB Search indexes. To learn more, see
[atlas clusters search index list](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-search-indexes-list.md) or [atlas
deployments search index list](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-deployments-search-indexes-list/).