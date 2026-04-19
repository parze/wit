exports.up = async function (knex) {
  await knex.schema.createTable('courses', t => {
    t.increments('id').primary();
    t.string('title').notNullable();
    t.text('description');
    t.integer('parent_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('compiled_material');
    t.jsonb('compiled_toc');
    t.string('learning_mode');
    t.boolean('enable_quick_replies').defaultTo(false);
    t.boolean('enable_tts').defaultTo(false);
    t.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('courses');
};
