exports.up = function (knex) {
  return knex.schema.table('users', function (table) {
    table.string('password_reset_token').nullable();
    table.timestamp('reset_token_expiry').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.table('users', function (table) {
    table.dropColumn('password_reset_token');
    table.dropColumn('reset_token_expiry');
  });
};
