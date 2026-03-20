import { Suspense } from 'react';
import Navbar from './Navbar';

export default function NavbarWrapper() {
  return (
    <Suspense fallback={
      <div style={{
        position: 'fixed', inset: '0 0 auto 0', zIndex: 500, height: 'var(--nav)',
        background: 'rgba(7,9,15,.97)', borderBottom: '1px solid var(--b0)',
        display: 'flex', alignItems: 'center', padding: '0 clamp(1rem,4vw,3rem)',
      }}>
        <span style={{ fontWeight: 900, fontSize: '1.5rem', letterSpacing: '-.7px' }}>
          Ani<em style={{ color: 'var(--acc)', fontStyle: 'normal' }}>Stream</em>
        </span>
      </div>
    }>
      <Navbar />
    </Suspense>
  );
}
