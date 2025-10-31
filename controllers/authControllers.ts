// controllers/authController.ts
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.ts'; // Importa el cliente de DB

// Interfaz para el usuario (opcional, pero buena práctica con TS)
interface UserDB {
    id: number;
    name: string;
    email: string;
    password: string; // El hash de la contraseña
    role: 'docente' | 'secretaria';
}

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email y contraseña son requeridos.' });
    }

    try {
        // 1. Buscar el usuario por email
        const result = await db.query<UserDB>('SELECT * FROM "User" WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // 2. Comparar la contraseña (PASSWORD vs HASH)
        const isMatch = await bcrypt.compare(password, user.password); 
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // 3. Generar JWT
        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email }, // Datos a guardar en el token
            process.env.JWT_SECRET!, // El secreto definido en .env
            { expiresIn: '1d' } // Expira en 1 día
        );

        // 4. Devolver la respuesta al frontend (incluyendo el token)
        // Eliminamos el hash de la contraseña antes de enviarlo
        const { password: _, ...userPayload } = user;
        
        res.json({ 
            token, 
            user: userPayload // Datos del usuario sin la contraseña
        });

    } catch (error) {
        console.error('Error durante el login:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};