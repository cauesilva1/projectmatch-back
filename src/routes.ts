import { Router, Request, Response } from 'express';
import { prisma } from './prisma'; 
import { authenticateGitHubUser } from './services/authservice';
import { getRepositoryInfo } from './services/getRepositoryInfo'; // Função para buscar informações do repositório
import axios from 'axios';

const router = Router();

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
        console.log("aqui esta o user:",user)
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

// Rota para buscar informações de um projeto específico
router.get('/project/', async (req: Request, res: Response): Promise<void> => {
    
    const { id } = req.query; // Recebe o ID do projeto da URL

    console.log('ID do projeto recebido:', id); // Log do ID do projeto recebido

    try {
        // Busca o projeto com base no ID
        const project = await prisma.project.findUnique({
            where: { id: Number(id) }, // Converte o ID para um número
            include: {
                owner: true, // Inclui informações do proprietário
                participants: {
                    include: {
                        user: true, // Inclui informações dos usuários participantes
                    },
                },
            },
        });

        if (!project) {
            res.status(404).json({ message: 'Projeto não encontrado.' });
            return;
        }

        // Verifica se o projeto possui um link do GitHub
        if (!project.githubLink) {
            res.status(400).json({ error: 'O projeto não possui um link do GitHub.' });
            return;
        }

        // Busca informações do repositório e issues
        const repoInfo = await getRepositoryInfo(project.githubLink);
        const issuesResponse = await axios.get(`${repoInfo.url}/issues`, {
            headers: {
                'User-Agent': 'Node.js',
            },
        });

        const issues = issuesResponse.data.map((issue: any) => ({
            id: issue.id,
            title: issue.title,
            url: issue.html_url,
            state: issue.state,
        }));

        console.log('Projeto encontrado:', project); // Log do projeto encontrado
        console.log('Issues encontradas:', issues); // Log das issues encontradas

        res.status(200).json({
            ...project,
            repositoryInfo: {
                fullName: repoInfo.full_name,
                description: repoInfo.description,
                languages: repoInfo.languages,
                issues,
            },
        });
    } catch (error) {
        console.error('Erro ao buscar informações do projeto:', error);
        res.status(500).json({ error: 'Erro ao buscar informações do projeto.' });
    }
});

//Rota para fazer a busca de solicitações de participação
router.get('/project/:id/requests', async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params; // Recebe o ID do projeto da URL
    console.log('ID do projeto recebido:', id); // Log do ID do projeto recebido
    try {
        // Busca o projeto com base no ID
        const project = await prisma.project.findUnique({
            where: { id: Number(id) }, // Converte o ID para um number
            include: {
                participants: {
                    include: {
                        user: true, // Inclui informações do usuário
                    },
                },
            },
        });
        if (!project) {
            res.status(404).json({ message: 'Projeto não encontrado.' });
            return;
        }
        // Filtra os participantes que estão aguardando aprovação (isActive: false)
        const pendingRequests = project.participants.filter((participant: { isActive: any; }) => !participant.isActive);
        if (pendingRequests.length === 0) {
            res.status(404).json({ message: 'Nenhuma solicitação de participação encontrada.' });
            return;
        }
        console.log('Solicitações de participação encontradas:', pendingRequests); // Log das solicitações encontradas
        res.status(200).json(pendingRequests);
    } catch (error) {
        if (error instanceof Error) {
            console.error('Erro ao buscar solicitações de participação:', error.message);
        } else {
            console.error('Erro ao buscar solicitações de participação:', error);
        }
        res.status(500).json({ error: 'Erro ao buscar solicitações de participação.' });
    }
});

// Rota para aceitar ou rejeitar solicitações de participação
router.post('/project/:id/requests/:userId', async (req: Request, res: Response): Promise<void> => {
    const { id, userId } = req.params; // Recebe o ID do projeto e do usuário da URL
    const { action } = req.body; // Recebe a ação (aceitar ou rejeitar) do corpo da requisição
    console.log('ID do projeto recebido:', id); // Log do ID do projeto recebido
    console.log('ID do usuário recebido:', userId); // Log do ID do usuário recebido
    console.log('Ação recebida:', action); // Log da ação recebida

    if (!action || (action !== 'accept' && action !== 'reject')) {
        res.status(400).json({ error: 'Ação inválida. Use "accept" ou "reject".' });
        return;
    }

    try {
        // Busca o projeto com base no ID
        const project = await prisma.project.findUnique({
            where: { id: Number(id) }, // Converte o ID para um number
            include: {
                participants: true, // Inclui os participantes do projeto
            },
        });

        if (!project) {
            res.status(404).json({ message: 'Projeto não encontrado.' });
            return;
        }

        // Busca o participante com base no ID do usuário
        const participant = project.participants.find((participant: { userId: number; }) => participant.userId === Number(userId));
        if (!participant) {
            res.status(404).json({ message: 'Participante não encontrado.' });
            return;
        }

        // Atualiza o campo isActive com base na ação
        const updatedParticipant = await prisma.projectParticipation.update({
            where: { id: participant.id },
            data: { isActive: action === 'accept' }, // Define isActive como true ou false
        });

        console.log('Participante atualizado:', updatedParticipant); // Log do participante atualizado
        res.status(200).json(updatedParticipant);
    } catch (error) {
        if (error instanceof Error) {
            console.error('Erro ao atualizar solicitação de participação:', error.message);
        } else {
            console.error('Erro ao atualizar solicitação de participação:', error);
        }
        res.status(500).json({ error: 'Erro ao atualizar solicitação de participação.' });
    }
});

