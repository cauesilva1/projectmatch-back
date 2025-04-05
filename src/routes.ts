import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateGitHubUser } from './services/authservice';

const router = Router();
const prisma = new PrismaClient();

// Rota para autenticação via GitHub
router.post('/auth/github', async (req: Request, res: Response): Promise<void> => {
    const { token } = req.body; // Recebe apenas o token do front-end

    if (!token) {
        res.status(400).json({ error: 'Token não fornecido.' });
        return;
    }
        console.log('Token recebido:', token); // Log do token recebido
    try {
        // Chama o serviço para autenticar o usuário com o token
        const user = await authenticateGitHubUser(token);
        res.status(200).json(user);
    } catch (error) {
        if (error instanceof Error) {
            console.error('Erro ao autenticar usuário via GitHub:', error.message);
        } else {
            console.error('Erro ao autenticar usuário via GitHub:', error);
        }
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erro desconhecido' });
    }
});

// Rota para listar todos os usuários
router.get('/users', async (req: Request, res: Response): Promise<void> => {
    try {
        const users = await prisma.user.findMany();
        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});

// Rota de exemplo existente
router.get('/Login', (req: Request, res: Response): void => {
    res.status(200).json({ message: 'Rota de login funcionando!' });
});

export default router;