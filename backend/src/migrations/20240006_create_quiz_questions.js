exports.up = function (knex) {
  return knex.schema.createTable('quiz_questions', (table) => {
    table.increments('id').primary();
    table.integer('section_id').unsigned().notNullable()
      .references('id').inTable('sections').onDelete('CASCADE');
    table.text('question').notNullable();
    table.jsonb('options').notNullable();
    table.integer('correct_index').notNullable();
    table.integer('order').notNullable().defaultTo(0);
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('quiz_questions');
};
