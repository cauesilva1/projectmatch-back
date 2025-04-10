"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUser = void 0;
const validateUser = (req, res, next) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        return; // Finaliza a execução para evitar chamar `next()`
    }
    if (password.length < 6) {
        res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
        return; // Finaliza a execução para evitar chamar `next()`
    }
    next(); // Continua para o próximo middleware ou rota
};
exports.validateUser = validateUser;
