import { Router } from 'express';
import { 
    getGlobalBookings, 
    getMyBookings, 
    getAllRequests, 
    createRequest,
    getClassrooms,
    getMyRequests,
    approveRequest, 
    rejectRequest,
    createBooking
} from '../controllers/dataControllers.ts'; 
import { requireAuth, requireSecretaria } from '../middlewares/authMiddleware.ts';

const router = Router();

// --- RUTAS GET ---
router.get('/bookings', requireAuth, getGlobalBookings);
router.get('/bookings/my', requireAuth, getMyBookings);
router.get('/requests', requireAuth, requireSecretaria, getAllRequests);
router.get('/classrooms', requireAuth, getClassrooms);
router.get('/requests/my', requireAuth, getMyRequests);

// --- RUTAS POST ---
router.post('/requests', requireAuth, createRequest);
router.post('/bookings', requireAuth, requireSecretaria, createBooking);

// --- RUTAS PUT ---
router.put('/requests/:id/approve', requireAuth, requireSecretaria, approveRequest);
router.put('/requests/:id/reject', requireAuth, requireSecretaria, rejectRequest);

export default router;

