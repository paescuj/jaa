module.exports = {
  async up(knex) {
    const { id: role } = (
      await knex('directus_roles').select('id').where('name', 'Companies')
    )[0];

    await knex('directus_permissions').insert([
      // Read access on related "dates"
      {
        role: role,
        collection: 'dates',
        action: 'read',
        permissions: JSON.stringify({
          job: {
            user: {
              id: {
                _eq: '$CURRENT_USER',
              },
            },
          },
        }),
        fields: [
          'id',
          'user_created',
          'status',
          'start',
          'end',
          'remark',
        ].join(),
      },

      // Create access on "dates"
      {
        role: role,
        collection: 'dates',
        action: 'create',
        validation: JSON.stringify({
          _and: [
            {
              start: {
                _gte: '$NOW',
              },
            },
            {
              end: {
                _gte: '$NOW',
              },
            },
          ],
        }),
        presets: JSON.stringify({
          job: '$CURRENT_USER.job.id',
        }),
        fields: ['start', 'end', 'remark'].join(),
      },

      // Update access on "dates"
      {
        role: role,
        collection: 'dates',
        action: 'update',
        permissions: JSON.stringify({
          _and: [
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
              status: {
                _eq: 'proposal',
              },
            },
            {
              user_created: {
                id: {
                  _neq: '$CURRENT_USER',
                },
              },
            },
          ],
        }),
        fields: 'status',
      },

      // // Delete access on "dates"
      {
        role: role,
        collection: 'dates',
        action: 'delete',
        permissions: JSON.stringify({
          _and: [
            {
              status: {
                _eq: 'proposal',
              },
            },
            {
              user_created: {
                id: {
                  _eq: '$CURRENT_USER',
                },
              },
            },
          ],
        }),
      },
    ]);
  },

  async down(knex) {
    await knex('directus_permissions').where('collection', 'dates').del();
  },
};
