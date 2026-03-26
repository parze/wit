exports.up = function (knex) {
  return knex.schema.table('course_instructions', function (table) {
    table.boolean('enable_quick_replies').defaultTo(false).notNullable();
  });
};

exports.down = function (knex) {
  return knex.schema.table('course_instructions', function (table) {
    table.dropColumn('enable_quick_replies');
  });
};
