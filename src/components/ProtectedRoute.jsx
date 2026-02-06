import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ShieldAlert, Clock, LogOut } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [roleData, setRoleData] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setLoading(false);
        navigate('/login');
        return;
      }

      setUser(session.user);

      try {
        // Check User Role
        let { data, error } = await supabase
          .from('user_roles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!data) {
          // First time login - Create Role Entry
          const isSuperAdmin = session.user.email === 'prahladkr21@gmail.com';
          const newRole = {
            id: session.user.id,
            email: session.user.email,
            role: isSuperAdmin ? 'super_admin' : 'pending',
            is_blocked: false
          };

          const { error: insertError } = await supabase
            .from('user_roles')
            .insert([newRole]);
          
          if (!insertError) {
            data = newRole;
          }
        }
        
        setRoleData(data);
      } catch (error) {
        console.error('Auth Check Error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setRoleData(null);
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  // Blocked State
  if (roleData?.is_blocked) {
    return (
      <div className="container" style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ padding: '2rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '1rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <ShieldAlert size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Access Denied</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Your account has been blocked by the administrator.</p>
          <button onClick={() => supabase.auth.signOut()} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Pending State
  if (roleData?.role === 'pending') {
    return (
      <div className="container" style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '3rem', maxWidth: '500px' }}>
          <Clock size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Approval Pending</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Thanks for signing up! Your account is currently under review. 
            Please ask the Super Admin (Prahlad) to verify and approve your request.
          </p>
          <div style={{ padding: '1rem', background: 'var(--bg-page)', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            <strong>Email:</strong> {user.email}
          </div>
          <button onClick={() => supabase.auth.signOut()} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Pass role to children if possible, or just render children
  return React.cloneElement(children, { role: roleData?.role });
};

export default ProtectedRoute;
