import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extiende la interfaz Request para incluir la propiedad user (información del JWT)
export interface AuthenticatedRequest extends Request {
    user?: { id: number; role: 'docente' | 'secretaria'; email: string; };
}

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // 1. Obtener el token del header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Acceso denegado. No hay token proporcionado.' });
    }

    const token = authHeader.split(' ')[1];

    // Verificamos que la variable de entorno exista
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        return res.status(500).json({ message: 'Error interno: Secreto JWT no configurado.' });
    }

    try {
        // 2. Verificar el token usando su secreto JWT
        // **** CAMBIO CLAVE: Usar la variable 'jwtSecret' (verificada) ****
        const decoded = jwt.verify(token, jwtSecret); 
        
        // 3. Adjuntar la información del usuario al objeto de solicitud
        req.user = decoded as AuthenticatedRequest['user'];
        
        next(); // Continuar a la siguiente función (el controlador)

    } catch (error) {
        // 4. Falló la verificación del token (expirado, inválido, etc.)
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

