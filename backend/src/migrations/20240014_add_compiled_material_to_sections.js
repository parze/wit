exports.up = function (knex) {
  return knex.schema.alterTable('sections', table => {
    table.text('compiled_material').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('sections', table => {
    table.dropColumn('compiled_material');
  });
};
