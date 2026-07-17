import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import LoginPage from './components/LoginPage.tsx';
import ChangePasswordModal from './components/ChangePasswordModal.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import './index.css';

// App.tsx baru menerapkan class "dark" ke <html> setelah mount — terapkan lebih awal
// di sini juga supaya LoginPage/ChangePasswordModal (yang bisa tampil sebelum App
// mount) ikut konsisten dengan preferensi tema yang tersimpan.
if (localStorage.getItem('ats_dark_theme') === 'true') {
  document.documentElement.classList.add('dark');
}

// Terapkan preferensi keterbacaan sebelum React dirender agar tidak terjadi
// perubahan ukuran mendadak pada layar masuk maupun saat sesi dimuat.
if (localStorage.getItem('ats_display_mode') === 'accessible') {
  document.documentElement.classList.add('accessibility-mode');
} else {
  document.documentElement.classList.add('standard-mode');
}

function AuthGate() {
  const { user, status, refresh } = useAuth();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400 text-xs">
        Memuat sesi...
      </div>
    );
  }

  if (status === 'unauthenticated' || !user) {
    return <LoginPage />;
  }

  if (user.mustChangePassword) {
    return <ChangePasswordModal blocking onSuccess={refresh} />;
  }

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  </StrictMode>,
);
