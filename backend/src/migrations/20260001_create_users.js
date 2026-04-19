exports.up = async function (knex) {
  await knex.schema.createTable('users', t => {
    t.increments('id').primary();
    t.string('name').notNullable();
    t.string('email').unique();
    t.string('username').unique();
    t.string('password_hash').notNullable();
    t.enum('role', ['parent', 'child']).notNullable().defaultTo('parent');
    t.integer('parent_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    t.string('gender');
    t.integer('birth_year');
    t.string('password_reset_token');
    t.timestamp('reset_token_expiry');
    t.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('users');
};
