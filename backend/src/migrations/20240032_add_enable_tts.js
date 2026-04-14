exports.up = function (knex) {
  return knex.schema.table('courses', (table) => {
    table.boolean('enable_tts').notNullable().defaultTo(false);
  });
};

exports.down = function (knex) {
  return knex.schema.table('courses', (table) => {
    table.dropColumn('enable_tts');
  });
};
