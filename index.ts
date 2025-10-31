// index.ts
import express from 'express'; 
import type { Request, Response, NextFunction } from 'express'; 
import 'dotenv/config'; // Importa las variables de entorno del archivo .env
import cors from 'cors'; // Para permitir peticiones desde el frontend de React

// Rutas
import authRoutes from './routes/authRoutes.ts';
import dataRoutes from './routes/dataRoutes.ts'; 

// Conexión a la base de datos
import { db } from './db.ts'; 

const app = express();
// Configura el puerto. Usará el del archivo .env o 3001 por defecto
const PORT = process.env.PORT || 3001;
// Obtiene el origen permitido del .env
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'; 

// --- Middlewares ---

// CORS: Permite que el frontend (en otro puerto) acceda a la API
app.use(cors({
  origin: FRONTEND_URL, 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body Parser: Para que Express pueda leer el JSON enviado en las peticiones
app.use(express.json());


// --- Rutas ---

// Ruta principal para verificar que el servidor funciona
app.get('/', (req: Request, res: Response) => {
    res.send('Gestión de Aulas UNSTA API - ¡En funcionamiento!');
});

// Conecta las rutas de autenticación: prefijo /api/auth
// Ejemplo: /api/auth/login, /api/auth/register
app.use('/api/auth', authRoutes);

// Conecta las rutas de datos: prefijo /api
// Ejemplo: /api/bookings, /api/requests
app.use('/api', dataRoutes); 


// --- Inicio del Servidor ---

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend escuchando en http://localhost:${PORT}`);
  
  // Opcional: Probar la conexión a la base de datos al iniciar
  db.query('SELECT NOW()')
    .then(() => console.log('✅ Conexión a PostgreSQL establecida con éxito.'))
    .catch(err => console.error('❌ Error al conectar a PostgreSQL:', err.message));
});
