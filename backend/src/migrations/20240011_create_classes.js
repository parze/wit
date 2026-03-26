exports.up = knex => knex.schema.createTable('classes', t => {
  t.increments('id');
  t.integer('teacher_id').references('id').inTable('users').onDelete('CASCADE');
  t.string('name').notNullable();
  t.timestamps(true, true);
});
exports.down = knex => knex.schema.dropTable('classes');
