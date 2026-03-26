exports.up = function (knex) {
  return knex.schema.createTable('ai_teachers', (table) => {
    table.increments('id');
    table.integer('teacher_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.string('name').notNullable();
    table.text('system_prompt').notNullable();
    table.boolean('is_default').defaultTo(false);
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('ai_teachers');
};
