exports.up = async function (knex) {
  await knex.schema.createTable('ai_summaries', t => {
    t.increments('id').primary();
    t.integer('child_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('course_id').unsigned().notNullable().references('id').inTable('courses').onDelete('CASCADE');
    t.text('summary');
    t.integer('goal_achievement');
    t.text('reasons');
    t.string('current_section');
    t.jsonb('completed_sections');
    t.integer('quiz_score');
    t.jsonb('quiz_answered_sections');
    t.unique(['child_id', 'course_id']);
    t.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('ai_summaries');
};
