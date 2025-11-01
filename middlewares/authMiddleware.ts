import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extiende la interfaz Request para incluir la propiedad user (información del JWT)
export interface AuthenticatedRequest extends Request {
    user?: { id: number; role: 'docente' | 'secretaria'; email: string };
}

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // 1. Obtener el token del header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Acceso denegado. No hay token proporcionado.' });
    }

    const token = authHeader.split(' ')[1];

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        // Si no está definido el secreto, se devuelve error 500
        return res.status(500).json({ message: 'Error interno: Secreto JWT no configurado.' });
    }

    try {
        // 2. Verificar el token usando el secreto JWT
        const decoded = jwt.verify(token, jwtSecret) as {
            id: number;
            role: 'docente' | 'secretaria';
            email: string;
        };

        // 3. Asignar los datos del usuario decodificados al request
        req.user = decoded;

        // 4. Continuar con el siguiente middleware o ruta
        next();
    } catch (error) {
        // 5. Si el token no es válido o expiró
        return res.status(401).json({ message: 'Token inválido o expirado.' });
    }
};

// Middleware para verificar si el usuario es Secretaría
export const requireSecretaria = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'secretaria') {
        return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de Secretaría.' });
    }
    next();
};
