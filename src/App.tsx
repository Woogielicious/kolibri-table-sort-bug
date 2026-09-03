import { useEffect, useState } from 'react';

import { DebugLog } from './DebugLog';
import { SortStatus } from './SortStatus';
import { TableSection } from './TableSection';
import { ROW_COUNT } from './data';
import { emitLog } from './logBus';

export function App() {
	/* Repro-Schalter -------------------------------------------------- */
	const [unstableHeaders, setUnstableHeaders] = useState(true);
	const [unstableData, setUnstableData] = useState(true);

	/* Rerender-Auslöser ----------------------------------------------- */
	const [rerenderToken, setRerenderToken] = useState(0);
	const [scrollCount, setScrollCount] = useState(0);

	useEffect(() => {
		let ticking = false;
		const onScroll = () => {
			if (ticking) {
				return;
			}
			ticking = true;
			requestAnimationFrame(() => {
				ticking = false;
				setScrollCount((value) => {
					emitLog('scroll', `Scroll-Event #${value + 1} → setState → React-Rerender`);
					return value + 1;
				});
				setRerenderToken((value) => value + 1);
			});
		};
		// Bewusst nur der Seiten-Scroll. Mit { capture: true } auf document würden
		// auch Scrolls innerer Container mitgezählt – u. a. das Scroll-into-view
		// beim Fokussieren des Sortier-Buttons. Der Sortier-Klick würde sich dann
		// selbst zurücksetzen, was den Befund unnötig verwirrend macht.
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, []);

	const bugActive = unstableHeaders || unstableData;

	return (
		<div className="page">
			<header className="page__header">
				<h1>KoliBri 4.2.1 – Sortierung geht beim ersten Scrollen verloren</h1>
				<p className="lead">
					{ROW_COUNT} Dummy-Datensätze in einer <code>&lt;KolTableStateful&gt;</code> mit Pagination (25 pro Seite).
					Ein Scroll-Event löst ein React-Rerender aus – mehr passiert nicht.
				</p>
			</header>

			<section className="panel">
				<h2>1. Reproduktion</h2>
				<ol>
					<li>
						Auf die Spaltenüberschrift <strong>Name</strong> klicken → Tabelle ist sortiert (Pfeil sichtbar).
					</li>
					<li>Ein Stück scrollen (Mausrad genügt).</li>
					<li>
						Sortier-Pfeil und Datenreihenfolge springen in den Ausgangszustand zurück – ohne Klick, ohne
						Datenänderung.
					</li>
				</ol>
			</section>

			<section className="panel">
				<h2>2. Schalter</h2>
				<label className="switch">
					<input
						type="checkbox"
						checked={unstableHeaders}
						onChange={(event) => {
							setUnstableHeaders(event.target.checked);
							emitLog('info', `_headers-Referenz: ${event.target.checked ? 'INSTABIL (Bug)' : 'memoized (Fix)'}`);
						}}
					/>
					<span>
						<code>_headers</code> bei jedem Render neu erzeugen <em>(Hauptursache)</em>
					</span>
				</label>
				<label className="switch">
					<input
						type="checkbox"
						checked={unstableData}
						onChange={(event) => {
							setUnstableData(event.target.checked);
							emitLog('info', `_data-Referenz: ${event.target.checked ? 'INSTABIL' : 'memoized'}`);
						}}
					/>
					<span>
						<code>_data</code> bei jedem Render neu erzeugen <em>(macht den Reset in den Daten sichtbar)</em>
					</span>
				</label>

				<p className={bugActive ? 'status status--bug' : 'status status--ok'}>
					{bugActive
						? 'Bug-Modus: mindestens eine Prop-Referenz ist instabil – die Sortierung überlebt kein Rerender.'
						: 'Fix-Modus: alle Props sind memoized – die Sortierung bleibt beim Scrollen erhalten.'}
				</p>
				<div className="actions">
					<button
						type="button"
						onClick={() => {
							emitLog('info', 'Button „Rerender ohne Scroll" gedrückt');
							setRerenderToken((value) => value + 1);
						}}
					>
						Rerender ohne Scroll auslösen
					</button>
				</div>

				<p className="note">
					Falls das Scrollen bei dir nichts auslöst: Der Button oben erzwingt dasselbe Rerender ohne Scroll-Event.
					Beim Umschalten der Checkboxen wird die Tabelle über <code>key</code> neu gemountet, damit beide Modi
					sauber vergleichbar sind. Scroll-Events bisher: <strong>{scrollCount}</strong>, Rerenders:{' '}
					<strong>{rerenderToken}</strong>
				</p>
			</section>

			<section className="panel panel--wide">
				<h2>3. Tabelle</h2>
				<SortStatus />
				<TableSection
					unstableHeaders={unstableHeaders}
					unstableData={unstableData}
					rerenderToken={rerenderToken}
				/>
			</section>

			<section className="panel panel--wide">
				<h2>4. Debug-Log</h2>
				<DebugLog />
			</section>

			<section className="panel">
				<h2>5. Analyse</h2>
				<p>
					Der React-Wrapper (<code>@public-ui/react</code>, Funktion <code>attachProps</code>) schreibt bei jedem
					Render sämtliche Props per <code>node[prop] = value</code> auf das Custom Element – ohne Vergleich.
					Stencil selbst vergleicht per Referenz: gleiche Referenz löst keinen <code>@Watch</code> aus, eine neue
					Referenz schon.
				</p>
				<p>
					In <code>kol-table-stateful</code> hängt am <code>_headers</code>-Watcher{' '}
					<code>initializeSortFromHeaders()</code>. Die Methode setzt zuerst bedingungslos{' '}
					<code>this.sortData = []</code> und befüllt sie danach ausschließlich aus dem statischen{' '}
					<code>cell.sortDirection</code> der Header-Definition. Die per Klick aufgebaute Sortierung ist damit weg.
				</p>
				<p>
					Kommt zusätzlich ein neues <code>_data</code>-Array, feuert dessen Watcher{' '}
					<code>updateSortedData()</code> – jetzt mit leerem <code>sortData</code> – und die Zeilen stehen wieder in
					der Ausgangsreihenfolge. Deshalb wirkt es wie ein vollständiger Reset.
				</p>
				<p className="hint">
					Workaround: alle Objekt-Props (<code>_headers</code>, <code>_data</code>, <code>_pagination</code>,{' '}
					<code>_selection</code>, <code>_on</code>) memoizen. In Angular entspricht das dem Vermeiden von
					Objekt-Literalen und Methodenaufrufen im Template-Binding.
				</p>
			</section>

			<div className="scroll-space">
				<p>↓ Platz zum Scrollen ↓</p>
			</div>
		</div>
	);
}
