exports.up = async function (knex) {
  await knex.schema.createTable('section_stars', t => {
    t.increments('id').primary();
    t.integer('child_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('course_id').unsigned().notNullable().references('id').inTable('courses').onDelete('CASCADE');
    t.integer('goal_achievement');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('section_stars');
};
