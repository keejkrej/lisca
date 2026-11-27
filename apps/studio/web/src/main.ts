import type { Router } from "@effect/ui";
import { BrowserRouter } from "@effect/ui/html";
import { HostFilePickerPort, LabelFreeClientPort, TaskCenterPort } from "@lisca/instrument";
import { createLiscaWebApp, type LiscaWebAppConfig } from "@lisca/web-app";
import { Layer } from "effect";

import { studioHostOperations } from "./api/studio-port";
import { studioLabelFreeClient } from "./components/label-free-references";
import { studioTaskCenterService } from "./components/studio-task-center";
import "./index.css";
import { StudioRoute } from "./navigation/studio-router";
import { StudioApp } from "./routes/__root";

createLiscaWebApp<Router.Services>({
  // `createLiscaWebApp` mounts `ShellThemeProvider`, `ShellServerProvider`, and `ShellWorkspaceProvider`
  // around `App`, satisfying `StudioApp`'s shared-context requirements at runtime.
  App: StudioApp as unknown as LiscaWebAppConfig<Router.Services>["App"],
  appId: "studio",
  probe: () => studioHostOperations.userHomeDirectory(),
  layer: Layer.mergeAll(
    BrowserRouter.layerHash({ routes: StudioRoute }),
    Layer.succeed(HostFilePickerPort, studioHostOperations),
    Layer.succeed(TaskCenterPort, studioTaskCenterService),
    Layer.succeed(LabelFreeClientPort, studioLabelFreeClient),
  ),
});
