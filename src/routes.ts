import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { validateUser } from './middleware/validateUser'; // Middleware de validação

const router = Router();
const prisma = new PrismaClient();

// Rota para criar um novo usuário com validação
//router.post('/users', validateUser, async (req, res) => {
 //   const { name, email, password } = req.body;
//
  //  try {
    //    const newUser = await prisma.user.create({
      //      data: {
        //        name,
        //        email,
         //       password,
        //    },
       // });
       // res.status(201).json(newUser);
    //} catch (error) {
      //  console.error(error);
        //res.status(500).json({ error: 'Erro ao criar usuário' });
    //}
//});

// Rota para autenticação via GitHub
router.post('/auth/github', async (req, res) => {
    const { uid, displayName, email, photoURL, createdAt, lastLoginAt } = req.body;

    try {
        // Verifica se o usuário já existe no banco de dados
        let user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // Cria um novo usuário se ele não existir
            user = await prisma.user.create({
                data: {
                    uid,
                    name: displayName,
                    email,
                    photoURL,
                    createdAt: new Date(createdAt), // Converte string para Date
                    lastLoginAt: new Date(lastLoginAt), // Converte string para Date
                },
            });
        } else {
            // Atualiza o último login do usuário existente
            user = await prisma.user.update({
                where: { email },
                data: {
                    lastLoginAt: new Date(lastLoginAt),
                },
            });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao autenticar usuário via GitHub' });
    }
});

// Rota para listar todos os usuários
router.get('/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany();
        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});

// Rota de exemplo existente
router.get('/Login', (req, res) => {
    res.status(200).json({ message: 'Rota de login funcionando!' });
});

export default router;