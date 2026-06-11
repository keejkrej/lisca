import { RegistryProvider, useAtomSet, useAtomValue } from "@effect-atom/atom-react";
import { type ReactNode, useEffect, useRef } from "react";

import { readDemoSession, writeDemoSession } from "../demo-session-idb";
import { ALIGNER_DEMO_SESSION_KEY, ANNOTATOR_DEMO_SESSION_KEY } from "../demo-session-keys";
import { useDebouncedEffect } from "../use-debounced-effect";
import {
  demoAlignUiAtom,
  mergeDemoAlignSession,
  selectDemoAlignSession,
  type DemoAlignSession,
} from "./demo-align-ui";
import {
  demoAnnotatorUiAtom,
  mergeDemoAnnotatorSession,
  selectDemoAnnotatorSession,
  type DemoAnnotatorSession,
} from "./demo-annotator-ui";

export function DemoRegistryProvider({ children }: { children: ReactNode }) {
  return <RegistryProvider>{children}</RegistryProvider>;
}

function DemoAlignSessionSync({ persist }: { persist: boolean }) {
  const state = useAtomValue(demoAlignUiAtom);
  const setState = useAtomSet(demoAlignUiAtom);
  const persistReadyRef = useRef(!persist);

  useEffect(() => {
    if (!persist) return;
    let cancelled = false;
    void readDemoSession<DemoAlignSession>(ALIGNER_DEMO_SESSION_KEY).then((session) => {
      if (cancelled) return;
      if (session) {
        setState((current) => mergeDemoAlignSession(session, current));
      }
      persistReadyRef.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [persist, setState]);

  useDebouncedEffect(
    () => {
      if (!persist || !persistReadyRef.current) return;
      void writeDemoSession(ALIGNER_DEMO_SESSION_KEY, selectDemoAlignSession(state));
    },
    [persist, state],
  );

  return null;
}

function DemoAnnotatorSessionSync({ persist }: { persist: boolean }) {
  const state = useAtomValue(demoAnnotatorUiAtom);
  const setState = useAtomSet(demoAnnotatorUiAtom);
  const persistReadyRef = useRef(!persist);

  useEffect(() => {
    if (!persist) return;
    let cancelled = false;
    void readDemoSession<DemoAnnotatorSession>(ANNOTATOR_DEMO_SESSION_KEY).then((session) => {
      if (cancelled) return;
      if (session) {
        setState((current) => mergeDemoAnnotatorSession(session, current));
      }
      persistReadyRef.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [persist, setState]);

  useDebouncedEffect(
    () => {
      if (!persist || !persistReadyRef.current) return;
      void writeDemoSession(ANNOTATOR_DEMO_SESSION_KEY, selectDemoAnnotatorSession(state));
    },
    [persist, state],
  );

  return null;
}

export function DemoAlignRoot({
  persist = false,
  children,
}: {
  persist?: boolean;
  children: ReactNode;
}) {
  return (
    <DemoRegistryProvider>
      <DemoAlignSessionSync persist={persist} />
      {children}
    </DemoRegistryProvider>
  );
}

export function DemoAnnotatorRoot({
  persist = false,
  children,
}: {
  persist?: boolean;
  children: ReactNode;
}) {
  return (
    <DemoRegistryProvider>
      <DemoAnnotatorSessionSync persist={persist} />
      {children}
    </DemoRegistryProvider>
  );
}
