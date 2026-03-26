exports.up = function (knex) {
  return knex.schema.table('courses', (table) => {
    table.dropColumn('ai_teacher_id');
  });
};

exports.down = function (knex) {
  return knex.schema.table('courses', (table) => {
    table.integer('ai_teacher_id').references('id').inTable('ai_teachers').onDelete('SET NULL').nullable();
  });
};
