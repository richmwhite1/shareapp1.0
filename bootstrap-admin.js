import { db } from './server/db.js';
import { adminUsers } from './shared/schema.js';
import bcrypt from 'bcryptjs';

async function bootstrapAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const [admin] = await db.insert(adminUsers).values({
      username: 'admin',
      password: hashedPassword,
      email: 'admin@shareapp.com',
      role: 'super_admin',
      permissions: ['all'],
      isActive: true
    }).returning();
    
    console.log('Admin user created successfully:', admin);
  } catch (error) {
    console.log('Admin user may already exist or error occurred:', error.message);
  }
}

bootstrapAdmin();