exports.up = function(knex) {
  return knex.schema
    .table('classes', t => { t.integer('birth_year').nullable(); })
    .table('users',   t => { t.string('gender', 20).nullable(); });
};

exports.down = function(knex) {
  return knex.schema
    .table('classes', t => { t.dropColumn('birth_year'); })
    .table('users',   t => { t.dropColumn('gender'); });
};
