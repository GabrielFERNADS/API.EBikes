// routes/bicicletas.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto'); // Para gerar IDs únicos para novas bicicletas

// Mude a exportação para aceitar 'db' como argumento
module.exports = (db) => { //

    const validKilometragemCarga = [10, 15, 20];
    const validBaias = ["Estação Centro Histórico", "Estação Orla do Guaíba", "Estação Bairro Menino-Deus", "Estação do Gasômetro"];
    const validTurnstileStatuses = ["docked", "undocked", "unavailable_dock"];

    // GET / - Lista todas as bicicletas (opcionalmente filtradas por status ou baia)
    router.get('/', async (req, res) => {
        try {
            const { status, baia } = req.query;
            let bicyclesRef = db.collection('bicicletas');
            let query = bicyclesRef;

            if (status) { //
                query = query.where('status', '==', status);
            }
            if (baia) { //
                query = query.where('baia', '==', baia);
            }

            const snapshot = await query.get();
            const bicicletas = snapshot.docs.map(doc => doc.data());
            res.json(bicicletas);

        } catch (error) {
            console.error('Erro ao buscar bicicletas:', error.message); //
            res.status(500).json({ message: 'Erro ao buscar bicicletas.' }); //
        }
    });

    // GET /:id - Retorna detalhes de uma bicicleta específica
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const bicicletaDoc = await db.collection('bicicletas').doc(id).get();

            if (!bicicletaDoc.exists) {
                return res.status(404).json({ message: 'Bicicleta não encontrada.' });
            }

            res.json(bicicletaDoc.data());

        } catch (error) {
            console.error('Erro ao buscar bicicleta:', error.message);
            res.status(500).json({ message: 'Erro ao buscar bicicleta.' });
        }
    });

    // POST / - Adiciona uma nova bicicleta (APENAS DESENVOLVEDOR)
    router.post('/', async (req, res) => {
        if (req.apiKeyRole !== 'developer') { //
            return res.status(403).json({ message: 'Acesso negado. Apenas desenvolvedores podem adicionar bicicletas.' });
        }

        try {
            const { quilometragem_carga, baia, img, turnstile_status } = req.body;

            // Validação de entrada
            if (!quilometragem_carga || !validKilometragemCarga.includes(quilometragem_carga)) { //
                return res.status(400).json({ message: 'A quilometragem de carga deve ser 10, 15 ou 20.' });
            }
            if (!baia || !validBaias.includes(baia)) { //
                return res.status(400).json({ message: 'Baia inválida ou não fornecida.' });
            }
            if (turnstile_status && !validTurnstileStatuses.includes(turnstile_status)) { //
                return res.status(400).json({ message: `Status de catraca inválido. Opções: ${validTurnstileStatuses.join(', ')}.` });
            }

            const newBicycleId = crypto.randomUUID(); // Gera um ID único para a nova bicicleta
            const newBicycle = {
                id: newBicycleId,
                modelo: "elétrica", //
                quilometragem_carga: quilometragem_carga,
                status: "disponível", //
                baia: baia,
                img: img || `https://placehold.co/150x150/000000/FFFFFF?text=Bike-${newBicycleId.substring(0,4)}`, //
                turnstile_status: turnstile_status || "docked" //
            };

            await db.collection('bicicletas').doc(newBicycleId).set(newBicycle);
            res.status(201).json(newBicycle);

        } catch (error) {
            console.error('Erro ao adicionar bicicleta:', error.message); //
            res.status(500).json({ message: 'Erro ao adicionar bicicleta.' }); //
        }
    });

    // PUT /:id - Atualiza uma bicicleta existente (APENAS DESENVOLVEDOR)
    router.put('/:id', async (req, res) => {
        if (req.apiKeyRole !== 'developer') { //
            return res.status(403).json({ message: 'Acesso negado. Apenas desenvolvedores podem atualizar bicicletas.' });
        }

        try {
            const { id } = req.params;
            const { status, quilometragem_carga, baia, img, turnstile_status } = req.body; //

            const bicicletaDoc = await db.collection('bicicletas').doc(id).get();
            if (!bicicletaDoc.exists) {
                return res.status(404).json({ message: 'Bicicleta não encontrada.' });
            }

            const dadosAtualizados = {};
            if (status !== undefined) {
                const validStatuses = ['disponível', 'alugada', 'indisponível'];
                if (!validStatuses.includes(status)) {
                    return res.status(400).json({ message: `Status inválido. Opções: ${validStatuses.join(', ')}.` });
                }
                dadosAtualizados.status = status;
            }
            if (quilometragem_carga !== undefined) {
                if (!validKilometragemCarga.includes(quilometragem_carga)) { //
                    return res.status(400).json({ message: 'A quilometragem de carga deve ser 10, 15 ou 20.' });
                }
                dadosAtualizados.quilometragem_carga = quilometragem_carga;
            }
            if (baia !== undefined) {
                if (!validBaias.includes(baia)) { //
                    return res.status(400).json({ message: 'Baia inválida ou não fornecida.' });
                }
                dadosAtualizados.baia = baia;
            }
            if (img !== undefined) { //
                dadosAtualizados.img = img;
            }
            if (turnstile_status !== undefined) { //
                if (!validTurnstileStatuses.includes(turnstile_status)) { //
                    return res.status(400).json({ message: `Status de catraca inválido. Opções: ${validTurnstileStatuses.join(', ')}.` });
                }
                dadosAtualizados.turnstile_status = turnstile_status;
            }


            if (Object.keys(dadosAtualizados).length === 0) {
                return res.status(400).json({ message: 'Nenhum dado válido para atualização fornecido.' });
            }

            await db.collection('bicicletas').doc(id).update(dadosAtualizados);
            const updatedBicicletaDoc = await db.collection('bicicletas').doc(id).get(); // Pega o documento atualizado
            res.json(updatedBicicletaDoc.data());

        } catch (error) {
            console.error('Erro ao atualizar bicicleta:', error.message); //
            res.status(500).json({ message: 'Erro ao atualizar bicicleta.' }); //
        }
    });

    // DELETE /:id - Remove uma bicicleta (APENAS DESENVOLVEDOR)
    router.delete('/:id', async (req, res) => {
        if (req.apiKeyRole !== 'developer') { //
            return res.status(403).json({ message: 'Acesso negado. Apenas desenvolvedores podem remover bicicletas.' });
        }

        try {
            const { id } = req.params;
            const bicicletaDoc = await db.collection('bicicletas').doc(id).get();

            if (!bicicletaDoc.exists) {
                return res.status(404).json({ message: 'Bicicleta não encontrada.' });
            }

            const bicicleta = bicicletaDoc.data();
            if (bicicleta.status === 'alugada') { //
                return res.status(400).json({ message: 'Não é possível remover uma bicicleta que está alugada.' }); //
            }

            await db.collection('bicicletas').doc(id).delete();
            res.status(200).json({ message: 'Bicicleta removida com sucesso.' }); //

        } catch (error) {
            console.error('Erro ao remover bicicleta:', error.message); //
            res.status(500).json({ message: 'Erro ao remover bicicleta.' }); //
        }
    });

    return router;
};