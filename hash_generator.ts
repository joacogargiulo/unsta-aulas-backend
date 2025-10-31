// hash_generator.ts
import bcrypt from 'bcryptjs';

const password = 'password123'; // La contraseña real
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(`\n✅ Nuevo Hash para '${password}':\n${hash}\n`);
});