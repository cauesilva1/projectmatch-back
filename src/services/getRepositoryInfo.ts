import axios from 'axios';

export const getRepositoryInfo = async (repoUrl: string, token?: string) => {
    try {
        // Extrai o owner e o repo do URL
        const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (!match) {
            throw new Error('URL do repositório inválida.');
        }

        const [_, owner, repo] = match;

        // Faz a requisição para a API do GitHub
        const repoResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: token
                ? {
                      Authorization: `Bearer ${token}`,
                      'User-Agent': 'Node.js',
                  }
                : {
                      'User-Agent': 'Node.js',
                  },
        });

        // Faz a requisição para buscar as linguagens do repositório
        const languagesResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}/languages`, {
            headers: token
                ? {
                      Authorization: `Bearer ${token}`,
                      'User-Agent': 'Node.js',
                  }
                : {
                      'User-Agent': 'Node.js',
                  },
        });

        return {
            ...repoResponse.data,
            languages: Object.keys(languagesResponse.data), // Retorna as linguagens como um array de strings
        };
    } catch (error) {
        if (error instanceof Error) {
            console.error('Erro ao buscar informações do repositório:', error.message);
        } else {
            console.error('Erro ao buscar informações do repositório:', error);
        }
        throw error;
    }
};