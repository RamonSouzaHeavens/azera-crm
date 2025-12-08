# Prompt Otimizado para Internacionalização (i18n)

Copie e cole o texto abaixo em uma IA (ChatGPT, Claude, etc.) para automatizar o processo de tradução dos arquivos restantes.

---

## 🤖 Prompt para a IA

**Contexto:**
Você é um Engenheiro de Software Sênior especialista em React, TypeScript e internacionalização com `i18next`. Estamos migrando um CRM para suportar múltiplos idiomas.

**Sua Tarefa:**
Eu vou te fornecer o código de um componente React (`.tsx`). Você deve:
1. **Analisar** o código e identificar todos os textos visíveis para o usuário (hardcoded strings).
2. **Substituir** esses textos pelo hook `useTranslation`.
   - Importe: `import { useTranslation } from 'react-i18next'`
   - Instancie: `const { t } = useTranslation()`
   - Substitua: `'Texto'` por `t('pagina.secao.chave')`
3. **Gerar o JSON** correspondente para o arquivo `pt-BR.json`.

**Regras Importantes:**
- **NÃO** traduza nomes de classes CSS, IDs, URLs, logs de console (`console.log`) ou chaves de objetos técnicos.
- Mantenha a estrutura hierárquica no JSON (ex: `joinTeam.title`, `joinTeam.form.email`).
- Use chaves semânticas em inglês ou português (ex: `submit_button` ou `botao_enviar`), mas mantenha consistência.
- Se o texto tiver variáveis (ex: "Olá, {nome}"), use a interpolação do i18next: `t('ola', { nome: nome })`.

**Formato de Saída Esperado:**

1. **Código Refatorado:** O arquivo `.tsx` completo com as alterações.
2. **JSON para Adicionar:** O trecho JSON que devo colar no `pt-BR.json`.

---

**Arquivos Alvo (Copie um por vez para a IA):**

### Prioridade Alta:
1. `src/pages/JoinTeam.tsx`
2. `src/pages/TarefaNova.tsx`
3. `src/pages/ResetPassword.tsx`
4. `src/components/Onboarding.tsx`
5. `src/components/processes/ProcessView.tsx`
6. `src/components/processes/ProcessModal.tsx`

### Prioridade Média:
7. `src/pages/Subscribe.tsx`
8. `src/pages/Success.tsx`
9. `src/components/ExpenseManager.tsx`

### Prioridade Baixa (Páginas Estáticas):
10. `src/pages/LGPD.tsx`
11. `src/pages/PoliticaPrivacidade.tsx`
12. `src/pages/TermosUso.tsx`
13. `src/pages/SobreNos.tsx`

---

**Exemplo de Execução:**

*Input:*
```tsx
<button>Salvar Alterações</button>
```

*Output:*
```tsx
<button>{t('common.saveChanges')}</button>
```

*JSON:*
```json
"common": {
  "saveChanges": "Salvar Alterações"
}
```
