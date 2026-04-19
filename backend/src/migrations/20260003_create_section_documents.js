exports.up = async function (knex) {
  await knex.schema.createTable('section_documents', t => {
    t.increments('id').primary();
    t.integer('course_id').unsigned().notNullable().references('id').inTable('courses').onDelete('CASCADE');
    t.string('filename').notNullable();
    t.string('original_name').notNullable();
    t.text('extracted_text');
    t.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('section_documents');
};
