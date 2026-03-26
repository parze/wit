exports.up = function (knex) {
  return knex.schema.createTable('quiz_results', (table) => {
    table.increments('id').primary();
    table.integer('student_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.integer('section_id').unsigned().notNullable()
      .references('id').inTable('sections').onDelete('CASCADE');
    table.integer('score').notNullable();
    table.integer('total').notNullable();
    table.jsonb('answers').notNullable().defaultTo('[]');
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('quiz_results');
};
