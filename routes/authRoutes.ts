// routes/authRoutes.ts
import { Router } from 'express';
import { login } from '../controllers/authControllers.ts';

const router = Router();

// Endpoint: POST /api/auth/login
router.post('/login', login);

// Aquí iría el endpoint de registro:
// router.post('/register', register); 

export default router;