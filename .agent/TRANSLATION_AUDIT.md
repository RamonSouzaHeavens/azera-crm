# Translation Audit Report

This report details the internationalization (i18n) status of key files in the codebase.

## Summary

| File | Status | Notes |
| :--- | :--- | :--- |
| `src/pages/Dashboard.tsx` | ✅ Mostly Translated | Some hardcoded strings might remain (based on previous context). |
| `src/pages/Leads.tsx` | ✅ Mostly Translated | Some hardcoded strings might remain (based on previous context). |
| `src/pages/MinhaEquipe.tsx` | ✅ Fully Translated | Excellent usage of `t('team.*')`. |
| `src/pages/Configuracoes.tsx` | ⚠️ Partially Translated | Many hardcoded toast messages found. |
| `src/pages/Conversations.tsx` | ⚠️ Partially Translated | Hardcoded toast messages and console logs. |
| `src/pages/Tarefas.tsx` | ⚠️ Partially Translated | Hardcoded toast messages, prompts, and some default state values. |
| `src/pages/Login.tsx` | ✅ Mostly Translated | Console logs are hardcoded (acceptable). |
| `src/pages/LandingPremium.tsx` | ❌ **Not Translated** | Almost entirely hardcoded text. Needs major refactoring. |
| `src/components/team/MetaInsights.tsx` | ❌ **Not Translated** | No `useTranslation` hook used. All text is hardcoded. |
| `src/components/team/DeleteNoteModal.tsx` | ❌ **Not Translated** | No `useTranslation` hook used. All text is hardcoded. |
| `src/pages/Produtos.tsx` | ⚠️ Partially Translated | Hardcoded status logic and console logs. |
| `src/pages/ProdutoNovo.tsx` | ⚠️ Partially Translated | Hardcoded toast messages, options, and placeholders. |
| `src/components/Onboarding.tsx` | ✅ Fully Translated | Good usage of `t('onboarding.*')`. |
| `src/components/ExpenseManager.tsx` | ✅ Fully Translated | Backend values are hardcoded but display is translated. |

## Detailed Findings

### `src/pages/Configuracoes.tsx`
- **Hardcoded Toasts**:
  - 'Perfil atualizado!'
  - 'Formato inválido. Envie uma imagem.'
  - 'Imagem muito grande. Máx. 5MB.'
  - 'Upload não retornou URL'
  - 'Erro ao salvar avatar no perfil'
  - 'Avatar atualizado com sucesso!'
  - 'Erro ao atualizar avatar'
  - 'Configurações salvas!'
  - 'Falha ao salvar configurações da empresa.'
  - 'Confirmação inválida. Digite seu email para confirmar.'
  - 'Sessão expirada. Faça login novamente.'
  - 'Conta deletada com sucesso!'
  - 'Erro ao excluir conta. Tente novamente.'
  - 'Preencha todos os campos'
  - 'Nova senha e confirmação não coincidem'
  - 'Nova senha deve ter pelo menos 6 caracteres'
  - '✅ Senha alterada! Logout em 3 segundos...'
  - 'Senha atual incorreta'
  - 'Erro inesperado ao alterar senha'

### `src/pages/Conversations.tsx`
- **Hardcoded Toasts**:
  - 'Foto do perfil atualizada com sucesso!'
  - 'Foto de perfil atualizada!'

### `src/pages/Tarefas.tsx`
- **Hardcoded Strings**:
  - 'Pendente', 'Em Progresso', 'Bloqueada', 'Concluída' (Default task stages)
  - 'Novo item' (Checklist default)
  - 'Adicionar tempo (minutos):' (Prompt)
  - 'Gerenciamento'
  - 'Nome da etapa não pode ser vazio'
  - 'Etapa atualizada'
  - 'Erro ao atualizar etapa'
  - 'Você tem alterações não salvas. Deseja descartar as alterações?'
  - '✅ Tarefa salva com sucesso'
  - 'Tarefa atualizada'
  - 'Erro ao atualizar tarefa'
  - 'Tarefa excluída'
  - 'Erro ao carregar tarefas'

### `src/pages/LandingPremium.tsx`
- **Critical**: This file is almost entirely hardcoded Portuguese text. It needs a full extraction of strings to `locales`.
- Examples: 'Transforme seu negócio hoje', 'Automatize, organize e venda mais', 'Casos de Uso', etc.

### `src/components/team/MetaInsights.tsx`
- **Critical**: No internationalization implemented.
- Hardcoded: 'Formulário Facebook', 'Erro ao buscar leads', 'Token expirado', 'Leads Recentes', table headers, etc.

### `src/components/team/DeleteNoteModal.tsx`
- **Critical**: No internationalization implemented.
- Hardcoded: 'Excluir Nota', 'Esta ação não pode ser desfeita', 'Tem certeza que deseja excluir a nota', buttons.

### `src/pages/Produtos.tsx`
- **Hardcoded Strings**:
  - Status logic: `item.status.replace('_', ' ').toUpperCase()` (Should use translation keys)
  - 'm²', 'até ... m²'
  - Console logs (acceptable but could be improved)

### `src/pages/ProdutoNovo.tsx`
- **Hardcoded Strings**:
  - Toasts: 'Capa carregada!', 'Erro ao carregar capa', 'imagem(ns) adicionada(s)!', 'Campo atualizado!', 'Produto criado com sucesso!', etc.
  - Options: 'Serviço', 'Produto', 'Consulta', 'Pacote', 'Selecione...'
  - Placeholders: 'Digite aqui...'
  - UI Text: 'Alterar', 'Documento', 'Ver'

## Recommendations

1.  **Prioritize `LandingPremium.tsx`**: This is a public-facing page and should be fully localized.
2.  **Fix Toasts**: Move all toast messages in `Configuracoes.tsx`, `Conversations.tsx`, `Tarefas.tsx`, and `ProdutoNovo.tsx` to the translation files.
3.  **Implement i18n in Components**: Add `useTranslation` to `MetaInsights.tsx` and `DeleteNoteModal.tsx`.
4.  **Refactor Status/Options**: Ensure status labels and dropdown options in `Produtos.tsx` and `ProdutoNovo.tsx` use translation keys instead of hardcoded strings.
