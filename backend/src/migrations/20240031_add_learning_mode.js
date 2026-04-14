exports.up = function (knex) {
  return knex.schema.table('courses', function (table) {
    table.string('learning_mode', 20).nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.table('courses', function (table) {
    table.dropColumn('learning_mode');
  });
};
