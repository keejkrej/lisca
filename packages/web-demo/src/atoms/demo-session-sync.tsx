import { RegistryProvider, useAtomSet, useAtomValue } from "@effect/atom-solid";
import { createEffect, onCleanup, type JSX } from "solid-js";

import { readDemoSession, writeDemoSession } from "../demo-session-idb";
import { ALIGNER_DEMO_SESSION_KEY, ANNOTATOR_DEMO_SESSION_KEY } from "../demo-session-keys";
import { useDebouncedEffect } from "../use-debounced-effect";
import {
  demoAlignUiAtom,
  createInitialDemoAlignUiState,
  mergeDemoAlignSession,
  selectDemoAlignSession,
  type DemoAlignSession,
} from "./demo-align-ui";
import {
  demoAnnotatorUiAtom,
  createInitialDemoAnnotatorUiState,
  mergeDemoAnnotatorSession,
  selectDemoAnnotatorSession,
  type DemoAnnotatorSession,
} from "./demo-annotator-ui";

export function DemoRegistryProvider(props: { children?: JSX.Element }) {
  return <RegistryProvider>{props.children}</RegistryProvider>;
}

function DemoAlignSessionSync(props: { persist: boolean }) {
  const state = useAtomValue(() => demoAlignUiAtom);
  const setState = useAtomSet(() => demoAlignUiAtom);
  const persistReadyRef = { current: !props.persist };

  createEffect(() => {
    if (!props.persist) return;
    let cancelled = false;
    void readDemoSession<DemoAlignSession>(ALIGNER_DEMO_SESSION_KEY).then((session) => {
      if (cancelled) return;
      if (session) {
        setState((current) => mergeDemoAlignSession(session, current));
      }
      persistReadyRef.current = true;
    });
    onCleanup(() => {
      cancelled = true;
    });
  });

  useDebouncedEffect(
    () => {
      if (!props.persist || !persistReadyRef.current) return;
      void writeDemoSession(ALIGNER_DEMO_SESSION_KEY, selectDemoAlignSession(state()));
    },
    () => [props.persist, state()],
  );

  return null;
}

function DemoAnnotatorSessionSync(props: { persist: boolean }) {
  const state = useAtomValue(() => demoAnnotatorUiAtom);
  const setState = useAtomSet(() => demoAnnotatorUiAtom);
  const persistReadyRef = { current: !props.persist };

  createEffect(() => {
    if (!props.persist) return;
    let cancelled = false;
    void readDemoSession<DemoAnnotatorSession>(ANNOTATOR_DEMO_SESSION_KEY).then((session) => {
      if (cancelled) return;
      if (session) {
        setState((current) => mergeDemoAnnotatorSession(session, current));
      }
      persistReadyRef.current = true;
    });
    onCleanup(() => {
      cancelled = true;
    });
  });

  useDebouncedEffect(
    () => {
      if (!props.persist || !persistReadyRef.current) return;
      void writeDemoSession(ANNOTATOR_DEMO_SESSION_KEY, selectDemoAnnotatorSession(state()));
    },
    () => [props.persist, state()],
  );

  return null;
}

function DemoAlignWorkspaceInit(props: { embedded: boolean }) {
  const setState = useAtomSet(() => demoAlignUiAtom);

  createEffect(() => {
    if (props.embedded) return;
    setState(createInitialDemoAlignUiState());
  });

  return null;
}

function DemoAnnotatorWorkspaceInit(props: { embedded: boolean }) {
  const setState = useAtomSet(() => demoAnnotatorUiAtom);

  createEffect(() => {
    if (props.embedded) return;
    setState(createInitialDemoAnnotatorUiState());
  });

  return null;
}

export function DemoAlignRoot(props: {
  persist?: boolean;
  embedded?: boolean;
  children?: JSX.Element;
}) {
  return (
    <DemoRegistryProvider>
      <DemoAlignWorkspaceInit embedded={props.embedded ?? false} />
      <DemoAlignSessionSync persist={props.persist ?? false} />
      {props.children}
    </DemoRegistryProvider>
  );
}

export function DemoAnnotatorRoot(props: {
  persist?: boolean;
  embedded?: boolean;
  children?: JSX.Element;
}) {
  return (
    <DemoRegistryProvider>
      <DemoAnnotatorWorkspaceInit embedded={props.embedded ?? false} />
      <DemoAnnotatorSessionSync persist={props.persist ?? false} />
      {props.children}
    </DemoRegistryProvider>
  );
}
