# API de E-commerce de Bicicletas

Esta é uma API RESTful para um e-commerce de bicicletas, permitindo gerenciamento de usuários, bicicletas, aluguéis e catracas.

## Tecnologias Utilizadas

* Node.js
* Express.js
* Firebase Cloud Firestore (como banco de dados)

## Como Configurar e Rodar o Projeto Localmente

Para rodar este projeto, você precisará configurar seu próprio projeto no Firebase e obter as credenciais necessárias, pois as chaves de acesso ao banco de dados **não são incluídas no repositório por questões de segurança**.

### 1. Pré-requisitos

* Node.js (versão 18+) e npm (ou yarn) instalados.
* Conta Google para acessar o Firebase Console.
* Git instalado.

### 2. Configuração do Projeto Firebase

1.  **Crie um Projeto Firebase:**
    * Acesse o [Firebase Console](https://console.firebase.google.com/).
    * Clique em "Add project" (Adicionar projeto) e siga as instruções para criar um novo projeto (ex: `nome-do-seu-projeto-api`).

2.  **Habilite o Cloud Firestore:**
    * No menu lateral esquerdo do Firebase Console, em "Build", clique em **"Firestore Database"**.
    * Clique em **"Create database"**.
    * Selecione **"Start in production mode"**. (Você configurará as regras de segurança posteriormente).
    * Escolha a localização do seu banco de dados (ex: `southamerica-east1` para São Paulo).

3.  **Gere a Chave da Conta de Serviço (Service Account Key):**
    * No Firebase Console, vá em "Project settings" (ícone de engrenagem ao lado de "Project overview").
    * Vá para a aba **"Service accounts"**.
    * Clique em **"Generate new private key"** e faça o download do arquivo JSON.
    * **Renomeie este arquivo** para `firebase-service-account.json` (ou outro nome curto e descritivo).
    * **Mova este arquivo para a raiz da pasta do projeto** que você clonou (onde está `index.js`, `config.js`, etc.).

4.  **Configure as Regras de Segurança do Firestore (Importante para Testes):**
    * No Firebase Console, no Firestore Database, vá para a aba **"Rules"**.
    * Para fins de teste local com esta API, você pode usar uma regra temporária que permite acesso via Admin SDK:
        ```firestore
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            // Permitir leitura e escrita apenas através do Firebase Admin SDK (seu backend)
            // Nenhum acesso direto via cliente sem autenticação/autorização específica.
            match /{document=**} {
              allow read, write: if false; // Seu backend com Admin SDK ignora isso, clientes diretos não.
            }
          }
        }
        ```
    * Clique em "Publish".

### 3. Configuração do Código Local

1.  **Clone o Repositório:**
    ```bash
    git clone [https://github.com/GabrielFERNADS/API.EBikes.git](https://github.com/GabrielFERNADS/API.EBikes.git)
    cd API.EBikes
    ```
2.  **Instale as Dependências:**
    ```bash
    npm install
    ```
3.  **Atualize `config.js`:**
    * Abra o arquivo `config.js`.
    * Certifique-se de que o caminho `firebaseServiceAccountPath` está apontando para o arquivo JSON da chave de serviço que você baixou na etapa 2.3:
        ```javascript
        // config.js
        module.exports = {
            // ... (suas chaves de API existentes)
            firebaseServiceAccountPath: './firebase-service-account.json' // CONFIRA ESTE CAMINHO!
        };
        ```
        (ou o nome que você deu ao arquivo).

### 4. Populando o Banco de Dados (Dados Iniciais)

Para que você tenha dados para testar, você pode fazer o seguinte:

* **Opção 1 (Recomendado - Dados que já estão no Git):**
    * O arquivo `db.json` está no repositório. Você pode usar um script para migrar esses dados para o Firestore ( há outro arquivo na pasta "Não usados" para justamente fazer essa migração).
    * Execute o script de migração (que você já tem):
        ```bash
        node migrateDataToFirestore.js
        ```
    * Este script lerá os dados de `db.json` e os inserirá no Firebase Firestore configurado no passo 2.

* **Opção 2 (Manual - Menos ideal para dados grandes):**
    * O voce pode adicionar alguns documentos de teste manualmente através do Firebase Console para as coleções `usuarios`, `bicicletas`, `alugueis`, `catracas`.

### 5. Rodando a API

1.  **Inicie o Servidor Express:**
    ```bash
    npm start
    ```
    (ou `npm run start-express`)

2.  A API estará rodando em `http://localhost:3001`. Você pode usar ferramentas como Postman ou Insomnia para testar os endpoints.

---

### 🔑 API Keys e Acesso

Esta API utiliza **API Keys** para controle de acesso e diferenciação de permissões entre usuários:

* **`x-api-key` no Header:** Todas as requisições para a API devem incluir um header `x-api-key` contendo a chave de acesso.

Existem dois tipos de chaves de API:

1.  **`DEVELOPER_API_KEY` (Chave de Desenvolvedor):**
    * **Valor Padrão (para desenvolvimento):** `dev-secret-bike-key-12345`
    * **Permissões:** Acesso total a todos os endpoints, incluindo operações de criação, atualização e exclusão de bicicletas, e visualização de todos os aluguéis. Não possui limite de requisições (rate limiting).
    * **Uso:** Destinada a administradores ou ferramentas de desenvolvimento.

2.  **`CLIENT_API_KEY` (Chave de Cliente):**
    * **Valor Padrão (para desenvolvimento):** `client-public-bike-key-abcde`
    * **Permissões:** Acesso limitado a endpoints específicos, como listagem de bicicletas (sem criação/atualização/exclusão), registro e login de usuários, e gerenciamento dos próprios aluguéis. Está sujeita a um limite de 100 requisições a cada 15 minutos.
    * **Uso:** Destinada a aplicações clientes (front-ends, apps móveis) que interagem com a API em nome de usuários comuns.

---

### 🚀 Endpoints da API

A API oferece os seguintes endpoints para gerenciamento de recursos:

#### **Usuários (`/usuarios`)**

* `POST /usuarios`
    * **Descrição:** Registra um novo usuário.
    * **Permissão:** Ambas as API Keys (Developer/Client).
    * **Corpo da Requisição:** `{ username, password, name?, email?, phone?, address?, img?, kms?, emissao? }`
* `POST /usuarios/login`
    * **Descrição:** Autentica um usuário existente e retorna um token de sessão.
    * **Permissão:** Ambas as API Keys (Developer/Client).
    * **Corpo da Requisição:** `{ username, password }`
* `GET /usuarios/:id`
    * **Descrição:** Retorna o perfil de um usuário específico.
    * **Permissão:**
        * **Developer Key:** Acesso a qualquer perfil.
        * **Client Key:** Acesso apenas ao próprio perfil (o `id` na URL deve corresponder ao `user_id` associado ao token do header `Authorization: Bearer <user_token>`).

#### **Bicicletas (`/bicicletas`)**

* `GET /bicicletas`
    * **Descrição:** Lista todas as bicicletas. Pode ser filtrada por `status` (`?status=disponível`) ou `baia` (`?baia=Estação Centro Histórico`).
    * **Permissão:** Ambas as API Keys (Developer/Client).
* `GET /bicicletas/:id`
    * **Descrição:** Retorna os detalhes de uma bicicleta específica.
    * **Permissão:** Ambas as API Keys (Developer/Client).
* `POST /bicicletas`
    * **Descrição:** Adiciona uma nova bicicleta.
    * **Permissão:** Apenas **Developer Key**.
    * **Corpo da Requisição:** `{ quilometragem_carga (10|15|20), baia, img?, turnstile_status? (docked|undocked|unavailable_dock) }`
* `PUT /bicicletas/:id`
    * **Descrição:** Atualiza os dados de uma bicicleta existente.
    * **Permissão:** Apenas **Developer Key**.
    * **Corpo da Requisição:** `{ status?, quilometragem_carga?, baia?, img?, turnstile_status? }`
* `DELETE /bicicletas/:id`
    * **Descrição:** Remove uma bicicleta. Não é possível remover bicicletas `alugada`.
    * **Permissão:** Apenas **Developer Key**.

#### **Aluguéis (`/alugueis`)** ( Não Está Funcionando !!!!)

* `POST /alugueis`
    * **Descrição:** Cria um novo aluguel de bicicleta.
    * **Permissão:** Apenas **Client Key**. Requer `Authorization: Bearer <user_token>` e `x-api-key: client-public-bike-key-abcde`.
    * **Corpo da Requisição:** `{ bicicleta_id, tempo_alugado_minutos (30|60|120), catraca_id_origem }`
* `PUT /alugueis/:id/finalizar`
    * **Descrição:** Finaliza um aluguel de bicicleta.
    * **Permissão:** Apenas **Client Key**. Requer `Authorization: Bearer <user_token>` e `x-api-key: client-public-bike-key-abcde`.
    * **Corpo da Requisição:** `{ catraca_id_retorno, quilometragem_carga_final (10|15|20) }`
* `GET /alugueis`
    * **Descrição:** Lista todos os aluguéis. Pode ser filtrada por `status` (`?status=ativo`).
    * **Permissão:**
        * **Developer Key:** Acesso a todos os aluguéis.
        * **Client Key:** Acesso apenas aos próprios aluguéis (o `user_id` é inferido do token `Authorization: Bearer <user_token>`).
* `GET /alugueis/:id`
    * **Descrição:** Retorna os detalhes de um aluguel específico.
    * **Permissão:**
        * **Developer Key:** Acesso a qualquer aluguel.
        * **Client Key:** Acesso apenas aos próprios aluguéis (o `id` na URL deve corresponder a um aluguel do `user_id` associado ao token).

