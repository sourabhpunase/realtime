import React, { useState } from 'react';

const UserViewer = () => {
  const [localUsers, setLocalUsers] = useState([]);
  const [supabaseUsers, setSupabaseUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Load all users from Supabase (now the main system)
      const response = await fetch('/all-users');
      const data = await response.json();
      setSupabaseUsers(data.users || []);
      setLocalUsers([]); // No longer using local storage
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '20px',
      background: 'white',
      border: '2px solid #007bff',
      borderRadius: '10px',
      padding: '20px',
      width: '600px',
      maxHeight: '80vh',
      overflow: 'auto',
      zIndex: 1000,
      fontSize: '14px'
    }}>
      <h3 style={{ color: '#007bff', marginBottom: '15px' }}>
        👥 All Users in System
      </h3>

      <button
        onClick={loadUsers}
        disabled={loading}
        style={{
          background: '#007bff',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '5px',
          marginBottom: '20px'
        }}
      >
        {loading ? '🔄 Loading...' : '👥 Load All Users'}
      </button>

      {(localUsers.length > 0 || supabaseUsers.length > 0) && (
        <div>
          {/* Create Admin Users */}
          <div style={{ marginBottom: '30px' }}>
            <h4 style={{ 
              color: '#dc3545', 
              borderBottom: '2px solid #dc3545',
              paddingBottom: '5px'
            }}>
              🔧 Admin Setup
            </h4>
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/create-default-admins', { method: 'POST' });
                  const data = await response.json();
                  alert(JSON.stringify(data, null, 2));
                  loadUsers();
                } catch (error) {
                  alert('Error: ' + error.message);
                }
              }}
              style={{
                background: '#dc3545',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '5px',
                marginTop: '10px'
              }}
            >
              👑 Create Admin Users
            </button>
          </div>

          {/* Supabase Users (Now Active) */}
          <div>
            <h4 style={{ 
              color: '#28a745', 
              borderBottom: '2px solid #28a745',
              paddingBottom: '5px'
            }}>
              🟢 All Users (Supabase Database) - {supabaseUsers.length}
            </h4>
            {supabaseUsers.length === 0 ? (
              <p style={{ color: '#666' }}>No Supabase users</p>
            ) : (
              <div style={{ marginTop: '10px', maxHeight: '300px', overflow: 'auto' }}>
                {supabaseUsers.map((user) => (
                  <div key={user.id} style={{
                    border: '1px solid #28a745',
                    borderRadius: '5px',
                    padding: '10px',
                    margin: '5px 0',
                    background: '#f8fff8'
                  }}>
                    <div style={{ fontWeight: 'bold', color: '#28a745' }}>
                      {user.fullName || user.user_metadata?.fullName || user.email} ({(user.role || 'user').toUpperCase()})
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      📧 {user.email}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      🆔 {user.id}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      📅 Created: {new Date(user.created_at).toLocaleString()}
                    </div>
                    {user.lastLoginAt && (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        🔑 Last Login: {new Date(user.lastLoginAt).toLocaleString()}
                      </div>
                    )}
                    {(user.role === 'superadmin' || user.role === 'admin') && (
                      <div style={{ 
                        fontSize: '11px', 
                        background: user.role === 'superadmin' ? '#dc3545' : '#ffc107', 
                        color: user.role === 'superadmin' ? 'white' : 'black', 
                        padding: '2px 6px', 
                        borderRadius: '3px',
                        marginTop: '5px',
                        display: 'inline-block'
                      }}>
                        {user.role === 'superadmin' ? '👑 SUPERADMIN' : '🛡️ ADMIN'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{
            marginTop: '20px',
            padding: '10px',
            background: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '5px',
            fontSize: '12px'
          }}>
            <strong>ℹ️ Info:</strong><br />
            • <strong>All users</strong> are now stored in Supabase database<br />
            • <strong>System switched</strong> from local storage to Supabase<br />
            • <strong>Login credentials:</strong> superadmin@example.com / SuperAdmin123!
          </div>
        </div>
      )}
    </div>
  );
};

export default UserViewer;