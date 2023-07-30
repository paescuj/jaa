import { randomUUID } from 'crypto';

export async function up(knex) {
	const role = (
		await knex('directus_roles').insert(
			{
				id: randomUUID(),
				name: 'Companies',
				admin_access: false,
				app_access: false,
			},
			['id'],
		)
	)[0].id;

	await knex('directus_permissions').insert([
		// Read access on own user
		{
			role: role,
			collection: 'directus_users',
			action: 'read',
			permissions: JSON.stringify({
				id: {
					_eq: '$CURRENT_USER',
				},
			}),
			fields: ['id', 'job', 'language'].join(),
		},

		// Read access on related "jobs"
		{
			role: role,
			collection: 'jobs',
			action: 'read',
			permissions: JSON.stringify({
				user: {
					id: {
						_eq: '$CURRENT_USER',
					},
				},
			}),
			fields: [
				'id',
				'company',
				'position',
				'link',
				'preview',
				'identity_hash',
			].join(),
		},

		// Read access on "docs" based on "jobs"
		{
			role: role,
			collection: 'docs',
			action: 'read',
			permissions: JSON.stringify({
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
			}),
			fields: ['id', 'title', 'file', 'file_dark'].join(),
		},

		// Read access on "files" based on "job" or "doc"
		{
			role: role,
			collection: 'directus_files',
			action: 'read',
			permissions: JSON.stringify({
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
			}),
		},

		// Read access on "settings"
		{
			role: role,
			collection: 'settings',
			action: 'read',
			fields: 'chatwoot_website_token',
		},

		// Read access on related "feedback"
		{
			role: role,
			collection: 'feedback',
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
			fields: ['text', 'date_created'].join(),
		},

		// Create access on "feedback"
		{
			role: role,
			collection: 'feedback',
			action: 'create',
			presets: JSON.stringify({
				job: '$CURRENT_USER.job.id',
			}),
			fields: 'text',
		},

		// Update access on "users"
		{
			role: role,
			collection: 'directus_users',
			action: 'update',
			permissions: JSON.stringify({
				id: {
					_eq: '$CURRENT_USER',
				},
			}),
			fields: 'language',
		},
	]);
}

export async function down(knex) {
	const role = await knex('directus_roles')
		.where('name', 'Companies')
		.del(['id']);
	await knex('directus_permissions').where('role', role).del();
}
