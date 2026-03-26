const Anthropic = require('@anthropic-ai/sdk');
const db = require('./db');

const anthropic = new Anthropic();

async function generateSectionDescription(sectionId) {
  const docs = await db('section_documents')
    .where({ section_id: sectionId })
    .select('original_name', 'extracted_text');

  if (docs.length === 0) {
    await db('sections').where({ id: sectionId }).update({ section_description: null });
    return;
  }

  const docNames = docs.map(d => d.original_name).join(', ');
  const combined = docs
    .map(d => `### ${d.original_name}\n\n${d.extracted_text}`)
    .join('\n\n---\n\n');

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: `Du är en pedagogisk assistent. Din uppgift är att skriva en kort, elevvänlig introduktion till ett kursavsnitt baserat på dess dokument.
Regler:
- Skriv 3–5 meningar
- Skriv på samma språk som källtexten
- Nämn källdokumentens namn
- Förklara vad avsnittet handlar om på ett enkelt och uppmuntrande sätt
- Returnera ENDAST ren text, inga rubriker eller Markdown`,
    messages: [
      {
        role: 'user',
        content: `Källdokument: ${docNames}\n\nInnehåll:\n${combined}`,
      },
    ],
  });

  const section_description = message.content[0].text;
  await db('sections').where({ id: sectionId }).update({ section_description });
}

module.exports = { generateSectionDescription };
