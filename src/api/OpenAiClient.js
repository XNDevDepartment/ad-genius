// src/OpenAiClient.js
// ────────────────────────────────────────────────────────────
// Usa variáveis de ambiente definidas em .env
// VITE_OPENAI_API_KEY       = sk-…
// VITE_OPENAI_ASSISTANT_ID  = asst_…
// ────────────────────────────────────────────────────────────
const BASE = 'https://api.openai.com/v1';

const HEADERS = {
  Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
  'OpenAI-Beta': 'assistants=v2',
  'Content-Type': 'application/json',
};

// ───────── helpers ─────────
async function createThread() {
  const r = await fetch(`${BASE}/threads`, {
    method: 'POST',
    headers: HEADERS,
  });
  const { id } = await r.json();
  return id;
}

async function addUserMessage(threadId, content) {

  // Se vier só texto, converte para [{ type:'text', text:{ value }}]
  const bodyContent = typeof content === 'string'
  ? [{ type: 'text', text: content  }]
  : content;

  await fetch(`${BASE}/threads/${threadId}/messages`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      role: 'user',
      content: bodyContent
    }),
  });
}

async function createRun(threadId, assistantId) {

  const res = await fetch(`${BASE}/threads/${threadId}/runs`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ assistant_id: assistantId }),
  });

  // ⚠️  Se a API falhar, lança logo um erro descritivo
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`createRun falhou: ${err.error?.message || res.statusText}`);
  }

  const json = await res.json();

  return json.id;                            // devolve run_id OU undefined
}


async function waitRun(threadId, runId) {
  // espera até o run terminar ou falhar
  while (true) {
    const r = await fetch(`${BASE}/threads/${threadId}/runs/${runId}`, {
      headers: HEADERS,
    });
    const data = await r.json();

    if (data.status === 'completed') break;
    if (['failed', 'cancelled', 'expired'].includes(data.status)) {
      throw new Error(`Run falhou: ${data.status}`);
    }
    await new Promise((res) => setTimeout(res, 1200));
  }
}

async function latestAssistantReply(threadId) {
  const r = await fetch(`${BASE}/threads/${threadId}/messages?role=assistant&limit=1&order=desc`, {
    headers: HEADERS,
  });
  const { data } = await r.json();
  // devolve o primeiro bloco de texto (value) ou string vazia
  return data[0]?.content?.[0]?.text?.value ?? '';
}

/**
 * Envia texto do utilizador ao assistant e devolve a resposta.
 * @param {string} threadId   – id do thread (já existente)
 * @param {string} text       – resposta do utilizador
 * @returns {Promise<string>} – próxima mensagem do assistant
 */
export async function converse(threadId, text, assistantId) {
  // 1️⃣ adicionar a mensagem do utilizador
  await addUserMessage(threadId, text);

  // 2️⃣ criar novo run
  const runId = await createRun(threadId, assistantId);

  // 3️⃣ aguardar conclusão
  await waitRun(threadId, runId);

  // 4️⃣ obter a última mensagem do assistant
  return await latestAssistantReply(threadId);
}

/* ---------- uploadFile ---------- */
export async function uploadFile(file) {
  const allowed = ['image/jpeg', 'image/png'];
  if (!allowed.includes(file.type)) {
    throw new Error('Formato inválido — só JPG ou PNG.');
  }

  const form = new FormData();
  form.append('file', file);          // Blob
  form.append('purpose', 'vision');

  const r = await fetch('https://api.openai.com/v1/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
      'OpenAI-Beta': 'assistants=v2',
    },
    body: form,
  });
  if (!r.ok) throw new Error('Falha no upload da imagem.');
  const { id } = await r.json();
  return id; // file_id
}

  /**
   * Edita uma imagem existente usando o modelo gpt-image-1.
   *
   * @param {File}   baseFile   - O ficheiro de imagem original (JPG/PNG).
   * @param {string} prompt     - Instruções de edição (texto em PT-PT).
   * @param {object} [opts]     - Opções adicionais.
   * @param {'low'|'medium'|'high'} [opts.quality='medium']           - Qualidade da edição.
   * @param {'1024x1024'|'1024x1792'|'1792x1024'} [opts.size='1024x1024']  - Resolução de saída.
   * @param {'png'|'jpeg'|'webp'} [opts.output_format='png']          - Formato de ficheiro de saída.
   * @param {File}   [maskFile] - Opcional: máscara para in-painting (mesmo tamanho/baseFile).
   *
   * @returns {Promise<string[]>}   - Array de  base64 strings das imagens editadas.
   */
  export async function generateImagesFromBase(
    baseFile,
    prompt,
    {
      number = 1,
      quality = 'medium',
      size = '1024x1024',
      output_format = 'png',
    } = {},
    maskFile = null,
  ) {
    // Validações rápidas
  if (!['image/jpeg', 'image/png'].includes(baseFile.type)) {
    console.log("Erro no formato da imagem")
    throw new Error('Formato inválido: apenas JPG ou PNG são aceites.');
  }
  if (maskFile && !['image/png'].includes(maskFile.type)) {
    console.log("Erro na mascara da imagem")
    throw new Error('Máscara inválida: apenas PNG (com transparência).');
  }

  // Cria as chamadas em paralelo (até 16, mas neste exemplo 3)
  const calls = Array.from({ length: number}, async () => {
    const form = new FormData();
    form.append('model', 'gpt-image-1');
    form.append('image', baseFile);
    if (maskFile) form.append('mask', maskFile);
    form.append('prompt', prompt);
    form.append('size', size);
    form.append('quality', quality);
    form.append('output_format', output_format);

      const res = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2',
          // Note: não definimos Content-Type para FormData
        },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json();
        toast(err)
        console.log(err)
        throw new Error(err.error?.message || 'Falha na edição da imagem.');
      }
      const { data } = await res.json();
      // Retorna a string b64_json da primeira (e única) imagem
      return data[0].b64_json;
  });
  return Promise.all(calls);
}


/* ---------- gerar 1 imagem com gpt-image-1 ---------- */
async function generateOneImage(prompt, { quality = 'medium', size = '1024x1024', format = 'png' } = {}) {
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
      'OpenAI-Beta': 'assistants=v2',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      quality,          // low · medium · high
      size,             // 1024x1024 · 1024x1792 · 1792x1024
      output_format: format, // png · jpeg · webp
    }),
  });
  if (!r.ok) throw new Error('Falha a gerar imagem');
  const { data } = await r.json();        // { data:[{b64_json}] }
  return data[0].b64_json;                // devolve base64 string
}

/* ---------- gerar N imagens (chamadas em paralelo) ---------- */
export async function generateImages(prompt, n = 3, opts = {}) {
  const tasks = Array.from({ length: n }, () => generateOneImage(prompt, opts));
  return await Promise.all(tasks);        // [base64, base64, …]
}

// ───────── API pública ─────────
/**
 * Inicia a conversa: devolve { threadId, reply }
 * Usa "START" como gatilho, mas podes mudar se quiseres.
 */
export async function startConversationAPI(assistantId) {
  const threadId = await createThread();
  await addUserMessage(threadId, 'START');
  const runId = await createRun(threadId, assistantId);
  await waitRun(threadId, runId);
  const reply = await latestAssistantReply(threadId);
  return { threadId, reply };
}
