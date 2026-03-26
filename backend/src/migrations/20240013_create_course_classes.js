exports.up = knex => knex.schema.createTable('course_classes', t => {
  t.increments('id');
  t.integer('course_id').references('id').inTable('courses').onDelete('CASCADE');
  t.integer('class_id').references('id').inTable('classes').onDelete('CASCADE');
  t.timestamps(true, true);
  t.unique(['course_id', 'class_id']);
});
exports.down = knex => knex.schema.dropTable('course_classes');
