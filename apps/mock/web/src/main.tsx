import { render } from "solid-js/web";

import { InstrumentMock } from "./mock-app";
import "./index.css";

const mount = document.getElementById("root");
if (!mount) {
  throw new Error('Lisca mock mount node "#root" was not found');
}

render(() => <InstrumentMock />, mount);
