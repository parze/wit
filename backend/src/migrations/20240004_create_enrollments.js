exports.up = function (knex) {
  return knex.schema.createTable('enrollments', (table) => {
    table.increments('id').primary();
    table.integer('student_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.integer('course_id').unsigned().notNullable()
      .references('id').inTable('courses').onDelete('CASCADE');
    table.timestamps(true, true);
    table.unique(['student_id', 'course_id']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('enrollments');
};
