# KoliBri 4.2.1 – Sortierung geht beim ersten Scrollen verloren

Minimal-Repro für einen Bug in `@public-ui/components` 4.2.1 (`kol-table-stateful`):
Eine per Klick gesetzte Spaltensortierung wird zurückgesetzt, sobald die React-Komponente
neu rendert – zum Beispiel beim ersten Scroll-Event.

## Start

```bash
npm install
npm run dev
```

## Icons

`@public-ui/theme-default` liefert die Icon-Fonts unter `assets/kolicons`, definiert in seiner
`package.json` aber nur `"."` als Export. Ein direkter Import
(`@public-ui/theme-default/assets/kolicons/style.css`) wird von Node/Vite deshalb blockiert.

Lösung in diesem Projekt: `scripts/copy-icons.mjs` kopiert die Fonts nach `public/`, eingebunden
über `<link rel="stylesheet" href="/kolicons/style.css">` in der `index.html`. Das Skript läuft
automatisch über `postinstall` und vor `dev` / `build`. Ohne diesen Schritt fehlen sämtliche
Icons: Sortier-Pfeile, Pagination-Chevrons, Select-Pfeil.

## Reproduktion

1. Auf die Spaltenüberschrift **Name** klicken → Tabelle ist sortiert, Sortier-Pfeil sichtbar.
2. **Die ganze Seite** scrollen (Mausrad, Cursor außerhalb der Tabelle).
3. Sortier-Pfeil und Datenreihenfolge springen in den Ausgangszustand zurück – ohne Klick,
   ohne Datenänderung.

> **Wichtig – häufigste Fehlerquelle beim Nachstellen:** Das Scrollen muss auf Seitenebene
> passieren. Innerhalb der Tabelle scrollt der interne `kol-table__scroll-container`, und
> `scroll`-Events bubbeln nicht. Dieses Scrollen erreicht den `window`-Listener also nie, es
> entsteht kein React-Rerender – und der Bug tritt nicht auf. Wer mit dem Cursor über der Tabelle
> scrollt, sieht das Problem nicht.

Im Debug-Log auf der Seite steht dann die Kette:
`Scroll-Event #1 → Rerender #2 (_headers: NEUE Referenz → @Watch feuert) → Tabelle: Sortierung – keine –`.

Die Zeile **„Sortierung laut DOM"** über der Tabelle liest den Zustand direkt aus dem Shadow DOM
aus – damit ist der Reset auch ohne Icons eindeutig sichtbar.

### Wenn das Scrollen nichts auslöst

Der Scroll ist nur der Auslöser für ein React-Rerender, nicht die Ursache. Der Button
**„Rerender ohne Scroll auslösen"** erzwingt dasselbe Rerender deterministisch – damit lässt sich
der Bug ohne Scroll-Event zeigen.

Im Debug-Log muss die Kette stehen:

```
Scroll-Event #1 → setState → React-Rerender
Rerender #2 — _headers: NEUE Referenz → @Watch feuert, _data: NEUE Referenz → @Watch feuert
Tabelle → Sortierung: – keine – | erste Zeile: ...
```

Fehlt die Zeile `Scroll-Event`, feuert der Scroll-Listener nicht (z. B. weil die Seite gar nicht
scrollt). Fehlt nur die letzte Zeile, wurde die Sortierung nicht zurückgesetzt.

Über die beiden Checkboxen lässt sich zwischen Bug- und Fix-Modus umschalten:

| Schalter | Wirkung |
| --- | --- |
| `_headers` instabil | Header-Objekt wird bei jedem Render neu erzeugt → Sortierzustand wird gelöscht |
| `_data` instabil | Datenarray wird bei jedem Render neu erzeugt → gelöschte Sortierung wird auch in den Zeilen sichtbar |
| beide aus | Fix-Modus: Sortierung überlebt beliebig viele Rerenders |

## Ursache

`@public-ui/react` schreibt in `attachProps` **alle** Props bei jedem Render ohne Vergleich
auf das Custom Element:

```js
node[name] = newProps[name];
```

Stencil vergleicht beim Setter per Referenz. Eine neue Objekt-Referenz löst also den
`@Watch` aus – auch wenn der Inhalt identisch ist.

In `kol-table-stateful` hängt am `_headers`-Watcher `initializeSortFromHeaders()`
(`dist/collection/components/table-stateful/shadow.js`):

```js
const applySort = (cells) => {
    this.sortData = [];                 // <— löscht den Laufzeit-Sortierzustand
    cells.forEach((cell) => {
        ...
        if (sortDirection === 'ASC' || sortDirection === 'DESC') { ... }
    });
};
```

`sortData` wird bedingungslos geleert und danach nur aus dem statischen `cell.sortDirection`
der Header-Definition wieder befüllt. Der per Klick aufgebaute Zustand (`changeCellSort()`)
ist damit weg.

Kommt zusätzlich ein neues `_data`-Array, feuert dessen Watcher `updateSortedData()` –
jetzt mit leerem `sortData` – und die Zeilen stehen wieder in der Ausgangsreihenfolge.
Deshalb wirkt es wie ein vollständiger Reset.

