import { useState } from 'react';
import { AppProvider } from './state/store';
import { ToastProvider } from './components/ui';
import { BottomNav, type Page } from './components/BottomNav';
import { Today } from './pages/Today';
import { Plan } from './pages/Plan';
import { Review } from './pages/Review';
import { Settings } from './pages/Settings';

export function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </AppProvider>
  );
}

function Shell() {
  const [page, setPage] = useState<Page>('today');
  return (
    <>
      {page === 'today' && <Today />}
      {page === 'plan' && <Plan />}
      {page === 'review' && <Review />}
      {page === 'settings' && <Settings />}
      <BottomNav page={page} onChange={setPage} />
    </>
  );
}
