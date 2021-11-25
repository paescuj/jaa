// See https://github.com/directus/directus/discussions/3891

export async function init(directus) {
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
      fields: ['id', 'title', 'file', 'file_dark'],
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
          {
            doc_dark: {
              global: {
                _eq: true,
              },
            },
          },
          {
            doc_dark: {
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
