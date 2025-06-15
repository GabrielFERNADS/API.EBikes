// routes/usuarios.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto'); // Para gerar tokens mais robustos

// Mude a exportação para aceitar 'db' como argumento
module.exports = (db) => { //

    // Função auxiliar para gerar um ID ou Token simples e único
    function generateUniqueId() {
        return crypto.randomUUID(); // Gera um UUID v4 (Universally Unique Identifier)
    }

    // POST /usuarios - Registrar novo utilizador
    router.post('/', async (req, res) => {
        const {
            username,
            password,
            name,
            email,
            phone,
            address,
            img,
            kms,
            emissao
        } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Nome de utilizador e senha são obrigatórios.' });
        }

        try {
            // Verificar se o nome de utilizador já existe
            const usersRef = db.collection('usuarios');
            const existingUserSnapshot = await usersRef.where('username', '==', username).get();

            if (!existingUserSnapshot.empty) {
                return res.status(409).json({ message: 'Nome de utilizador já existe.' });
            }

            const newUserId = generateUniqueId(); // Gera um ID único para o usuário
            const newUser = {
                id: newUserId, // Usamos o ID gerado para o documento também
                username: username,
                password: password, // ATENÇÃO: HASH A SENHA EM PRODUÇÃO!
                token: generateUniqueId(),
                name: name || '',
                email: email || '',
                phone: phone || '',
                address: address || '',
                img: img || '',
                kms: kms || 0,
                emissao: emissao || 0
            };

            // Adiciona o documento ao Firestore com o ID gerado
            await usersRef.doc(newUserId).set(newUser);

            // Retorna o utilizador sem a senha e o token para segurança
            const { password: _, token: __, ...userWithoutSensitiveData } = newUser;
            res.status(201).json({ message: 'Utilizador registado com sucesso.', user: userWithoutSensitiveData });

        } catch (error) {
            console.error('Erro ao registar utilizador:', error.message);
            res.status(500).json({ message: 'Erro interno ao registar utilizador.' });
        }
    });

    // POST /usuarios/login - Autenticar utilizador
    router.post('/login', async (req, res) => {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Nome de utilizador e senha são obrigatórios.' });
        }

        try {
            const usersRef = db.collection('usuarios');
            const userSnapshot = await usersRef
                                    .where('username', '==', username)
                                    .where('password', '==', password) // ATENÇÃO: NÃO USAR EM PRODUÇÃO SEM HASH!
                                    .get();

            if (userSnapshot.empty) {
                return res.status(401).json({ message: 'Credenciais inválidas.' });
            }

            const user = userSnapshot.docs[0].data(); // Pega o primeiro (e único) resultado
            // Em um cenário real, você verificaria o hash da senha aqui.

            res.status(200).json({
                message: 'Login bem-sucedido.',
                token: user.token,
                user_id: user.id
            });

        } catch (error) {
            console.error('Erro ao fazer login:', error.message);
            res.status(500).json({ message: 'Erro interno ao fazer login.' });
        }
    });

    // GET /usuarios/:id - Obter perfil de utilizador
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
        const apiKeyRole = req.apiKeyRole;

        try {
            if (apiKeyRole === 'developer') { //
                const userDoc = await db.collection('usuarios').doc(id).get();

                if (!userDoc.exists) {
                    return res.status(404).json({ message: 'Utilizador não encontrado.' });
                }

                const user = userDoc.data();
                const { password: _, token: __, ...userWithoutSensitiveData } = user; //
                res.status(200).json(userWithoutSensitiveData);

            } else if (apiKeyRole === 'client') { //
                const authorizationHeader = req.headers['authorization'];
                const userToken = authorizationHeader?.split(' ')[1];

                if (!userToken) {
                    return res.status(401).json({ message: 'Token de utilizador necessário para aceder a este recurso.' });
                }

                const userByTokenSnapshot = await db.collection('usuarios').where('token', '==', userToken).get();
                if (userByTokenSnapshot.empty) {
                    return res.status(403).json({ message: 'Token de utilizador inválido ou não corresponde.' }); //
                }

                const userByToken = userByTokenSnapshot.docs[0].data();

                if (userByToken.id === id) { //
                    const { password: _, token: __, ...userWithoutSensitiveData } = userByToken; //
                    res.status(200).json(userWithoutSensitiveData);
                } else {
                    return res.status(403).json({ message: 'Acesso negado. Não pode aceder a perfis de outros utilizadores.' }); //
                }
            } else {
                res.status(403).json({ message: 'Acesso negado. API Key não autorizada.' }); //
            }
        } catch (error) {
            console.error('Erro ao obter perfil do utilizador:', error.message);
            res.status(500).json({ message: 'Erro interno ao obter perfil do utilizador.' });
        }
    });

    return router;
};