exports.up = function (knex) {
  return knex.schema.createTable('section_documents', (table) => {
    table.increments('id').primary();
    table.integer('section_id').unsigned().notNullable()
      .references('id').inTable('sections').onDelete('CASCADE');
    table.string('filename').notNullable();
    table.string('original_name').notNullable();
    table.text('extracted_text');
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('section_documents');
};
