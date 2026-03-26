exports.up = function (knex) {
  return knex.schema.alterTable('sections', table => {
    table.text('section_description').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('sections', table => {
    table.dropColumn('section_description');
  });
};
