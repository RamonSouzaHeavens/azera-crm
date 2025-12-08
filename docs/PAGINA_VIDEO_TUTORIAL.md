# 📹 Como Usar a Página de Vídeo

## 📋 Estrutura

```
public/
├── videos/
│   ├── index.html          ← Página do tutorial
│   └── tutorial.mp4        ← Seu vídeo aqui
└── _headers
```

## 🚀 Passo 1: Colocar seu vídeo

1. **Localize seu arquivo MP4**
2. **Copie para:** `public/videos/tutorial.mp4`

### Tamanho de arquivo
- Recomendado: até 500MB
- Se maior: comprimir ou usar outro servidor

## 🎬 Passo 2: Build e Deploy

```bash
# Build do projeto
npm run build

# Testar localmente
npm run preview

# Acessar a página
# Local: http://localhost:4173/videos/
# Deploy: https://seu-dominio.com/videos/
```

## 📱 Características da Página

✅ **Design Responsivo**
- Funciona em desktop, tablet e mobile
- Vídeo se adapta ao tamanho da tela
- Proporção 16:9 mantida

✅ **Tema Claro/Escuro**
- Detecta preferência do sistema
- Salva escolha no localStorage
- Suporta troca dinâmica

✅ **Otimizações**
- Lazy loading do vídeo
- CSS minificado e otimizado
- Performance em conexões lentas

✅ **Funcionalidades**
- Player de vídeo nativo com controles
- Tela cheia
- Reprodução automática compatível
- Legenda pronta para adicionar

## 🎨 Personalizar

### Mudar cores (Gradiente)

Procure por `from-blue-500 to-purple-500` e altere:
- `from-green-500 to-emerald-500` - Verde
- `from-red-500 to-pink-500` - Vermelho
- `from-yellow-500 to-orange-500` - Laranja

### Mudar título e descrição

```html
<!-- Linha ~94 -->
<h1 class="text-4xl md:text-5xl font-bold mb-4">
  <span class="gradient-text">Tutorial Completo</span>
  <br>
  <span class="text-slate-900 dark:text-white">Azera CRM</span>
</h1>

<!-- Linha ~99 -->
<p class="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8">
  Aprenda como utilizar todas as funcionalidades do nosso sistema.
</p>
```

### Mudar funcionalidades na seção "O que você vai aprender"

```html
<!-- Linha ~165-190 -->
<div class="feature-card">
  <div class="text-2xl mb-3">SEU EMOJI</div>
  <h3>Seu Título</h3>
  <p>Sua descrição aqui</p>
</div>
```

### Mudar perguntas do FAQ

```html
<!-- Linha ~215-230 -->
<details class="glass-effect p-6 rounded-xl cursor-pointer group">
  <summary class="flex items-center justify-between font-semibold">
    <span>Sua pergunta aqui?</span>
    <span class="text-xl group-open:rotate-180 transition-transform">▼</span>
  </summary>
  <p class="mt-4 text-slate-600 dark:text-slate-400">
    Sua resposta aqui.
  </p>
</details>
```

## 🔗 Links úteis no CRM

Para adicionar um link na página do CRM que leva ao tutorial:

```tsx
// Em qualquer página/componente
<a href="/videos/" target="_blank" class="...">
  🎥 Assistir Tutorial
</a>
```

## 📊 Analytics (Opcional)

Adicione no `<head>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_ID');
</script>
```

## 🚨 Troubleshooting

### Vídeo não carrega
- Verifique se `tutorial.mp4` está em `public/videos/`
- Confirme permissões do arquivo
- Teste caminho relativo: `./tutorial.mp4`

### Página 404
- Rode `npm run build`
- Deploy pode estar cacheado (limpar cache)

### Tema escuro não funciona
- Limpe cookies do site
- Abra em navegação privada
- Verifique se `dark:` classes estão no Tailwind

### Vídeo muito pesado
- Comprima com HandBrake (grátis)
- Ou divida em partes
- Considere usar HLS/DASH streaming

## 📈 Versões Futuras

Para adicionar depois:
- [ ] Múltiplos vídeos/capítulos
- [ ] Legendas/Subtítulos
- [ ] Download do vídeo
- [ ] Comentários
- [ ] Quiz/Avaliação
- [ ] Certificado

---

**✅ Pronto! Sua página está funcionando!** 🎉

Acesse: `https://seu-dominio.com/videos/`