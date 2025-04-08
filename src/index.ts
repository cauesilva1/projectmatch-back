import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import routes from './routes';
import { prisma } from './prisma';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev')); // Middleware de logs
app.use('/', routes);

const PORT = process.env.PORT || 5000;

// Fecha as conexões do Prisma ao encerrar o processo
process.on('SIGINT', async () => {
    console.log('Encerrando conexões do Prisma...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Encerrando conexões do Prisma...');
    await prisma.$disconnect();
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});