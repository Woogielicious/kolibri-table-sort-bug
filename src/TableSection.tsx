import { useEffect, useMemo, useRef } from 'react';
import { KolTableStateful } from '@public-ui/react';
import type { KoliBriTableHeaderCellWithLogic } from '@public-ui/components';

import { ROW_COUNT, VORGAENGE, type Vorgang } from './data';
import { emitLog } from './logBus';

const PAGE_SIZE = 25;

/**
 * Erzeugt bei JEDEM Aufruf neue Objekt- und Function-Referenzen.
 * Ungememoized im Render aufgerufen ist das der Auslöser des Bugs.
 */
function buildHeaders(): { horizontal: KoliBriTableHeaderCellWithLogic[][] } {
	const text = (key: keyof Vorgang) => (a: Record<string, unknown>, b: Record<string, unknown>) =>
		String(a[key] ?? '').localeCompare(String(b[key] ?? ''), 'de');

	const num = (key: keyof Vorgang) => (a: Record<string, unknown>, b: Record<string, unknown>) =>
		Number(a[key] ?? 0) - Number(b[key] ?? 0);

	return {
		horizontal: [
			[
				{ key: 'aktenzeichen', label: 'Aktenzeichen', compareFn: text('aktenzeichen') },
				{ key: 'name', label: 'Name', compareFn: text('name') },
				{ key: 'referat', label: 'Referat', compareFn: text('referat') },
				{ key: 'ort', label: 'Ort', compareFn: text('ort') },
				{ key: 'betrag', label: 'Betrag (€)', textAlign: 'right', compareFn: num('betrag') },
				{ key: 'eingang', label: 'Eingang', compareFn: text('eingang') },
			],
		],
	};
}

type Props = {
	unstableHeaders: boolean;
	unstableData: boolean;
	/** ändert sich bei jedem Scroll-Event und erzwingt so ein Rerender */
	rerenderToken: number;
};

export function TableSection({ unstableHeaders, unstableData, rerenderToken }: Props) {
	const wrapperRef = useRef<HTMLDivElement>(null);
	const renderCountRef = useRef(0);
	renderCountRef.current += 1;

	/* ---------------------------------------------------------------- *
	 * Der React-Wrapper (@public-ui/react → attachProps) schreibt ALLE Props
	 * bei jedem Render per `node[name] = value` auf das Custom Element.
	 * Stencil vergleicht per Referenz:
	 *   gleiche Referenz -> kein @Watch
	 *   neue Referenz    -> @Watch feuert
	 * ---------------------------------------------------------------- */
	const memoHeaders = useMemo(() => buildHeaders(), []);
	const headers = unstableHeaders ? buildHeaders() : memoHeaders;

	const memoData = useMemo(() => VORGAENGE.map((row) => ({ ...row })), []);
	const data = unstableData ? VORGAENGE.map((row) => ({ ...row })) : memoData;

	// Pagination bleibt bewusst immer stabil: ein instabiles _pagination-Objekt
	// würde zusätzlich die aktuelle Seite auf 1 zurücksetzen und den Befund vermischen.
	const pagination = useMemo(() => ({ _page: 1, _pageSize: PAGE_SIZE, _pageSizeOptions: [10, 25, 50, 100] }), []);

	/* Jedes Rerender protokollieren ----------------------------------- */
	useEffect(() => {
		emitLog(
			'render',
			`Rerender #${renderCountRef.current} — _headers: ${unstableHeaders ? 'NEUE Referenz → @Watch feuert' : 'stabil'}, ` +
				`_data: ${unstableData ? 'NEUE Referenz → @Watch feuert' : 'stabil'}` +
				` [Rerender-Token ${rerenderToken}]`,
		);
	});

	return (
		<div ref={wrapperRef}>
			<KolTableStateful
				key={`${unstableHeaders}-${unstableData}`}
				_label={`Vorgänge (${ROW_COUNT} Einträge)`}
				_headers={headers}
				_data={data}
				_pagination={pagination}
				_paginationPosition="both"
			/>
		</div>
	);
}
