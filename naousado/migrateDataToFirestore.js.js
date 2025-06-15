// migrateDataToFirestore.js
const admin = require('firebase-admin');
const serviceAccount = require('./config').firebaseServiceAccountPath; // Pega o caminho do config.js
const dbData = require('./db.json'); // Seu arquivo db.json local

try {
    const serviceAccountKey = require(serviceAccount);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccountKey)
    });
    console.log('Firebase Admin SDK inicializado para migração.');
} catch (error) {
    console.error('Erro ao inicializar Firebase Admin SDK para migração:', error.message);
    process.exit(1);
}

const db = admin.firestore();

async function migrate() {
    console.log('Iniciando migração de dados...');

    // Exemplo para 'usuarios'
    if (dbData.usuarios && dbData.usuarios.length > 0) {
        console.log('Migrando usuários...');
        for (const usuario of dbData.usuarios) {
            try {
                await db.collection('usuarios').doc(usuario.id).set(usuario);
                console.log(`Usuário ${usuario.id} migrado.`);
            } catch (e) {
                console.error(`Erro ao migrar usuário ${usuario.id}:`, e.message);
            }
        }
    } else {
        console.log('Nenhum usuário para migrar ou coleção vazia.');
    }


    // Exemplo para 'bicicletas'
    if (dbData.bicicletas && dbData.bicicletas.length > 0) {
        console.log('Migrando bicicletas...');
        for (const bicicleta of dbData.bicicletas) {
            try {
                await db.collection('bicicletas').doc(bicicleta.id).set(bicicleta);
                console.log(`Bicicleta ${bicicleta.id} migrada.`);
            } catch (e) {
                console.error(`Erro ao migrar bicicleta ${bicicleta.id}:`, e.message);
            }
        }
    } else {
        console.log('Nenhuma bicicleta para migrar ou coleção vazia.');
    }


    // Exemplo para 'alugueis'
    if (dbData.alugueis && dbData.alugueis.length > 0) {
        console.log('Migrando aluguéis...');
        for (const aluguel of dbData.alugueis) {
            try {
                await db.collection('alugueis').doc(aluguel.id).set(aluguel);
                console.log(`Aluguel ${aluguel.id} migrado.`);
            } catch (e) {
                console.error(`Erro ao migrar aluguel ${aluguel.id}:`, e.message);
            }
        }
    } else {
        console.log('Nenhum aluguel para migrar ou coleção vazia.');
    }

    // Se você tiver uma coleção 'catracas' no seu db.json, adicione aqui também
    // Exemplo:
    if (dbData.catracas && dbData.catracas.length > 0) {
         console.log('Migrando catracas...');
         for (const catraca of dbData.catracas) {
             try {
                 await db.collection('catracas').doc(catraca.id).set(catraca);
                 console.log(`Catraca ${catraca.id} migrada.`);
             } catch (e) {
                 console.error(`Erro ao migrar catraca ${catraca.id}:`, e.message);
             }
         }
    } else {
        console.log('Nenhuma catraca para migrar ou coleção vazia.');
    }

    console.log('Migração concluída!');
}

migrate().catch(console.error);