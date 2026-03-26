exports.up = function (knex) {
  return knex.schema.createTable('section_progress', (table) => {
    table.increments('id').primary();
    table.integer('student_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.integer('section_id').unsigned().notNullable()
      .references('id').inTable('sections').onDelete('CASCADE');
    table.enum('status', ['not_started', 'in_progress', 'completed']).notNullable().defaultTo('not_started');
    table.timestamps(true, true);
    table.unique(['student_id', 'section_id']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('section_progress');
};
