// See https://github.com/directus/directus/discussions/3891

export async function init(directus) {
  // Create collections
  await directus.collections.createMany([
    // Collection "jobs"
    {
      collection: 'jobs',
      fields: [
        {
          field: 'id',
          type: 'integer',
          meta: {
            interface: 'input',
            readonly: true,
            hidden: true,
          },
          schema: {
            is_primary_key: true,
            has_auto_increment: true,
          },
        },
        {
          field: 'date_created',
          type: 'timestamp',
          meta: {
            special: ['date-created'],
            interface: 'datetime',
            readonly: true,
            hidden: true,
            width: 'half',
            display: 'datetime',
            display_options: { relative: true },
          },
        },
        {
          field: 'company',
          type: 'string',
          meta: {
            interface: 'input',
          },
        },
        {
          field: 'position',
          type: 'string',
          meta: {
            interface: 'input',
          },
        },
        {
          field: 'link',
          type: 'string',
          meta: {
            interface: 'input',
          },
        },
        {
          field: 'preview',
          type: 'o2m',
          meta: {
            display: 'related-values',
            display_options: {
              template: '{{title}}',
            },
            interface: 'list-o2m',
            special: 'o2m',
          },
        },
        {
          field: 'sent',
          type: 'timestamp',
          meta: {
            interface: 'datetime',
            display: 'datetime',
          },
        },
        {
          field: 'feedback',
          type: 'text',
          meta: {
            interface: 'input-multiline',
          },
        },
        {
          field: 'identity_hash',
          type: 'string',
          meta: {
            interface: 'input',
          },
        },
        {
          field: 'user',
          type: 'o2m',
          meta: {
            display: 'related-values',
            display_options: {
              template: '{{email}}',
            },
            interface: 'list-o2m',
            options: {
              template: '{{email}}',
            },
            special: 'o2m',
          },
        },
      ],
    },
    // Collection "docs"
    {
      collection: 'docs',
      fields: [
        {
          field: 'id',
          type: 'uuid',
          meta: {
            interface: 'input',
            readonly: true,
            hidden: true,
            special: 'uuid',
          },
          schema: {
            is_primary_key: true,
          },
        },
        {
          field: 'title',
          type: 'string',
          meta: {
            interface: 'input',
          },
        },
        {
          field: 'file',
          type: 'o2m',
          meta: {
            display: 'related-values',
            display_options: {
              template: '{{title}}',
            },
            interface: 'list-o2m',
            special: 'o2m',
          },
        },
        {
          field: 'preview',
          type: 'o2m',
          meta: {
            display: 'related-values',
            display_options: {
              template: '{{title}}',
            },
            interface: 'list-o2m',
            special: 'o2m',
          },
        },
        {
          field: 'job',
          type: 'integer',
          meta: {
            display: 'related-values',
            display_options: {
              template: '{{company}}-{{id}}',
            },
            interface: 'select-dropdown-m2o',
            options: {
              template: '{{company}}-{{id}}',
            },
          },
        },
        {
          field: 'global',
          type: 'boolean',
          meta: {
            interface: 'boolean',
            special: 'boolean',
          },
        },
      ],
    },
    // Collection "settings"
    {
      collection: 'settings',
      meta: {
        singleton: true,
      },
      fields: [
        {
          field: 'id',
          type: 'integer',
          meta: {
            interface: 'input',
            readonly: true,
            hidden: true,
          },
          schema: {
            is_primary_key: true,
            has_auto_increment: true,
          },
        },
        {
          field: 'chatwoot_website_token',
          type: 'string',
          meta: {
            interface: 'input',
          },
        },
        {
          field: 'chatwoot_hmac_token',
          type: 'string',
          meta: {
            interface: 'input',
          },
        },
      ],
    },
  ]);

  // Create "job", "doc" and "docPreview" fields on "directus_users" and "directus_files" for relation
  await directus.fields.createOne('directus_users', {
    field: 'job',
    type: 'integer',
  });
  await directus.fields.createOne('directus_files', {
    field: 'job',
    type: 'integer',
  });
  await directus.fields.createOne('directus_files', {
    field: 'doc',
    type: 'uuid',
  });
  await directus.fields.createOne('directus_files', {
    field: 'docPreview',
    type: 'uuid',
  });

  // --- Create relations
  // From "user" in "directus_users" to "user" in "jobs"
  await directus.relations.createOne({
    collection: 'directus_users',
    field: 'job',
    related_collection: 'jobs',
    meta: {
      one_field: 'user',
    },
    // Delete "directus_users" entries when related "jobs" entry is deleted
    schema: {
      on_delete: 'CASCADE',
    },
  });
  // From "job" in "docs" to "jobs"
  await directus.relations.createOne({
    collection: 'docs',
    field: 'job',
    related_collection: 'jobs',
    // Delete "docs" entries when related "jobs" entry is deleted
    schema: {
      on_delete: 'CASCADE',
    },
  });
  // From "job" in "directus_files" to "preview" in "jobs"
  await directus.relations.createOne({
    collection: 'directus_files',
    field: 'job',
    related_collection: 'jobs',
    meta: {
      one_field: 'preview',
    },
    // Delete "directus_files" entries when related "jobs" entry is deleted
    schema: {
      on_delete: 'CASCADE',
    },
  });
  // From "doc" in "directus_files" to "file" in "docs"
  await directus.relations.createOne({
    collection: 'directus_files',
    field: 'doc',
    related_collection: 'docs',
    meta: {
      one_field: 'file',
    },
    // Delete "directus_files" entries when related "docs" entry is deleted
    schema: {
      on_delete: 'CASCADE',
    },
  });
  // From "preview" in "docs" to "directus_files"
  await directus.relations.createOne({
    collection: 'directus_files',
    field: 'docPreview',
    related_collection: 'docs',
    meta: {
      one_field: 'preview',
    },
    // Delete "directus_files" entries when related "docs" entry is deleted
    schema: {
      on_delete: 'CASCADE',
    },
  });

  // Create "Companies" role
  const role = await directus.roles.createOne({
    name: 'Companies',
    admin_access: false,
    app_access: false,
  });

  // Grant permissions
  await directus.permissions.createMany([
    // Read access on own user
    {
      collection: 'directus_users',
      action: 'read',
      role: role.id,
      permissions: {
        id: {
          _eq: '$CURRENT_USER',
        },
      },
      fields: ['id', 'job'],
    },
    // Read access on related "jobs"
    {
      collection: 'jobs',
      action: 'read',
      role: role.id,
      permissions: {
        user: {
          id: {
            _eq: '$CURRENT_USER',
          },
        },
      },
      fields: ['id', 'company', 'position', 'link', 'preview', 'identity_hash'],
    },
    // Read access on "docs" based on "jobs"
    {
      collection: 'docs',
      action: 'read',
      role: role.id,
      permissions: {
        _or: [
          {
            global: {
              _eq: true,
            },
          },
          {
            job: {
              user: {
                id: {
                  _eq: '$CURRENT_USER',
                },
              },
            },
          },
        ],
      },
      fields: ['id', 'title', 'file'],
    },
    // Read access on "files" based on "job" or "doc"
    {
      collection: 'directus_files',
      action: 'read',
      role: role.id,
      permissions: {
        _or: [
          {
            job: {
              user: {
                id: {
                  _eq: '$CURRENT_USER',
                },
              },
            },
          },
          {
            doc: {
              global: {
                _eq: true,
              },
            },
          },
          {
            doc: {
              job: {
                user: {
                  id: {
                    _eq: '$CURRENT_USER',
                  },
                },
              },
            },
          },
        ],
      },
      fields: ['filename_download'],
    },
    // Read access on "settings"
    {
      collection: 'settings',
      action: 'read',
      role: role.id,
      fields: ['chatwoot_website_token'],
    },
  ]);
}
