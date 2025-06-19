import bcrypt from 'bcryptjs';
import { db } from './server/db.js';
import { adminUsers } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function updateAdminPassword() {
  try {
    console.log('Updating admin password...');
    
    const hashedPassword = await bcrypt.hash('password', 10);
    
    await db.update(adminUsers)
      .set({ password: hashedPassword })
      .where(eq(adminUsers.username, 'admin'));
    
    console.log('Admin password updated successfully to "password"');
  } catch (error) {
    console.error('Error updating admin password:', error);
  }
}

updateAdminPassword();