export async function up(knex) {
	const { id: role } = (
		await knex('directus_roles').select('id').where('name', 'Companies')
	)[0];

	const { id, fields } = (
		await knex('directus_permissions')
			.select('id', 'fields')
			.where({ role, collection: 'settings', action: 'read' })
	)[0];

	// Additional read access for "settings" for roles "Public" and "Companies"
	await knex('directus_permissions')
		.where({ id })
		.update({
			fields: [fields, 'introduction_text', 'about_text'].join(),
		});
	await knex('directus_permissions').insert({
		role: null,
		collection: 'settings',
		action: 'read',
		fields: 'about_text',
	});
}

export async function down(knex) {
	const { id: role } = (
		await knex('directus_roles').select('id').where('name', 'Companies')
	)[0];
	await knex('directus_permissions')
		.where('role', role)
		.orWhere('role', null)
		.andWhere('collection', 'settings')
		.andWhere('fields', 'like', '%about_text%')
		.del();
}
