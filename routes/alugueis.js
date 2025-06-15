// routes/alugueis.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto'); // Para gerar IDs únicos para novos aluguéis

// Mude a exportação para aceitar 'db' como argumento
module.exports = (db) => { //

    // Função auxiliar para calcular o preço do aluguel
    function calcularPreco(tempoEmMinutos) { //
        if (tempoEmMinutos === 30) { //
            return 15; //
        } else if (tempoEmMinutos === 60) { //
            return 25; //
        } else if (tempoEmMinutos === 120) { //
            return 35; //
        } else {
            return null; // Tempo inválido
        }
    }

    // POST / - Cria um novo aluguel (Permitido para clientes)
    router.post('/', async (req, res) => {
        if (req.apiKeyRole !== 'client') { //
            return res.status(403).json({ message: 'Acesso negado. Apenas clientes podem iniciar aluguéis.' });
        }
        try {
            const { bicicleta_id, tempo_alugado_minutos, catraca_id_origem } = req.body; // Adicionado catraca_id_origem

            const preco = calcularPreco(tempo_alugado_minutos); //
            if (preco === null) { //
                return res.status(400).json({ message: 'Tempo de aluguel inválido. Opções: 30, 60, 120 minutos.' }); //
            }

            const bicicletaRef = db.collection('bicicletas').doc(bicicleta_id);
            const bicicletaDoc = await bicicletaRef.get();

            if (!bicicletaDoc.exists) {
                return res.status(404).json({ message: 'Bicicleta não encontrada.' });
            }

            const bicicleta = bicicletaDoc.data();
            if (bicicleta.status !== 'disponível') { //
                return res.status(400).json({ message: 'Bicicleta não está disponível para aluguel.' });
            }

            // --- NOVO: Lógica de Catraca na origem ---
            if (!catraca_id_origem) {
                return res.status(400).json({ message: 'ID da catraca de origem é necessário para iniciar o aluguel.' });
            }

            const catracaOrigemRef = db.collection('catracas').doc(catraca_id_origem);
            const catracaOrigemDoc = await catracaOrigemRef.get();

            if (!catracaOrigemDoc.exists) {
                return res.status(404).json({ message: 'Catraca de origem não encontrada.' });
            }

            const catracaOrigem = catracaOrigemDoc.data();
            if (catracaOrigem.status !== 'ocupada' || catracaOrigem.bicicleta_id_acoplada !== bicicleta_id) { //
                return res.status(400).json({ message: 'A bicicleta não está acoplada a esta catraca de origem ou a catraca não está ocupada corretamente.' }); //
            }
            // --- FIM NOVO ---

            const newRentalId = crypto.randomUUID(); // Gera um ID único para o aluguel
            const newAluguel = {
                id: newRentalId,
                bicicleta_id: bicicleta_id,
                tempo_alugado_minutos: tempo_alugado_minutos,
                preco: preco,
                data_inicio: new Date().toISOString(),
                data_fim: null,
                status: 'ativo', //
                catraca_id_origem: catraca_id_origem, // Armazena a catraca de onde saiu
                user_id: req.headers['authorization']?.split(' ')[1] // Assume que o token no header Authorization é o user_id (ajuste conforme sua autenticação)
            };

            // Usar uma transação para garantir atomicidade nas operações de DB
            await db.runTransaction(async (transaction) => {
                // 1. Criar o novo aluguel
                transaction.set(db.collection('alugueis').doc(newAluguel.id), newAluguel);

                // 2. Atualizar o status da bicicleta para 'alugada' e remover catraca_id
                transaction.update(bicicletaRef, {
                    status: 'alugada',
                    catraca_id: null,
                    turnstile_status: 'undocked' //
                });

                // 3. Atualizar o status da catraca de origem para 'livre' e remover bicicleta_id_acoplada
                transaction.update(catracaOrigemRef, {
                    status: 'livre', //
                    bicicleta_id_acoplada: null //
                });
            });

            res.status(201).json(newAluguel);

        } catch (error) {
            console.error('Erro ao criar aluguel:', error.message);
            res.status(500).json({ message: 'Erro interno ao criar aluguel.' });
        }
    });

    // PUT /:id/finalizar - Finaliza um aluguel (Permitido para clientes)
    router.put('/:id/finalizar', async (req, res) => {
        if (req.apiKeyRole !== 'client') { //
            return res.status(403).json({ message: 'Acesso negado. Apenas clientes podem finalizar aluguéis.' });
        }
        try {
            const { id } = req.params;
            const { catraca_id_retorno, quilometragem_carga_final } = req.body; //

            if (!catraca_id_retorno) {
                return res.status(400).json({ message: 'ID da catraca de retorno é necessário para finalizar o aluguel.' });
            }

            // Validações para a quilometragem final
            const validKilometragemCarga = [10, 15, 20];
            if (!quilometragem_carga_final || !validKilometragemCarga.includes(quilometragem_carga_final)) { //
                return res.status(400).json({ message: 'A quilometragem de carga final deve ser 10, 15 ou 20.' });
            }

            const aluguelRef = db.collection('alugueis').doc(id);
            const aluguelDoc = await aluguelRef.get();

            if (!aluguelDoc.exists) {
                return res.status(404).json({ message: 'Aluguel não encontrado.' });
            }

            const aluguel = aluguelDoc.data();
            if (aluguel.status !== 'ativo') { //
                return res.status(400).json({ message: 'Este aluguel não está ativo para ser finalizado.' });
            }

            const bicicletaRef = db.collection('bicicletas').doc(aluguel.bicicleta_id);
            const bicicletaDoc = await bicicletaRef.get();
            if (!bicicletaDoc.exists) {
                 return res.status(404).json({ message: 'Bicicleta associada ao aluguel não encontrada.' });
            }
            const bicicleta = bicicletaDoc.data();

            // --- NOVO: Lógica de Catraca no retorno ---
            const catracaRetornoRef = db.collection('catracas').doc(catraca_id_retorno);
            const catracaRetornoDoc = await catracaRetornoRef.get();

            if (!catracaRetornoDoc.exists) {
                return res.status(404).json({ message: 'Catraca de retorno não encontrada.' });
            }

            const catracaRetorno = catracaRetornoDoc.data();
            // A catraca de retorno deve estar livre e não ter uma bicicleta acoplada
            if (catracaRetorno.status !== 'livre' || catracaRetorno.bicicleta_id_acoplada !== null) { //
                return res.status(400).json({ message: 'Catraca de retorno não está disponível para acoplar a bicicleta.' }); //
            }
            // --- FIM NOVO ---

            const dataFim = new Date();
            const dataInicio = new Date(aluguel.data_inicio);
            const tempoDecorridoMinutos = Math.ceil((dataFim - dataInicio) / (1000 * 60));

            const precoFinal = calcularPreco(tempoDecorridoMinutos); // Recalcula o preço final (ou usa a lógica de tarifas)

            const aluguelAtualizado = {
                ...aluguel,
                data_fim: dataFim.toISOString(), //
                status: 'finalizado', //
                tempo_alugado_minutos: tempoDecorridoMinutos,
                preco: precoFinal
            };

            await db.runTransaction(async (transaction) => {
                // 1. Atualizar o aluguel
                transaction.update(aluguelRef, aluguelAtualizado);

                // 2. Atualiza o status da bicicleta para 'disponível', quilometragem e acopla à catraca de retorno
                transaction.update(bicicletaRef, {
                    status: 'disponível', //
                    quilometragem_carga: quilometragem_carga_final, //
                    catraca_id: catraca_id_retorno, // Agora a bicicleta está acoplada a esta catraca
                    turnstile_status: 'docked' //
                });

                // 3. Atualiza o status da catraca de retorno para 'ocupada' e associa a bicicleta
                transaction.update(catracaRetornoRef, {
                    status: 'ocupada', //
                    bicicleta_id_acoplada: aluguel.bicicleta_id //
                });
            });

            res.status(200).json(aluguelAtualizado); //

        } catch (error) {
            console.error('Erro ao finalizar aluguel:', error.message);
            res.status(500).json({ message: 'Erro interno ao finalizar aluguel.' });
        }
    });

    // GET / - Lista todos os aluguéis (desenvolvedores podem ver todos, clientes só os seus)
    router.get('/', async (req, res) => {
        const apiKeyRole = req.apiKeyRole;
        const { status } = req.query; //
        let rentalsRef = db.collection('alugueis');
        let query = rentalsRef;

        try {
            if (status) { //
                query = query.where('status', '==', status);
            }

            if (apiKeyRole === 'developer') { //
                // Desenvolvedores veem todos os aluguéis
                const snapshot = await query.get();
                const alugueis = snapshot.docs.map(doc => doc.data());
                res.json(alugueis);
            } else if (apiKeyRole === 'client') { //
                // Clientes veem apenas seus próprios aluguéis
                const authorizationHeader = req.headers['authorization'];
                const userToken = authorizationHeader?.split(' ')[1];

                if (!userToken) {
                    return res.status(401).json({ message: 'Token de utilizador necessário.' });
                }

                // Primeiro, encontre o usuário pelo token para obter seu ID
                const userSnapshot = await db.collection('usuarios').where('token', '==', userToken).get();
                if (userSnapshot.empty) {
                    return res.status(403).json({ message: 'Token de utilizador inválido.' });
                }
                const userId = userSnapshot.docs[0].data().id;

                query = query.where('user_id', '==', userId); //
                const snapshot = await query.get();
                const alugueis = snapshot.docs.map(doc => doc.data());
                res.json(alugueis);
            } else {
                res.status(403).json({ message: 'Acesso negado. API Key não autorizada.' });
            }
        } catch (error) {
            console.error('Erro ao buscar aluguéis:', error.message);
            res.status(500).json({ message: 'Erro interno ao buscar aluguéis.' });
        }
    });

    // GET /:id - Retorna detalhes de um aluguel específico
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
        const apiKeyRole = req.apiKeyRole;

        try {
            const aluguelRef = db.collection('alugueis').doc(id);
            const aluguelDoc = await aluguelRef.get();

            if (!aluguelDoc.exists) {
                return res.status(404).json({ message: 'Aluguel não encontrado.' });
            }

            const aluguel = aluguelDoc.data();

            if (apiKeyRole === 'developer') { //
                res.status(200).json(aluguel);
            } else if (apiKeyRole === 'client') { //
                const authorizationHeader = req.headers['authorization'];
                const userToken = authorizationHeader?.split(' ')[1];

                if (!userToken) {
                    return res.status(401).json({ message: 'Token de utilizador necessário.' });
                }

                const userSnapshot = await db.collection('usuarios').where('token', '==', userToken).get();
                if (userSnapshot.empty) {
                    return res.status(403).json({ message: 'Token de utilizador inválido.' });
                }
                const userId = userSnapshot.docs[0].data().id;

                if (aluguel.user_id === userId) { //
                    res.status(200).json(aluguel);
                } else {
                    return res.status(403).json({ message: 'Acesso negado. Não pode aceder a aluguéis de outros utilizadores.' });
                }
            } else {
                res.status(403).json({ message: 'Acesso negado. API Key não autorizada.' });
            }
        } catch (error) {
            console.error('Erro ao obter detalhes do aluguel:', error.message);
            res.status(500).json({ message: 'Erro interno ao obter detalhes do aluguel.' });
        }
    });

    return router;
};