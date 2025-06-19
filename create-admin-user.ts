import { adminStorage } from './server/admin-storage.js';

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    
    const admin = await adminStorage.createAdminUser({
      username: 'admin',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'super_admin',
      permissions: ['*'],
      isActive: true
    });
    
    console.log('Admin user created successfully:', admin);
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

createAdminUser();