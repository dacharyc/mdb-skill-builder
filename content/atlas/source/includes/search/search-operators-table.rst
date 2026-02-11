.. list-table::
   :header-rows: 1
   :widths: 20 50 30

   * - Operator
     - Description
     - Supported |fts| Types

   * - :ref:`autocomplete <autocomplete-ref>`
     - Performs a search-as-you-type query from an incomplete input string.
     - :ref:`autocomplete <bson-data-types-autocomplete>`

   * - :ref:`compound <compound-ref>`
     - Combines other operators into a single query.
     - Field types supported by the operators used inside the
       ``compound`` operator.

   * - :ref:`embeddedDocument <embedded-document-ref>`
     - Queries fields in embedded documents, which are documents that
       are elements of an array.
     - :ref:`embeddedDocuments <bson-data-types-embedded-documents>` and
       field types supported by the operators used inside the
       ``embeddedDocument`` operator.

   * - :ref:`equals <equals-ref>`
     - Checks whether the field contains the specified value, including
       null value.
     - | :ref:`boolean <boolean-ref>`
       | :ref:`date <bson-data-types-date>`
       | :ref:`objectId <objectId-ref>`
       | :ref:`number <bson-data-types-number>`
       | :ref:`token <bson-data-types-token>`
       | :ref:`uuid <bson-data-types-uuid>`

   * - :ref:`exists <exists-ref>`
     - Tests for the presence of a specified field, regardless of the
       field type.
     - Field type isn't used by the ``exists`` operator.

   * - :ref:`geoShape <geoshape-ref>`
     - Queries for values with specified geo shapes.
     - :ref:`geo <bson-data-types-geo>`

   * - :ref:`geoWithin <geowithin-ref>`
     - Queries for points within specified geographic shapes.
     - :ref:`geo <bson-data-types-geo>`

   * - :ref:`hasAncestor <has-ancestor-ref>`
     - Queries intermediary ancestor-level fields using ``returnScope``.
     - Field type supported by the operator used in the query.

   * - :ref:`hasRoot <has-root-ref>`
     - Queries root-level fields using ``returnScope``.
     - Field type supported by the operator used in the query.

   * - :ref:`in <in-ref>`
     - Queries both single value and array of values.
     - | :ref:`boolean <boolean-ref>`
       | :ref:`date <bson-data-types-date>`
       | :ref:`objectId <objectId-ref>`
       | :ref:`number <bson-data-types-number>`
       | :ref:`token <bson-data-types-token>`
       | :ref:`uuid <bson-data-types-uuid>`

   * - :ref:`knnBeta <knn-beta-ref>`
     - (Deprecated) Performs semantic search using |hnsw| algorithm.
     - :ref:`knnVector <fts-data-types-knn-vector>`

   * - :ref:`moreLikeThis <more-like-this-ref>`
     - Queries for similar documents.
     - :ref:`string <bson-data-types-string>`

   * - :ref:`near <near-ref>`
     - Queries for values near a specified :ref:`number
       <bson-data-types-number>`, :ref:`date <bson-data-types-date>`, or
       :ref:`geo point <bson-data-types-geo>`.
     - | :ref:`date <bson-data-types-date>`
       | :ref:`geo point <bson-data-types-geo>`
       | :ref:`number <bson-data-types-number>`

   * - :ref:`phrase <phrase-ref>`
     - Searches documents for terms in an order similar to the query.
     - :ref:`string <bson-data-types-string>`

   * - :ref:`queryString <querystring-ref>`
     - Supports querying a combination of indexed fields and values.
     - :ref:`string <bson-data-types-string>`

   * - :ref:`range <range-ref>`
     - Queries for values within a specific numeric, date, string, and
       objectId range.
     - | :ref:`date <bson-data-types-date>`
       | :ref:`number <bson-data-types-number>`
       | :ref:`objectId <objectId-ref>`
       | :ref:`token <bson-data-types-token>`

   * - :ref:`regex <regex-ref>`
     - Interprets the ``query`` field as a regular expression.
     - :ref:`string <bson-data-types-string>`

   * - :ref:`span <span-ref>`
     - (Deprecated) Specifies relative positional requirements for query
       predicates within specified regions of a text field.
     - :ref:`string <bson-data-types-string>`

   * - :ref:`text <text-ref>`
     - Performs textual analyzed search.
     - :ref:`string <bson-data-types-string>`

   * - :ref:`vectorSearch <fts-vectorSearch-ref>`
     - Performs semantic search using lexical pre-filters.
     - :ref:`vector <bson-data-types-vector>`

   * - :ref:`wildcard <wildcard-ref>`
     - Supports special characters in the query string that can match
       any character.
     - :ref:`string <bson-data-types-string>`