// Rota para listar os projetos nos quais o usuário contribuiu
router.get('/user/:id/participations', async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params; // Recebe o ID do usuário da URL

    try {
        // Busca as participações do usuário
        const participations = await prisma.projectParticipation.findMany({
            where: { userId: Number(id) }, // Filtra pelo ID do usuário
            include: {
                project: true, // Inclui os detalhes do projeto
            },
        });

        if (participations.length === 0) {
            res.status(404).json({ message: 'Nenhuma participação encontrada para este usuário.' });
            return;
        }

        // Extrai apenas os projetos das participações
        const contributedProjects = participations.map((participation: { project: any; }) => participation.project);

        console.log('Projetos contribuídos encontrados:', contributedProjects); // Log dos projetos encontrados
        res.status(200).json(contributedProjects);
    } catch (error) {
        console.error('Erro ao buscar participações do usuário:', error);
        res.status(500).json({ error: 'Erro ao buscar participações do usuário.' });
    }
});

// Rota para listar todos os projetos
router.get('/projects', async (req: Request, res: Response): Promise<void> => {
    try {
        const projects = await prisma.project.findMany({
            include: {
                owner: true, // Inclui informações do proprietário
                _count: {
                    select: { participants: true }, // Conta os participantes
                },
            },
        });

        if (projects.length === 0) {
            res.status(404).json({ message: 'Nenhum projeto encontrado.' });
            return;
        }

        console.log('Projetos encontrados:', projects); // Log dos projetos encontrados

        res.status(200).json(projects);
    } catch (error) {
        console.error('Erro ao buscar projetos:', error);
        res.status(500).json({ error: 'Erro ao buscar projetos.' });
    }

});

// Rota para listar projetos criados pelo proprietário com contagem de participantes
router.get('/projectsbyowner', async (req: Request, res: Response): Promise<void> => {
    const { uid } = req.query; // Recebe o UID do proprietário dos projetos

    if (!uid) {
        res.status(400).json({ error: 'UID do proprietário não fornecido.' });
        return;
    }

    try {
        // Busca o ID do proprietário com base no UID
        const owner = await prisma.user.findUnique({
            where: { uid: uid as string },
        });

        if (!owner) {
            res.status(404).json({ message: 'Proprietário não encontrado.' });
            return;
        }

        // Busca os projetos do proprietário usando o ID e inclui a contagem de participantes
        const projects = await prisma.project.findMany({
            where: {
                ownerId: owner.id, // Usa o ID numérico do proprietário
            },
            include: {
                _count: {
                    select: { participants: true }, // Conta os participantes
                },
            },
        });

        if (projects.length === 0) {
            res.status(404).json({ message: 'Nenhum projeto encontrado para este proprietário.' });
            return;
        }

        console.log('Projetos encontrados:', projects); // Log dos projetos encontrados

        res.status(200).json(projects);
    } catch (error) {
        console.error('Erro ao buscar projetos:', error);
        res.status(500).json({ error: 'Erro ao buscar projetos.' });
    }
})

//Rota para criar um projeto
router.post('/Addproject', async (req: Request, res: Response): Promise<void> => {
    const { uid: ownerUid, name: title, description, githubLink: url } = req.body;

    console.log('Dados recebidos para criar projeto:', url); // Log dos dados recebidos

    // Validação dos campos obrigatórios
    if (!title || !description || !url || !ownerUid) {
        res.status(400).json({ error: 'Título, descrição, URL e UID do proprietário são obrigatórios.' });
        return;
    }

    try {
        // Busca o usuário proprietário com base no UID
        const owner = await prisma.user.findUnique({
            where: { uid: ownerUid },
        });

        if (!owner) {
            res.status(404).json({ error: 'Proprietário não encontrado.' });
            return;
        }

        // Busca informações do repositório no GitHub
        const repoInfo = await getRepositoryInfo(url);

        // Cria o projeto no banco de dados
        const project = await prisma.project.create({
            data: {
                title,
                description,
                githubLink: url,
                ownerId: owner.id, // Relaciona o projeto ao proprietário
                languages: repoInfo.languages, // Salva as linguagens do repositório
            },
        });

        console.log('Projeto criado:', project);
        res.status(201).json({ message: 'Projeto criado com sucesso!', project });
    } catch (error) {
        if (error instanceof Error) {
            console.error('Erro ao criar projeto:', error.message);
        } else {
            console.error('Erro ao criar projeto:', error);
        }
        res.status(500).json({ error: 'Erro ao criar projeto.' });
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

// Rota para listar um usuário pelo ID com seus projetos criados e participados
router.get('/user/:id', async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params; // Recebe o ID do usuário da URL

    try {
        // Busca o usuário com base no ID
        const user = await prisma.user.findUnique({
            where: { id: Number(id) }, // Converte o ID para um número
            include: {
                createdProjects: true, // Inclui os projetos criados pelo usuário
                participatedProjects: {
                    include: {
                        project: true, // Inclui os detalhes dos projetos nos quais o usuário contribuiu
                    },
                },
            },
        });

        if (!user) {
            res.status(404).json({ message: 'Usuário não encontrado.' });
            return;
        }

        // Formata os dados para incluir os projetos participados diretamente
        const formattedUser = {
            ...user,
            participatedProjects: user.participatedProjects.map((participation: { project: any; }) => participation.project),
        };

        console.log('Usuário encontrado:', formattedUser); // Log do usuário encontrado
        res.status(200).json(formattedUser);
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({ error: 'Erro ao buscar usuário.' });
    }
});

// Rota de exemplo existente
router.get('/Login', (req: Request, res: Response): void => {
    res.status(200).json({ message: 'Rota de login funcionando!' });
});

export default router;