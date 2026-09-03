# Instrument mock

Static paper-pane stand-in for **real app UI** (layout, type, elevation). Not a landing
demo and not a fake Tauri/host.

```sh
vp run dev:mock
```

Opens [http://localhost:5178](http://localhost:5178). Switch Align / Annotate / Result in
the top bar. Rails are inert. The sheet shows an ibidi sample (Align/Annotate) or
transfection analysis PNG fixtures (Result).

Landing **demos** (`apps/*/demo`, ports 5175–5177) stay a separate browser/marketing surface.
