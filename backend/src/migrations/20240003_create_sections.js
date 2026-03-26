exports.up = function (knex) {
  return knex.schema.createTable('sections', (table) => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('description');
    table.integer('order').notNullable().defaultTo(0);
    table.integer('course_id').unsigned().notNullable()
      .references('id').inTable('courses').onDelete('CASCADE');
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('sections');
};
