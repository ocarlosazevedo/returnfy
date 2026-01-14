# Returnfy

Sistema de formulário de devolução com fricção máxima para e-commerce multi-loja com integração Shopify.

## 🎯 Objetivo

Criar um processo de devolução burocrático e extenso que:
- Reduz a % de conclusão de pedidos de devolução frívolos
- Mantém legitimidade para clientes com problemas reais
- Centraliza todas as lojas Shopify em um único domínio
- Permite gestão manual de estornos/reenvios

## 🏗 Stack

- **Frontend**: Vanilla JS + CSS
- **Backend**: Vercel Serverless Functions
- **Database**: Supabase (PostgreSQL)
- **Storage**: Vercel Blob (para uploads de imagens)
- **Integração**: Shopify Admin API

## 📁 Estrutura

```
/returnfy
├── api/
│   ├── stores/index.js      # CRUD de lojas
│   ├── orders/search.js     # Busca pedidos por email
│   ├── returns/index.js     # CRUD de devoluções
│   ├── returns/[id]/action.js  # Ações admin
│   └── upload.js            # Upload de imagens
├── lib/
│   ├── supabase.js          # Cliente Supabase
│   └── shopify.js           # Helper Shopify API
├── public/
│   ├── index.html           # Formulário cliente
│   ├── admin.html           # Dashboard admin
│   ├── css/styles.css
│   └── js/
│       ├── app.js           # Lógica do form
│       └── admin.js         # Lógica do admin
├── schema.sql               # Schema do banco
├── package.json
├── vercel.json
└── README.md
```

## 🚀 Deploy

### 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Vá em **SQL Editor** e execute o conteúdo de `schema.sql`
3. Copie as credenciais:
   - Project URL (Settings → API → Project URL)
   - Service Role Key (Settings → API → service_role key)

### 2. Configurar Vercel Blob

1. No dashboard da Vercel, vá em **Storage**
2. Crie um novo **Blob Store**
3. O token será configurado automaticamente

### 3. Deploy na Vercel

```bash
# Clone o projeto
git clone <repo-url>
cd returnfy

# Instale dependências
npm install

# Configure variáveis de ambiente na Vercel
# SUPABASE_URL=https://xxx.supabase.co
# SUPABASE_SERVICE_KEY=eyJxxx
# ADMIN_PASSWORD=sua-senha-admin-forte

# Deploy
vercel --prod
```

### 4. Configurar domínio

1. Na Vercel, vá em **Settings → Domains**
2. Adicione seu domínio: `returnfy.seudominio.com`
3. Configure DNS conforme instruções

## 🔧 Configuração de Lojas Shopify

Para cada loja que você quiser conectar:

### Criar App Privado no Shopify

1. Acesse **Shopify Admin → Settings → Apps and sales channels**
2. Clique em **Develop apps**
3. Crie um novo app
4. Em **Configuration**, ative os scopes:
   - `read_orders`
   - `read_customers`
5. Instale o app e copie o **Admin API access token**

### Adicionar Loja no Returnfy

1. Acesse `seudominio.com/admin`
2. Faça login com a senha admin
3. Vá em **Stores → Add Store**
4. Preencha:
   - Nome da loja
   - Domínio Shopify (ex: `minhaloja.myshopify.com`)
   - Access Token

## 📝 Fluxo do Cliente

1. Cliente acessa `returnfy.seudominio.com`
2. Digita email da compra
3. Sistema busca pedidos em TODAS as lojas conectadas
4. Cliente seleciona o pedido
5. Preenche formulário de 8 etapas:
   - Verificação de identidade
   - Confirmação do pedido
   - Motivo da devolução
   - Detalhes do problema
   - Evidências fotográficas (5 fotos obrigatórias)
   - Informações de envio
   - Preferência de resolução
   - Termos e assinatura digital
6. Aguarda análise

## 🎛 Painel Admin

- **Dashboard**: Visão geral de solicitações
- **Filtros**: Por status, por loja
- **Ações**: Aprovar estorno, aprovar reenvio, negar
- **Notas**: Campo para observações internas

## 🔒 Segurança

- Tokens Shopify armazenados de forma segura no Supabase
- Admin protegido por senha
- Validação de email antes de mostrar pedidos
- Uploads limitados a 5MB por imagem

## 🌍 Multi-idioma

O sistema detecta automaticamente o idioma do navegador e suporta:
- 🇺🇸 English
- 🇧🇷 Português
- 🇪🇸 Español
- 🇮🇹 Italiano

## 📊 Métricas de Fricção

O sistema rastreia:
- Tempo total de preenchimento
- Taxa de abandono por etapa
- Distribuição de motivos de devolução

## 🐛 Troubleshooting

**Erro ao buscar pedidos:**
- Verifique se o token Shopify está correto
- Confirme que o app tem permissão `read_orders`

**Upload falha:**
- Verifique se o Vercel Blob está configurado
- Imagens devem ser < 5MB

**Admin não carrega:**
- Confirme a variável `ADMIN_PASSWORD` na Vercel
- Limpe o localStorage do navegador

## 📄 License

Private - All rights reserved
