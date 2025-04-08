import { prisma } from '../prisma'; 
import axios from 'axios';

export const authenticateGitHubUser = async (token: string) => {
    try {
        // Busca os dados do usuário na API do GitHub
        const githubResponse = await axios.get('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${token}`,
                'User-Agent': 'Node.js', // Necessário para a API do GitHub
            },
        });

        let { id: uid, name: displayName, email, avatar_url: photoURL, bio, blog, location, public_repos, followers, following } = githubResponse.data;

        // Se o e-mail não estiver disponível, busca os e-mails do usuário
        if (!email) {
            const emailsResponse = await axios.get('https://api.github.com/user/emails', {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'User-Agent': 'Node.js',
                },
            });

            // Procura o e-mail principal (primary) e verificado (verified)
            const primaryEmail = emailsResponse.data.find((emailObj: any) => emailObj.primary && emailObj.verified);
            if (primaryEmail) {
                email = primaryEmail.email;
            } else {
                throw new Error('Nenhum e-mail verificado disponível para o usuário.');
            }
        }

        // Verifica se o usuário já existe no banco de dados
        let user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // Cria um novo usuário se ele não existir
            user = await prisma.user.create({
                data: {
                    uid: String(uid),
                    name: displayName,
                    email,
                    photoURL,
                    createdAt: new Date(),
                    lastLoginAt: new Date(),
                },
            });
        } else {
            // Atualiza o último login do usuário existente
            user = await prisma.user.update({
                where: { email },
                data: {
                    lastLoginAt: new Date(),
                },
            });
        }

        // Retorna o usuário e as informações adicionais para o front-end
        return {
            user,
            additionalInfo: {
                bio,
                blog,
                location,
                public_repos,
                followers,
                following,
            },
        };
    } catch (error) {
        if (error instanceof Error) {
            console.error('Erro ao autenticar usuário via GitHub:', error.message);
        } else {
            console.error('Erro ao autenticar usuário via GitHub:', error);
        }
        throw new Error('Erro ao autenticar usuário via GitHub');
    }
};