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
