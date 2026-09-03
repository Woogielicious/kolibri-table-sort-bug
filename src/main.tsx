import ReactDOM from 'react-dom/client';
import { register } from '@public-ui/components';
import { defineCustomElements } from '@public-ui/components/loader';
import { DEFAULT } from '@public-ui/theme-default';

import { App } from './App';
import './index.css';

/**
 * KoliBri muss vor dem ersten Rendern registriert werden.
 * (Angular-Analogie: derselbe register(...)-Aufruf, den man dort in die main.ts legt.)
 *
 * Bewusst OHNE <React.StrictMode>: StrictMode rendert im Dev-Modus doppelt und
 * würde den Bug schon beim Mount auslösen. Für ein sauberes "erst beim Scrollen"
 * muss das erste Rerender vom Scroll-Event kommen.
 */
void register(DEFAULT, [defineCustomElements]).then(() => {
	ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />);
});
