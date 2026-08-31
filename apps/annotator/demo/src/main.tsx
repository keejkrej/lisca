import { ShellThemeProvider } from "@lisca/ui/shell";
import { render } from "solid-js/web";

import { AnnotatorDemo } from "./annotator-demo";
import "./index.css";

const mount = document.getElementById("root");
if (!mount) {
  throw new Error('Lisca demo app mount node "#root" was not found');
}

render(
  () => (
    <ShellThemeProvider appId="annotator">
      <AnnotatorDemo />
    </ShellThemeProvider>
  ),
  mount,
);
