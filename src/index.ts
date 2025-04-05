import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import routes from './routes';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev')); // Middleware de logs
app.use('/', routes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});