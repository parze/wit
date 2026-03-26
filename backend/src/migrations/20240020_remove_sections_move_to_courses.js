exports.up = async function (knex) {
  // Add course_id to all tables that had section_id
  const tables = [
    'section_documents',
    'section_progress',
    'chat_sessions',
    'ai_summaries',
    'quiz_questions',
    'quiz_results',
    'section_stars',
  ];

  for (const table of tables) {
    await knex.schema.alterTable(table, t => {
      t.integer('course_id').unsigned().references('id').inTable('courses').onDelete('CASCADE');
    });

    // Populate course_id from sections via section_id
    await knex.raw(`
      UPDATE ${table}
      SET course_id = sections.course_id
      FROM sections
      WHERE ${table}.section_id = sections.id
    `);

    // Make course_id NOT NULL, drop section_id
    await knex.schema.alterTable(table, t => {
      t.integer('course_id').unsigned().notNullable().alter();
    });

    await knex.schema.alterTable(table, t => {
      t.dropColumn('section_id');
    });
  }

  // Add compiled_material and section_description to courses
  await knex.schema.alterTable('courses', t => {
    t.text('compiled_material');
    t.text('section_description');
  });

  // Copy compiled_material from first section of each course (if any)
  await knex.raw(`
    UPDATE courses
    SET compiled_material = s.compiled_material,
        section_description = s.section_description
    FROM (
      SELECT DISTINCT ON (course_id) course_id, compiled_material, section_description
      FROM sections
      ORDER BY course_id, "order" ASC
    ) s
    WHERE courses.id = s.course_id
  `);
};

exports.down = async function (knex) {
  // This migration is not reversible in a meaningful way
  throw new Error('Down migration not supported for section removal');
};
