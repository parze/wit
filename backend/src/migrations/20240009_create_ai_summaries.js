exports.up = function (knex) {
  return knex.schema.createTable('ai_summaries', (table) => {
    table.increments('id').primary();
    table.integer('student_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.integer('section_id').unsigned().notNullable()
      .references('id').inTable('sections').onDelete('CASCADE');
    table.text('summary');
    table.integer('goal_achievement').defaultTo(0);
    table.text('reasons');
    table.timestamps(true, true);
    table.unique(['student_id', 'section_id']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('ai_summaries');
};
