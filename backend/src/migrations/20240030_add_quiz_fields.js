exports.up = function (knex) {
  return knex.schema
    .table('chat_sessions', (t) => {
      t.jsonb('quiz_messages').defaultTo('[]').notNullable();
    })
    .table('ai_summaries', (t) => {
      t.integer('quiz_score').nullable();
      t.jsonb('quiz_answered_sections').defaultTo('[]').notNullable();
    })
    .table('course_instructions', (t) => {
      t.text('quiz_prompt').nullable();
    });
};

exports.down = function (knex) {
  return knex.schema
    .table('chat_sessions', (t) => {
      t.dropColumn('quiz_messages');
    })
    .table('ai_summaries', (t) => {
      t.dropColumn('quiz_score');
      t.dropColumn('quiz_answered_sections');
    })
    .table('course_instructions', (t) => {
      t.dropColumn('quiz_prompt');
    });
};
