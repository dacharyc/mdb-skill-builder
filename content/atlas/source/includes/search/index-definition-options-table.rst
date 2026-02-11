.. list-table::
   :header-rows: 1
   :widths: 20 15 15 50

   * - Field
     - Type
     - Necessity
     - Description

   * - ``analyzer``
     - String
     - Optional
     - Specifies the :ref:`analyzer <analyzers-ref>` to apply to
       string fields when indexing.

       If you set this only at the top and
       do not specify an analyzer for the fields in the index
       definition, |fts| applies this analyzer to all the fields. To
       use a different analyzer for each field, you must specify a
       different analyzer for the field.

       If omitted, defaults to
       :ref:`ref-standard-analyzer`.

   * - ``analyzers``
     - Array of :ref:`custom-analyzers`
     - Optional
     - Specifies the :ref:`custom-analyzers` to use in this index.

   * - ``mappings``
     - Object
     - Required
     - Specifies how to index fields at different paths for this
       index.

   * - | ``mappings.``
       | ``dynamic``
     - Boolean or Object
     - Optional
     - Enables dynamic mapping of field types or configures fields
       individually for this index.

       Value must be one of the following:

       - boolean - set to ``true`` to recursively index all indexable
         field types or set to ``false`` to not dynamically index any of
         the indexable field types.
       - object - specify the ``typeSet`` to use for recursively
         indexing all indexable field types. To learn more, see
         ``mappings.dynamic.typeSet``.

       If omitted, defaults to ``false``. If set to ``false``, you must
       define the individual fields to statically index using
       ``mappings.fields``.

       You can also configure fields individually to override default
       settings using ``mappings.fields``. Settings for fields in
       ``mappings.fields`` override default settings.

       .. include:: /includes/fts/facts/dynamic-flag-considerations.rst

       To learn about the field types that you can enable for dynamic
       mappings, see :ref:`bson-data-types`.

       For example index configurations, see :ref:`index-config-example`

   * - | ``mappings.``
       | ``dynamic.``
       | ``typeSet``
     - String
     - Optional
     - References the name of the ``typeSets`` object that contains the
       list of field types to automatically and recursively index.

       Mutually exclusive with ``mappings.dynamic`` boolean flag.

   * - | ``mappings.``
       | ``fields``
     - Object
     - Conditional
     - Specifies the fields that you want to index. Required only
       if dynamic mapping is ``false``.

       .. include:: /includes/fts/facts/fact-fts-field-name-restriction.rst

       To learn more, see :ref:`fts-field-mappings`.

   * - ``searchAnalyzer``
     - String
     - Optional
     - Specifies the :ref:`analyzer <analyzers-ref>` to apply to query
       text before searching with it.

       If omitted, defaults to the
       analyzer that you specify for the ``analyzer`` option. If you
       omit both the ``searchAnalyzer`` and the ``analyzer`` options,
       defaults to the :ref:`ref-standard-analyzer`.

   * - ``numPartitions``
     - Integer
     - Optional
     - Specifies the number of sub-indexes to create if the document count
       exceeds two billion. The following values are valid: ``1``,
       ``2``, ``4``. If omitted, defaults to ``1``.

       To use index partitions, you must have search nodes deployed in
       your cluster.

   * - ``storedSource``
     - Boolean or :ref:`Stored Source Definition
       <fts-stored-source-definition>`
     - Optional
     - Specifies fields in the documents to store for query-time
       look-ups using the :ref:`returnedStoredSource
       <fts-return-stored-source-option>` option. You can store fields
       of all :ref:`bson-data-chart` on |fts|. Value can be one of
       the following:

       - ``true``, to store all fields
       - ``false``, to not store any fields
       - :ref:`Object <fts-stored-source-document>` that specifies
         the fields to ``include`` or ``exclude`` from storage

       .. include:: /includes/fts/facts/fact-fts-stored-source-mdb-version.rst

       If omitted, defaults to ``false``.

       To learn more, see :ref:`fts-stored-source-definition`.


   * - ``synonyms``
     - Array of :ref:`Synonym Mapping Definition <synonyms-ref>`
     - Optional
     - Specifies the synonym mappings to use in your index.

       .. include:: /includes/fts/facts/fact-fts-synonym-mapping-limitation.rst

       To learn more, see :ref:`synonyms-ref`.

   * - ``typeSets``
     - Array of objects
     - Optional
     - Specifies the :ref:`typeSets <fts-configure-dynamic-mappings>` to
       use in this index for dynamic mappings.

   * - | ``typeSets.``
       | ``[n].name``
     - String
     - Required
     - Specifies the name of the ``typeSet`` configuration.

   * - | ``typeSets.``
       | ``[n].types``
     - Array of objects
     - Required
     - Specifies the field types, one per object, to index automatically
       using dynamic mappings.

   * - | ``typeSets.``
       | ``[n].types.``
       | ``[n].type``
     - String
     - Required
     - Specifies the field type to automatically index. To
       learn more about the field types that you can configure for
       dynamic mapping, see :ref:`fts-configure-dynamic-mappings`.
