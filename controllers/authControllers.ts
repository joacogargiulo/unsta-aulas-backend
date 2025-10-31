// controllers/authController.ts
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.ts'; // Importa el cliente de DB
import type { QueryResult } from 'pg';

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

export const register = async (req: Request, res: Response) => {
    const { name, email, password, role } = req.body;

    // Validación básica de entrada
    if (!name || !email || !password || !role) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }
    if (role !== 'docente' && role !== 'secretaria') {
        return res.status(400).json({ message: 'Rol inválido.' });
    }

    try {
        // 1. Verificar si el email ya existe en la DB
        // (Asumimos que la columna 'email' es minúscula, como el resto)
        const existingUser = await db.query('SELECT id FROM "User" WHERE email = $1', [email]);
        
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ message: 'El correo electrónico ya está en uso.' });
        }

        // 2. Hashear la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Insertar el nuevo usuario en la DB
        // (Usamos columnas en minúscula)
        const newUserResult: QueryResult<UserDB> = await db.query(
            'INSERT INTO "User" (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
            [name, email, hashedPassword, role]
        );
        
        const newUser = newUserResult.rows[0];

        // 4. Devolver éxito
        res.status(201).json({ 
            message: 'Registro exitoso.',
            user: newUser 
        });

    } catch (error) {
        console.error('Error durante el registro:', error);
        res.status(500).json({ message: 'Error interno del servidor al registrar.' });
    }
};
