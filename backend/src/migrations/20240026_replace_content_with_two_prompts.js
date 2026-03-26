exports.up = async function (knex) {
  await knex.schema.table('course_instructions', (table) => {
    table.text('compile_prompt');
    table.text('chat_prompt');
  });

  // Migrate existing rows: put old content in both fields as placeholder
  await knex('course_instructions').update({
    compile_prompt: knex.ref('content'),
    chat_prompt: knex.ref('content'),
  });

  await knex.schema.table('course_instructions', (table) => {
    table.dropColumn('content');
  });
};

exports.down = async function (knex) {
  await knex.schema.table('course_instructions', (table) => {
    table.text('content');
  });
  await knex('course_instructions').update({
    content: knex.ref('compile_prompt'),
  });
  await knex.schema.table('course_instructions', (table) => {
    table.dropColumn('compile_prompt');
    table.dropColumn('chat_prompt');
  });
};
