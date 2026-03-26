exports.up = function (knex) {
  return knex.schema.createTable('chat_sessions', (table) => {
    table.increments('id').primary();
    table.integer('student_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.integer('section_id').unsigned().notNullable()
      .references('id').inTable('sections').onDelete('CASCADE');
    table.jsonb('messages').notNullable().defaultTo('[]');
    table.timestamps(true, true);
    table.unique(['student_id', 'section_id']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('chat_sessions');
};
