exports.up = async function (knex) {
  await knex.schema.createTable('enrollments', t => {
    t.increments('id').primary();
    t.integer('child_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('course_id').unsigned().notNullable().references('id').inTable('courses').onDelete('CASCADE');
    t.unique(['child_id', 'course_id']);
    t.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('enrollments');
};
