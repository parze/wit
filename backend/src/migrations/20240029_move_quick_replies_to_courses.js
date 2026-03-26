exports.up = function (knex) {
  return knex.schema
    .table('courses', function (table) {
      table.boolean('enable_quick_replies').defaultTo(false).notNullable();
    })
    .table('course_instructions', function (table) {
      table.dropColumn('enable_quick_replies');
    });
};

exports.down = function (knex) {
  return knex.schema
    .table('courses', function (table) {
      table.dropColumn('enable_quick_replies');
    })
    .table('course_instructions', function (table) {
      table.boolean('enable_quick_replies').defaultTo(false).notNullable();
    });
};
