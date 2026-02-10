---
name: search
description: Help developers implement and optimize MongoDB Search
---

# MongoDB Search

## Connection Strings for Search

```javascript
import mongodb from 'mongodb';

const MongoClient = mongodb.MongoClient;
const uri = "mongodb+srv://<db_username>:<db_password>@<clusterName>.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);
client.connect(err => {
   const collection = client.db("<databaseName>").collection("<collectionName>");
   // perform actions on the collection object
   client.close();
});
```

### Example

The following connection string specifies the `cluster0` deployment and `test`
database component, and includes the `authSource=admin` option.

```javascript
var uriTestDb = "mongodb+srv://<db_username>:<db_password>@cluster0.mongodb.net/test?ssl=true&authSource=admin&w=majority";
MongoClient.connect(uriTestDb, function(err, db) {
   db.close();
});
```

## Search Options

### Process Results with Search Options

MongoDB Search provides several options that you can use to
process or refine your $search results.
You can use any combination of these options to tailor
your search results to your use case.

#### Search Options

Use the following table to explore the
available search options. Each reference page
includes usage details and runnable examples
to help you get started:

| Use Case                                                                                        | Option              |
| ----------------------------------------------------------------------------------------------- | ------------------- |
| Understand the relevance of your results or adjust the ranking of returned documents            | score               |
| Display results in a specific order, such as by date or alphabetically                          | sort                |
| Highlight where a user's search term appears in results along with adjacent content             | highlight           |
| Determine the size of a result set for pagination or analytics                                  | count               |
| Build pagination features into your application, like "Next Page" and "Previous Page" functions | searchSequenceToken |
| Track popular search terms or improve search functionality based on user behavior               | tracking            |

## Search Query Examples

The following examples demonstrate common search patterns.

```javascript
const { MongoClient } = require("mongodb");

async function main() {
  // Replace the placeholder with your connection string
  const uri = "<connection-string>";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const database = client.db("sample_mflix");
    const movies = database.collection("movies");

    const query = [
      {
        $search:
        {
          text: {
            query: "baseball",
            path: "plot",
          },
        }
      },
      {
        $limit: 3,
      },
      {
        $project: {
          _id: 0,
          title: 1,
          plot: 1,
        },
      },
    ];

    const cursor = movies.aggregate(query);
    await cursor.forEach(doc => console.log(doc));
  } finally {
    await client.close();
  }
}

main().catch(console.error);
```

```javascript
const { MongoClient } = require("mongodb");

async function main() {
  // Replace the placeholder with your connection string
  const uri = "<connection-string>";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const database = client.db("sample_mflix");
    const movies = database.collection("movies");

    const query = [
      {
        $search: {
          compound: {
            must: [
              {
                text: {
                  query: "baseball",
                  path: "plot",
                }
              }
            ],
            mustNot: [
              {
                text: {
                  query: ["Comedy", "Romance"],
                  path: "genres",
                },
              }
            ]
          }
        }
      },
      {
        $limit: 3
      },
      {
        $project: {
          _id: 0,
          title: 1,
          plot: 1,
          genres: 1
        }
      }
    ];

    const cursor = movies.aggregate(query);
    await cursor.forEach(doc => console.log(doc));
  } finally {
    await client.close();
  }
}

main().catch(console.error);
```

```javascript
const { MongoClient } = require("mongodb");

async function main() {
  // Replace the placeholder with your connection string
  const uri = "<connection-string>";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const database = client.db("sample_mflix");
    const movies = database.collection("movies");

    const query = [
      {
        $search: {
          compound: {
            must: [
              {
                text: {
                  query: "baseball",
                  path: "plot",
                }
              }
            ],
            mustNot: [
              {
                text: {
                  query: ["Comedy", "Romance"],
                  path: "genres",
                }
              }
            ]
          },
          sort: {
            released: -1
          }
        }
      },
      {
        $limit: 3
      },
      {
        $project: {
          _id: 0,
          title: 1,
          plot: 1,
          genres: 1,
          released: 1
        }
      }
    ];

    const cursor = movies.aggregate(query);
    await cursor.forEach(doc => console.log(doc));
  } finally {
    await client.close();
  }
}

main().catch(console.error);
```

## Task-Specific Guides

For specific implementation tasks, see:

- [Manage Search Indexes](references/manage-indexes.md)
- [Write Search Queries](references/write-queries.md)