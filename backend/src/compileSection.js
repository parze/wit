const Anthropic = require('@anthropic-ai/sdk');
const db = require('./db');

const anthropic = new Anthropic();

async function compileSectionMaterial(sectionId) {
  const docs = await db('section_documents')
    .where({ section_id: sectionId })
    .select('original_name', 'extracted_text');

  if (docs.length === 0) {
    await db('sections').where({ id: sectionId }).update({ compiled_material: null });
    return;
  }

  const combined = docs
    .map(d => `### ${d.original_name}\n\n${d.extracted_text}`)
    .join('\n\n---\n\n');

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: `Du är en pedagogisk redaktör. Din uppgift är att sammanställa och omstrukturera råtext från kursdokument till ett välstrukturerat, pedagogiskt Markdown-dokument.
Regler:
- Skriv på samma språk som källtexten
- Behåll allt viktigt innehåll men undvik onödiga upprepningar
- Använd tydliga rubriker (##, ###), punktlistor och numrerade listor där det passar
- Lägg till en kort introduktion i början
- Formatera koden i kodblock om det förekommer
- Returnera ENDAST Markdown-text, inga förklaringar`,
    messages: [
      {
        role: 'user',
        content: `Sammanställ följande kursdokument till ett välstrukturerat lärmaterial:\n\n${combined}`,
      },
    ],
  });

  const compiled_material = message.content[0].text;
  await db('sections').where({ id: sectionId }).update({ compiled_material });
}

module.exports = { compileSectionMaterial };
