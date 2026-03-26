exports.up = function (knex) {
  return knex.schema.createTable('section_stars', (table) => {
    table.increments('id').primary();
    table.integer('student_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('section_id').unsigned().notNullable().references('id').inTable('sections').onDelete('CASCADE');
    table.integer('goal_achievement').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('section_stars');
};
