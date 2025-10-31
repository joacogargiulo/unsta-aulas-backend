// routes/authRoutes.ts
import { Router } from 'express';
import { login, register } from '../controllers/authControllers.ts';

const router = Router();

// Endpoint: POST /api/auth/login
router.post('/login', login);

// Endpoint: POST /api/auth/register
router.post('/register', register); 

export default router;