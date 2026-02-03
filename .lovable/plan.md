
# Plano de Implementação: Bulk Background com Arquitetura Robusta

## Visão Geral

Este plano restrutura o módulo **Bulk Background** para utilizar uma arquitetura similar ao **Outfit Swap**, com processamento sequencial, mecanismos de segurança, recuperação automática e monitorização.

---

## Requisitos Identificados

1. **API Gemini** para composição produto + fundo
2. **Processamento sequencial** (uma imagem de cada vez)
3. **Prompt simplificado**: "insere o produto na imagem com o fundo, mantendo um aspeto clean e profissional"
4. **Output em 1:1** (quadrado)
5. **Arquitetura similar ao Outfit Swap** para gestão de batches
6. **Mecanismos de segurança**: retry, recuperação, refunds automáticos

---

## Arquitetura Proposta

```text
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  useBulkBackgroundJob.ts ──► bulk-background-api.ts             │
│         │                           │                            │
│         │ Realtime                  │ HTTP                       │
│         ▼                           ▼                            │
├─────────────────────────────────────────────────────────────────┤
│                    EDGE FUNCTION                                 │
│                  bulk-background                                 │
│                                                                  │
│  ┌────────────┐    ┌─────────────┐    ┌──────────────┐         │
│  │ createJob  │───►│ processJob  │───►│ recoverJobs  │         │
│  │            │    │ (sequencial)│    │ (pg_cron)    │         │
│  └────────────┘    └─────────────┘    └──────────────┘         │
│        │                  │                   │                  │
│        │   ┌──────────────┴───────────────┐   │                 │
│        │   │     GEMINI API               │   │                 │
│        │   │  gemini-3-pro-image-preview  │   │                 │
│        │   └──────────────────────────────┘   │                 │
│        │                  │                   │                  │
│        ▼                  ▼                   ▼                  │
├─────────────────────────────────────────────────────────────────┤
│                       DATABASE                                   │
│  bulk_background_jobs ◄──► bulk_background_results              │
│        │                           │                             │
│        │ RLS + Service Role        │ RLS + Service Role         │
│        ▼                           ▼                             │
├─────────────────────────────────────────────────────────────────┤
│                       STORAGE                                    │
│  Hetzner S3: bulk-background/{userId}/{jobId}/                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Alterações Técnicas

### 1. Edge Function: `bulk-background/index.ts`

#### 1.1 Modelo Gemini
Alterar de `imagen-4.0-generate-001` para `gemini-3-pro-image-preview` (mesmo do outfit-swap):

```typescript
const GEMINI_MODEL = "gemini-3-pro-image-preview";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
```

#### 1.2 Prompt Simplificado
```typescript
const BASE_PROMPT = `Insere o produto na imagem de fundo fornecida.

REGRAS OBRIGATÓRIAS:
1. PRODUTO CENTRADO: O produto deve estar perfeitamente centrado no frame
2. PROPORÇÕES: Manter proporções originais do produto, sem distorção
3. ASPETO: Clean e profissional, qualidade e-commerce
4. ILUMINAÇÃO: Consistente com o fundo, sombras naturais
5. INTEGRAÇÃO: O produto deve parecer naturalmente colocado no ambiente
6. OUTPUT: Imagem quadrada (1:1) de alta resolução

PROIBIDO: Alterar o produto, adicionar elementos, recortar mal o produto.`;
```

#### 1.3 Geração com Retry e Backoff Exponencial
```typescript
async function generateImageWithRetry(
  productBase64: string,
  backgroundBase64: string | null,
  backgroundPrompt: string,
  maxRetries: number = 3
): Promise<string | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const delay = Math.pow(2, attempt - 1) * 1000 + Math.random() * 500;
      if (attempt > 1) await sleep(delay);
      
      const parts = [
        { text: buildPrompt(backgroundPrompt) },
        { inlineData: { mimeType: "image/jpeg", data: productBase64 } }
      ];
      
      // Se tiver fundo custom, adicionar como segunda imagem
      if (backgroundBase64) {
        parts.push({
          inlineData: { mimeType: "image/jpeg", data: backgroundBase64 }
        });
      }
      
      const response = await fetch(GEMINI_ENDPOINT, {
        method: "POST",
        headers: {
          "x-goog-api-key": GOOGLE_AI_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
            aspectRatio: "1:1"  // Forçar output quadrado
          }
        })
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          console.log(`[Attempt ${attempt}] Rate limited, waiting...`);
          continue;
        }
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      return extractBase64Image(data);
    } catch (error) {
      console.error(`[Attempt ${attempt}] Error:`, error);
      if (attempt === maxRetries) return null;
    }
  }
  return null;
}
```

#### 1.4 Processamento Sequencial com Controlo de Estado
```typescript
case "processJob": {
  // PROCESSAMENTO SEQUENCIAL - UMA IMAGEM DE CADA VEZ
  for (const result of results) {
    // Verificar se job foi cancelado
    const { data: currentJob } = await adminClient
      .from("bulk_background_jobs")
      .select("status")
      .eq("id", jobId)
      .single();
    
    if (currentJob?.status === "canceled") {
      console.log(`Job ${jobId} was canceled, stopping processing`);
      break;
    }
    
    // Processar esta imagem
    await processImage(result, job, adminClient);
    
    // Atualizar progresso após cada imagem
    await updateJobProgress(jobId, adminClient);
  }
}
```

#### 1.5 Mecanismo de Recuperação (Recovery Action)
```typescript
case "recoverJobs": {
  // Chamado por pg_cron a cada 5 minutos
  const queuedCutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  const stuckCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  
  // Jobs queued há mais de 3 minutos
  const { data: queuedJobs } = await adminClient
    .from("bulk_background_jobs")
    .select("id")
    .eq("status", "queued")
    .lte("created_at", queuedCutoff)
    .limit(10);
  
  // Re-trigger queued jobs
  for (const job of queuedJobs || []) {
    await triggerWorker(job.id);
  }
  
  // Jobs stuck em processing há mais de 10 minutos
  const { data: stuckJobs } = await adminClient
    .from("bulk_background_jobs")
    .select("id, user_id, completed_images, total_images")
    .eq("status", "processing")
    .lte("updated_at", stuckCutoff)
    .limit(10);
  
  // Marcar como failed e refund
  for (const job of stuckJobs || []) {
    await adminClient.from("bulk_background_jobs").update({
      status: "failed",
      error: "Job timeout - automatic recovery",
      finished_at: new Date().toISOString()
    }).eq("id", job.id);
    
    // Refund imagens não processadas
    const unprocessed = job.total_images - job.completed_images;
    if (unprocessed > 0) {
      await adminClient.rpc("refund_user_credits", {
        p_user_id: job.user_id,
        p_amount: unprocessed * CREDITS_PER_IMAGE,
        p_reason: "bulk_background_timeout_refund"
      });
    }
  }
  
  return json({ recovered: queuedJobs?.length || 0, failed: stuckJobs?.length || 0 });
}
```

#### 1.6 Worker Trigger com Retry
```typescript
async function triggerWorker(jobId: string, retryCount = 0): Promise<void> {
  const maxRetries = 3;
  const delay = Math.pow(2, retryCount) * 1000;
  
  try {
    await sleep(delay);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/bulk-background`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ action: "processJob", jobId })
    });
    
    if (!response.ok && retryCount < maxRetries) {
      console.log(`Worker trigger failed, retry ${retryCount + 1}/${maxRetries}...`);
      return triggerWorker(jobId, retryCount + 1);
    }
  } catch (error) {
    console.error("Worker trigger error:", error);
    if (retryCount < maxRetries) {
      return triggerWorker(jobId, retryCount + 1);
    }
  }
}
```

---

### 2. Nova Action: Retry Individual

Permitir retry de imagens que falharam (similar ao outfit-swap):

```typescript
case "retryResult": {
  const { resultId } = body;
  
  // Verificar ownership e status
  const { data: result } = await adminClient
    .from("bulk_background_results")
    .select("*, bulk_background_jobs!inner(user_id, background_type, background_preset_id, background_image_url)")
    .eq("id", resultId)
    .eq("status", "failed")
    .single();
  
  if (!result || result.bulk_background_jobs.user_id !== userId) {
    return errorResponse("Result not found or not failed", 404);
  }
  
  // Verificar créditos
  const { data: isAdmin } = await adminClient.rpc("is_admin", { check_user_id: userId });
  if (!isAdmin) {
    const { data: sub } = await adminClient
      .from("subscribers")
      .select("credits_balance")
      .eq("user_id", userId)
      .single();
    
    if (!sub || sub.credits_balance < CREDITS_PER_IMAGE) {
      return errorResponse("Insufficient credits", 402);
    }
    
    await adminClient.rpc("deduct_user_credits", {
      p_user_id: userId,
      p_amount: CREDITS_PER_IMAGE,
      p_reason: "bulk_background_retry"
    });
  }
  
  // Reset result status
  await adminClient
    .from("bulk_background_results")
    .update({ status: "pending", error: null })
    .eq("id", resultId);
  
  // Re-processar (inline para retry individual)
  await processSingleResult(result, result.bulk_background_jobs, adminClient);
  
  return json({ success: true });
}
```

---

### 3. pg_cron Job para Recuperação Automática

Adicionar ao `supabase/migrations` um cron job:

```sql
-- Recovery job que corre a cada 5 minutos
SELECT cron.schedule(
  'bulk-background-recovery',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://dhqdamfisdbbcieqlpvt.supabase.co/functions/v1/bulk-background',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb,
      body := '{"action": "recoverJobs"}'::jsonb
    ) AS request_id;
  $$
);
```

---

### 4. Alterações à Base de Dados

#### 4.1 Novo Campo para Tracking de Tentativas
```sql
ALTER TABLE bulk_background_results 
ADD COLUMN retry_count INTEGER DEFAULT 0,
ADD COLUMN last_attempt_at TIMESTAMPTZ;
```

#### 4.2 Índice para Recovery Queries
```sql
CREATE INDEX idx_bulk_bg_jobs_recovery 
ON bulk_background_jobs(status, updated_at) 
WHERE status IN ('queued', 'processing');
```

---

### 5. Atualização do Frontend

#### 5.1 Hook: Adicionar Retry Individual
```typescript
const retryResult = async (resultId: string) => {
  try {
    await bulkBackgroundApi.retryResult(resultId);
    toast({ title: "Retry iniciado", description: "A reprocessar imagem..." });
    // Refresh results
    const { results } = await bulkBackgroundApi.getJobResults(job!.id);
    setResults(results);
  } catch (err) {
    toast({ title: "Erro", description: err.message, variant: "destructive" });
  }
};
```

#### 5.2 API: Nova Função
```typescript
async retryResult(resultId: string): Promise<{ success: boolean }> {
  return callFunction('retryResult', { resultId });
}
```

---

## Comparação: Antes vs Depois

| Aspeto | Atual | Proposto |
|--------|-------|----------|
| Modelo AI | imagen-4.0-generate-001 | gemini-3-pro-image-preview |
| Processamento | Sequencial simples | Sequencial com checkpoints |
| Retry | Não | Sim (3 tentativas com backoff) |
| Recovery | Não | Sim (pg_cron cada 5 min) |
| Retry individual | Não | Sim |
| Output | Variável | Sempre 1:1 |
| Prompt | Longo por preset | Simplificado + preset hint |
| Estado | Básico | Com updated_at tracking |

---

## Segurança e Fiabilidade

1. **Atomic Claims**: Usar `updated_at` para evitar processamento duplicado
2. **Timeout Detection**: Jobs stuck > 10 min são auto-failed
3. **Credit Safety**: Refunds automáticos em falhas e timeouts
4. **Retry Logic**: Backoff exponencial para rate limits da API
5. **Progress Tracking**: Atualização após cada imagem processada
6. **Cancellation Check**: Verificar status antes de cada imagem

---

## Ficheiros a Modificar/Criar

| Ficheiro | Ação |
|----------|------|
| `supabase/functions/bulk-background/index.ts` | Reescrever completamente |
| `supabase/migrations/*.sql` | Adicionar campos e cron job |
| `src/api/bulk-background-api.ts` | Adicionar retryResult |
| `src/hooks/useBulkBackgroundJob.ts` | Adicionar retryResult |
| `src/pages/BulkBackground.tsx` | Adicionar botão retry por imagem |

---

## Ordem de Implementação

1. **Migração DB**: Campos novos + índices (5 min)
2. **Edge Function**: Reescrever com nova arquitetura (2-3 horas)
3. **Cron Job**: Adicionar recovery automático (15 min)
4. **API + Hook**: Atualizar com retry (30 min)
5. **Frontend**: UI para retry individual (30 min)
6. **Testes**: Verificar fluxo completo (1 hora)

**Total estimado: 4-5 horas**
