const Anthropic = require('@anthropic-ai/sdk');
const db = require('./db');

const anthropic = new Anthropic();

const BASE_COMPILE_PROMPT = `Du är en pedagogisk redaktör. Sammanställ och strukturera läromedel för ett arbetsområde till ett välstrukturerat Markdown-dokument uppdelat i tydliga Moment.

Regler:
- Skriv på samma språk som källtexten
- Varje Moment ska vara en ## rubrik (exakt nivå 2)
- Varje Moment ska innehålla det eleven behöver lära sig och göra för att bemästra den delen
- Lägg till en kort introduktion i början (utan ## rubrik)
- Undvik onödiga upprepningar, behåll allt viktigt innehåll
- Returnera ENDAST Markdown-text, inga förklaringar`;

async function compileCourseMaterial(courseId) {
  const docs = await db('section_documents')
    .where({ course_id: courseId })
    .select('original_name', 'extracted_text');

  if (docs.length === 0) {
    await db('courses').where({ id: courseId }).update({ compiled_material: null });
    return;
  }

  const combined = docs
    .map(d => `### ${d.original_name}\n\n${d.extracted_text}`)
    .join('\n\n---\n\n');

  const course = await db('courses').where({ id: courseId }).select('instruction_id').first();
  let systemPrompt = BASE_COMPILE_PROMPT;
  if (course?.instruction_id) {
    const instruction = await db('course_instructions').where({ id: course.instruction_id }).first();
    if (instruction?.compile_prompt) {
      systemPrompt = instruction.compile_prompt;
    }
  }

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Sammanställ följande kursdokument till ett välstrukturerat lärmaterial:\n\n${combined}`,
      },
    ],
  });

  const compiled_material = message.content[0].text;

  const compiled_toc = compiled_material
    .split('\n')
    .filter(line => /^##\s+/.test(line) && !/^###/.test(line))
    .map(line => line.replace(/^##\s+/, '').trim());

  await db('courses').where({ id: courseId }).update({
    compiled_material,
    compiled_toc: JSON.stringify(compiled_toc),
  });
}

module.exports = { compileCourseMaterial };