**Vorschlag für einen Fix in der Library:** in `initializeSortFromHeaders()` einen bereits
vorhandenen Laufzeit-Sortierzustand für weiterhin existierende Keys erhalten, statt
`sortData` bedingungslos zu leeren – bzw. den Watcher nur bei inhaltlicher Änderung der
Header greifen lassen.

## Workaround in der Anwendung

Alle Objekt-Props der Tabelle memoizen, damit die Referenz stabil bleibt:

```tsx
const headers = useMemo(() => buildHeaders(), []);
const data = useMemo(() => rows, [rows]);
const pagination = useMemo(() => ({ _page: 1, _pageSize: 25 }), []);

<KolTableStateful _headers={headers} _data={data} _pagination={pagination} ... />
```

Betroffen sind alle Objekt-Props: `_headers`, `_data`, `_dataFoot`, `_pagination`,
`_selection`, `_on`.

In Angular ist das Äquivalent, keine Objekt-Literale und keine Methodenaufrufe direkt im
Template-Binding zu verwenden (`[_headers]="headers"` mit einem Feld der Komponente statt
`[_headers]="{ horizontal: [...] }"` oder `[_headers]="buildHeaders()"`).

## Projektstruktur

```
src/
  main.tsx          KoliBri-Registrierung (Theme DEFAULT) + Mount, bewusst ohne StrictMode
  App.tsx           Seitengerüst, Schalter, Scroll-Listener
  TableSection.tsx  die Tabelle + stabile/instabile Props
  SortStatus.tsx    liest den Sortierzustand aus dem Shadow DOM und zeigt ihn im Klartext
  DebugLog.tsx      Log-Panel mit eigenem State
  logBus.ts         Mini-Event-Bus (Log darf die Tabelle nicht rerendern)
  data.ts           100 deterministische Dummy-Datensätze
  inspect.ts        Shadow-DOM-Traversal für Sortierzustand + erste Zeile
scripts/
  copy-icons.mjs    kopiert die Icon-Fonts des Themes nach public/
.github/workflows/
  deploy.yml        Build + Deployment nach GitHub Pages
verify.mjs          optionaler automatisierter Nachweis (Playwright)
```

`main.tsx` verzichtet absichtlich auf `<React.StrictMode>`: StrictMode rendert im
Dev-Modus doppelt und würde den Bug schon beim Mount auslösen. Für ein sauberes
„erst beim Scrollen" muss das erste Rerender vom Scroll-Event kommen.

## Als GitHub-Repo mit Pages-Demo veröffentlichen

Für ein Bug-Ticket reicht ein Repo-Link; mit GitHub Pages bekommen die Maintainer zusätzlich
eine klickbare Demo, ohne selbst etwas installieren zu müssen.

```bash
cd kolibri-table-sort-bug
git init -b main
git add .
git commit -m "KoliBri 4.2.1: KolTableStateful verliert Sortierung bei Rerender"

# mit GitHub CLI:
gh repo create kolibri-table-sort-bug --public --source=. --push

# oder klassisch:
# git remote add origin https://github.com/<user>/kolibri-table-sort-bug.git
# git push -u origin main
```

Danach einmalig im Repo: **Settings → Pages → Build and deployment → Source: „GitHub Actions"**.

Der Workflow `.github/workflows/deploy.yml` baut bei jedem Push auf `main` und veröffentlicht
nach `https://<user>.github.io/<repo-name>/`.

Wichtig dabei: Project Pages liegen in einem Unterpfad. Der Workflow setzt deshalb
`VITE_BASE_PATH=/<repo-name>/`, und `vite.config.ts` reicht das an `base` durch – sonst laden
weder die JS-Bundles noch die Icon-Fonts. Lokal bleibt `base` auf `/`, es ist also nichts
umzustellen.

## Automatisierter Nachweis (optional)

```bash
npm run build
npx vite preview --port 4173      # in einem zweiten Terminal
npm i -D playwright && npx playwright install chromium
node verify.mjs
```

Ausgabe:

```
===== Bug-Modus (instabile _headers/_data) =====
nach Klick Name : {"sort":"Name = ascending","firstRow":"AZ-2026-1020 | Abt, Clara | ..."}
nach 1. Scroll  : {"sort":"none","firstRow":"AZ-2026-4380 | Groß, Anna | ..."}
>>> SORTIERUNG VERLOREN

===== Fix-Modus (memoized) =====
nach Klick Name : {"sort":"Name = ascending","firstRow":"AZ-2026-1020 | Abt, Clara | ..."}
nach 1. Scroll  : {"sort":"Name = ascending","firstRow":"AZ-2026-1020 | Abt, Clara | ..."}
>>> Sortierung bleibt erhalten
```

## Versionen

| Paket | Version |
| --- | --- |
| `@public-ui/components` | 4.2.1 |
| `@public-ui/react` | 4.2.1 |
| `@public-ui/theme-default` | 4.2.1 |
| `react` / `react-dom` | 18.3.1 |
| `vite` | 5.4.11 |
