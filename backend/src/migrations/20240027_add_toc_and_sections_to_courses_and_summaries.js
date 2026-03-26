exports.up = async function (knex) {
  await knex.schema.table('courses', (table) => {
    table.jsonb('compiled_toc').defaultTo('[]');
  });
  await knex.schema.table('ai_summaries', (table) => {
    table.text('current_section').defaultTo('');
    table.jsonb('completed_sections').defaultTo('[]');
  });
};

exports.down = async function (knex) {
  await knex.schema.table('courses', (table) => {
    table.dropColumn('compiled_toc');
  });
  await knex.schema.table('ai_summaries', (table) => {
    table.dropColumn('current_section');
    table.dropColumn('completed_sections');
  });
};
