exports.up = function (knex) {
  return knex.schema.alterTable('courses', (table) => {
    table.integer('ai_teacher_id').references('id').inTable('ai_teachers').onDelete('SET NULL').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('courses', (table) => {
    table.dropColumn('ai_teacher_id');
  });
};
