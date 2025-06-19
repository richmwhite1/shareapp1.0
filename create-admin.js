const { adminStorage } = require('./server/admin-storage.js');

async function createAdmin() {
  try {
    const admin = await adminStorage.createAdminUser({
      username: 'admin',
      password: 'admin123',
      role: 'super_admin',
      permissions: ['all'],
      isActive: true
    });
    console.log('Admin user created:', admin);
  } catch (error) {
    console.error('Error creating admin:', error);
  }
}

createAdmin();