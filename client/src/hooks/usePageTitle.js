import { useEffect } from 'react';

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · estudia-ai` : 'estudia-ai · estudia con tu propio material';
  }, [title]);
}
