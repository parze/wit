exports.up = async function (knex) {
  await knex.schema.createTable('course_instructions', (table) => {
    table.increments('id');
    table.integer('teacher_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.string('title', 255).notNullable();
    table.text('content').notNullable();
    table.boolean('is_default').defaultTo(false);
    table.timestamps(true, true);
  });

  await knex.schema.table('courses', (table) => {
    table.integer('instruction_id').references('id').inTable('course_instructions').onDelete('SET NULL').nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.table('courses', (table) => {
    table.dropColumn('instruction_id');
  });
  await knex.schema.dropTable('course_instructions');
};
