import { Analytics } from '@vercel/analytics/react';
import VariantB from './VariantB';
import BrandShowcase from './BrandShowcase';

function App() {
  // Show brand showcase on /brands path
  const isBrands = window.location.pathname === '/brands';

  return (
    <div style={{ width: '100vw', minHeight: '100vh', overflowX: 'hidden' }}>
      {isBrands ? <BrandShowcase /> : <VariantB />}
      <Analytics />
    </div>
  );
}

export default App;
