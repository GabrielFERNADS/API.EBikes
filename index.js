// index.js
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const admin = require('firebase-admin'); // Importa o Firebase Admin SDK

const config = require('./config'); // Importa suas chaves API e config Firebase

// Inicializa o Firebase Admin SDK
try {
    const serviceAccount = require(config.firebaseServiceAccountPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin SDK inicializado com sucesso.');
} catch (error) {
    console.error('Erro ao inicializar Firebase Admin SDK:', error.message);
    process.exit(1); // Encerra o processo se a inicialização falhar
}

// Obtenha uma referência ao Firestore Database
const db = admin.firestore();

// Importa os módulos de rota e passa a instância do db
const bicicletasRoutes = require('./routes/bicicletas')(db);
const alugueisRoutes = require('./routes/alugueis')(db);
const usuariosRoutes = require('./routes/usuarios')(db);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json()); // Middleware para parsear JSON no corpo das requisições

// --- MIDDLEWARE DE VALIDAÇÃO DE API KEY ---
app.use((req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ message: 'API Key é necessária.' });
    }

    if (apiKey === config.DEVELOPER_API_KEY) {
        req.apiKeyRole = 'developer';
        next();
    } else if (apiKey === config.CLIENT_API_KEY) {
        req.apiKeyRole = 'client';
        next();
    } else {
        return res.status(403).json({ message: 'API Key inválida.' });
    }
});

// --- MIDDLEWARE DE RATE LIMITING ---
const clientRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Limite de 100 requisições por IP/chave em 15 minutos
    message: 'Muitas requisições com esta API Key, tente novamente mais tarde.',
    keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
});

app.use((req, res, next) => {
    if (req.apiKeyRole === 'client') {
        clientRateLimiter(req, res, next);
    } else {
        next(); // Desenvolvedor não têm limite de requisições
    }
});

// --- MONTAR AS ROTAS ---
app.use('/bicicletas', bicicletasRoutes);
app.use('/alugueis', alugueisRoutes);
app.use('/usuarios', usuariosRoutes);
// Será necessário criar uma rota para catracas também, mas não foi fornecida ainda.
// app.use('/catracas', catracasRoutes); // Exemplo, se você criar um arquivo catracas.js

// Iniciar o servidor Express
app.listen(PORT, () => {
  console.log(`Servidor Express rodando em http://localhost:${PORT}`);
  // A linha abaixo não é mais necessária, pois json-server foi removido.
  // console.log(`Certifique-se de que o Json-server está rodando em http://localhost:3000`);
});