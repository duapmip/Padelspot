import { Analytics } from '@vercel/analytics/react';
import VariantB from './VariantB';

function App() {
  return (
    <div style={{ width: '100vw', minHeight: '100vh', overflowX: 'hidden' }}>
      <VariantB />
      <Analytics />
    </div>
  );
}

export default App;
