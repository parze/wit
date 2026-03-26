exports.up = knex => knex.schema.createTable('class_members', t => {
  t.increments('id');
  t.integer('class_id').references('id').inTable('classes').onDelete('CASCADE');
  t.integer('student_id').references('id').inTable('users').onDelete('CASCADE');
  t.timestamps(true, true);
  t.unique(['class_id', 'student_id']);
});
exports.down = knex => knex.schema.dropTable('class_members');
