exports.up = async function (knex) {
  await knex.schema.dropTableIfExists('sections');
};

exports.down = async function (knex) {
  throw new Error('Down migration not supported for section removal');
};
