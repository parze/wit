exports.up = async function (knex) {
  // Remove duplicates, keep the one with lowest id
  await knex.raw(`
    DELETE FROM course_instructions
    WHERE is_default = true
      AND id NOT IN (
        SELECT MIN(id) FROM course_instructions
        WHERE is_default = true
        GROUP BY teacher_id
      )
  `);

  // Prevent it from happening again
  await knex.raw(`
    CREATE UNIQUE INDEX course_instructions_one_default_per_teacher
    ON course_instructions (teacher_id)
    WHERE is_default = true
  `);
};

exports.down = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS course_instructions_one_default_per_teacher');
};
