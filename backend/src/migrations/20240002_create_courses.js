exports.up = function (knex) {
  return knex.schema.createTable('courses', (table) => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('description');
    table.integer('teacher_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('courses');
};
