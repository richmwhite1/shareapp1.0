import { db } from "./db";
import { adminUsers } from "@shared/schema";
import bcrypt from 'bcryptjs';

export async function createBootstrapAdmin() {
  try {
    // Check if admin already exists
    const [existingAdmin] = await db.select().from(adminUsers).where().limit(1);
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      return existingAdmin;
    }

    // Create bootstrap admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const [admin] = await db.insert(adminUsers).values({
      username: 'admin',
      password: hashedPassword,
      email: 'admin@share.com',
      role: 'super_admin',
      permissions: [
        'user_management',
        'content_moderation', 
        'system_config',
        'admin_management',
        'data_export'
      ],
      isActive: true
    }).returning();

    console.log('Bootstrap admin user created successfully');
    return admin;
    
  } catch (error) {
    console.error('Error creating bootstrap admin:', error);
    throw error;
  }
}