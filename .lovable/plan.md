
# Correção: Resultados Não Atualizam na UI (Realtime Subscriptions)

## Problema Identificado

A base de dados confirma que as imagens estão a ser processadas com sucesso:
- `job_status: completed`
- `result_status: completed`  
- `result_url` tem URLs válidos

**Mas o frontend não recebe as atualizações** porque as tabelas `bulk_background_jobs` e `bulk_background_results` **não estão na publicação Realtime do Supabase**.

Tabelas atualmente no Realtime:
- `image_jobs` ✓
- `ugc_images` ✓
- `kling_jobs` ✓
- `outfit_swap_jobs` ✓
- `outfit_swap_results` ✓
- `bulk_background_jobs` ✗ **← FALTA!**
- `bulk_background_results` ✗ **← FALTA!**

### Fluxo Atual (Falha):

```text
Edge Function                  Supabase Realtime                Frontend
     │                              │                              │
     ├── UPDATE job/result          │                              │
     │      ↓                       │                              │
     │   (tabela não está           │                              │
     │    no realtime)              │                              │
     │                         ✗ Nenhum evento                     │
     │                              │                              │
     └──────────────────────────────┼──────────────────────────────┤
                                    │                              │
                                    │    subscribeJob() não        │
                                    │    recebe callback           │
                                    │                              │
                                    │    UI fica "stuck"           │
```

## Solução

Adicionar ambas as tabelas à publicação Realtime do Supabase.

---

## Alteração de Base de Dados

```sql
-- Adicionar tabelas ao Realtime
ALTER PUBLICATION supabase_realtime 
  ADD TABLE bulk_background_jobs;

ALTER PUBLICATION supabase_realtime 
  ADD TABLE bulk_background_results;
```

---

## Adição de Polling Fallback (Segurança Extra)

Como backup, adicionar polling no hook `useBulkBackgroundJob` para garantir que mesmo sem Realtime, a UI atualiza:

```typescript
// Polling fallback - verificar a cada 3 segundos se job está em processamento
useEffect(() => {
  if (!job?.id || job.status === 'completed' || job.status === 'failed' || job.status === 'canceled') {
    return;
  }

  const pollInterval = setInterval(async () => {
    try {
      const { job: updatedJob } = await bulkBackgroundApi.getJob(job.id);
      const { results: updatedResults } = await bulkBackgroundApi.getJobResults(job.id);
      
      if (isMountedRef.current) {
        setJob(updatedJob);
        setResults(updatedResults);
      }
    } catch (e) {
      console.error('Polling error:', e);
    }
  }, 3000);

  return () => clearInterval(pollInterval);
}, [job?.id, job?.status]);
```

---

## Ficheiros a Modificar

| Componente | Alteração |
|------------|-----------|
| **Base de dados** | Adicionar tabelas ao `supabase_realtime` |
| `src/hooks/useBulkBackgroundJob.ts` | Adicionar polling fallback como segurança |

---

## Comparação: Antes vs Depois

| Aspeto | Antes | Depois |
|--------|-------|--------|
| Realtime ativo | ✗ Não | ✓ Sim |
| Updates na UI | Stuck | Instantâneo |
| Fallback | Nenhum | Polling 3s |

---

## Ordem de Implementação

1. **Migração DB**: Adicionar tabelas ao Realtime (1 min)
2. **Hook**: Adicionar polling fallback (3 min)
3. **Teste**: Verificar fluxo completo

**Tempo estimado: 5 minutos**
