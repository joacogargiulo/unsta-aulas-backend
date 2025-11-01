import type { Response } from 'express';
// FIX: Importamos 'pool' (default) y 'db' (named)
import { db } from '../db.js';
import pool from '../db.js'; 
import type { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import type { QueryResult } from 'pg';

// --- INTERFACES (Sin cambios) ---
interface BookingDB {
    id: number;
    classroomid: number;
    userid: number; 
    subject: string;
    career: string;
    starttime: string | Date;
    endtime: string | Date;
}
interface RequestDB {
    id: number;
    userid: number; 
    subject: string;
    career: string;
    starttime: string | Date;
    endtime: string | Date;
    reason: string;
    status: 'Pendiente' | 'Aprobada' | 'Rechazada';
    requestedclassroomid?: number;
    assignedclassroomid?: number;
}
interface ClassroomDB {
    id: number;
    name: string;
    capacity: number;
    hasprojector: boolean;
    studentcomputers: number;
    hasairconditioning: boolean;
    faculty: string; 
}

// --- FUNCIONES GET (Sin cambios) ---
export const getGlobalBookings = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result: QueryResult<BookingDB> = await db.query('SELECT * FROM "Booking"');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener reservas globales:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

export const getMyBookings = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) { return res.status(401).json({ message: 'Usuario no autenticado.' }); }
    try {
        const result: QueryResult<BookingDB> = await db.query( 'SELECT * FROM "Booking" WHERE userid = $1', [userId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener mis reservas:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

export const getAllRequests = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result: QueryResult<RequestDB> = await db.query('SELECT * FROM "ClassroomRequest"');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener solicitudes:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

export const createRequest = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id; 
    const { subject, career, startTime, endTime, reason, requestedClassroomId } = req.body;
    if (!userId || !subject || !career || !startTime || !endTime) {
        return res.status(400).json({ message: 'Campos obligatorios de la solicitud faltantes.' });
    }
    try {
        const result: QueryResult<RequestDB> = await db.query(
            'INSERT INTO "ClassroomRequest" (userid, subject, career, starttime, endtime, reason, status, requestedclassroomid) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [userId, subject, career, startTime, endTime, reason || null, 'Pendiente', requestedClassroomId || null] 
        );
        res.status(201).json({ message: 'Solicitud creada con éxito.', request: result.rows[0] });
    } catch (error) {
        console.error('Error al crear solicitud:', error);
        res.status(500).json({ message: 'Error interno del servidor al crear solicitud.' });
    }
};

export const getClassrooms = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result: QueryResult<ClassroomDB> = await db.query('SELECT * FROM "Classroom"');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener aulas:', error);
        res.status(500).json({ message: 'Error interno del servidor al cargar aulas.' });
    }
};

export const getMyRequests = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id; 
    if (!userId) { return res.status(401).json({ message: 'Usuario no autenticado.' }); }
    try {
        const result: QueryResult<RequestDB> = await db.query( 'SELECT * FROM "ClassroomRequest" WHERE userid = $1 ORDER BY starttime DESC', [userId]);
        res.json(result.rows); 
    } catch (error) {
        console.error('Error al obtener mis solicitudes:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// --- NUEVAS FUNCIONES ---

// PUT /api/requests/:id/approve
export const approveRequest = async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params; // ID de la solicitud
    const { classroomId } = req.body; // ID del aula asignada

    if (!classroomId) {
        return res.status(400).json({ message: 'Se requiere un ID de aula para aprobar.' });
    }

    // Usamos una transacción (pool.connect)
    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Iniciar transacción

        // 1. Actualizar la solicitud
        const updateResult: QueryResult<RequestDB> = await client.query(
            'UPDATE "ClassroomRequest" SET status = $1, assignedclassroomid = $2 WHERE id = $3 AND status = $4 RETURNING *',
            ['Aprobada', classroomId, id, 'Pendiente']
        );

        if (updateResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Solicitud no encontrada o ya fue procesada.' });
        }

        const request = updateResult.rows[0];

        // 2. Crear la reserva (Booking)
        await client.query(
            'INSERT INTO "Booking" (classroomid, userid, subject, career, starttime, endtime) VALUES ($1, $2, $3, $4, $5, $6)',
            [classroomId, request.userid, request.subject, request.career, request.starttime, request.endtime]
        );

        await client.query('COMMIT'); // Confirmar transacción
        
        res.status(200).json({ message: 'Solicitud aprobada y reserva creada.', request: mapRequestToFrontend(request) });

    } catch (error) {
        await client.query('ROLLBACK'); 
        console.error('Error al aprobar solicitud:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    } finally {
        client.release(); // Liberar cliente
    }
};

// PUT /api/requests/:id/reject
export const rejectRequest = async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params; // ID de la solicitud

    try {
        // No necesitamos transacción, es una sola consulta
        const updateResult: QueryResult<RequestDB> = await db.query(
            'UPDATE "ClassroomRequest" SET status = $1 WHERE id = $2 AND status = $3 RETURNING *',
            ['Rechazada', id, 'Pendiente']
        );

        if (updateResult.rows.length === 0) {
            return res.status(404).json({ message: 'Solicitud no encontrada o ya fue procesada.' });
        }

        res.status(200).json({ message: 'Solicitud rechazada.', request: mapRequestToFrontend(updateResult.rows[0]) });

    } catch (error) {
        console.error('Error al rechazar solicitud:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};


// POST /api/bookings (Crear Reserva Directa)
export const createBooking = async (req: AuthenticatedRequest, res: Response) => {
    // El usuario que crea es Secretaría (verificado por middleware)
    // El 'userId' del body es el *Docente* al que se le asigna la clase
    const { classroomId, userId, subject, career, startTime, endTime } = req.body;

    if (!classroomId || !userId || !subject || !career || !startTime || !endTime) {
        return res.status(400).json({ message: 'Campos obligatorios de la reserva faltantes.' });
    }

    try {
        const result: QueryResult<BookingDB> = await db.query(
            'INSERT INTO "Booking" (classroomid, userid, subject, career, starttime, endtime) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [classroomId, userId, subject, career, startTime, endTime]
        );
        
        res.status(201).json({ 
            message: 'Reserva creada con éxito.',
            booking: result.rows[0] // Devolvemos la reserva creada
        });

    } catch (error) {
        console.error('Error al crear reserva directa:', error);
        res.status(500).json({ message: 'Error interno del servidor al crear reserva.' });
    }
};

// Helper para mapear antes de enviar al frontend (opcional pero buena práctica)
const mapRequestToFrontend = (dbReq: any): RequestDB => {
    return {
        id: dbReq.id,
        userid: dbReq.userid, 
        subject: dbReq.subject,
        career: dbReq.career,
        starttime: new Date(dbReq.starttime), 
        endtime: new Date(dbReq.endtime), 
        reason: dbReq.reason,
        status: dbReq.status,
        requestedclassroomid: dbReq.requestedclassroomid, 
        assignedclassroomid: dbReq.assignedclassroomid 
    };
};

