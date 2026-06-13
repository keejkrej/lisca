import { useNavigation } from "expo-router";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { BackHandler } from "react-native";

import { useStudioProfile } from "./studio-profile-provider";
import {
  buildStudioAssayJson,
  isBasicInfoDirty,
  serializeBasicInfoSnapshot,
  useStudioStore,
} from "../state/studio-store";
import { assayJsonExists, writeStudioAssayJson } from "../utils/save-studio-assay";
import { recordStudioAssayMemory } from "../utils/studio-memory";
import { AssayOverwriteConfirmModal } from "./assay-overwrite-confirm-modal";
import { AssaySaveConfirmModal } from "./assay-save-confirm-modal";

type BasicInfoLeaveContextValue = {
  requestLeave: (onProceed: () => void) => void;
};

const BasicInfoLeaveContext = createContext<BasicInfoLeaveContextValue | null>(null);
const allowBasicInfoNavigationRef = { current: false };

export function StudioBasicInfoLeaveProvider({ children }: { children: ReactNode }) {
  const profile = useStudioProfile();
  const wizard = useStudioStore((state) => state);
  const { assayId, dataSourceKind, info1, info2, info3, setBasicInfoSavedSnapshot } = wizard;
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [overwriteOpen, setOverwriteOpen] = useState(false);
  const [pendingProceed, setPendingProceed] = useState<(() => void) | null>(null);

  const saveTo = info1.saveTo.trim();
  const dirty = isBasicInfoDirty(wizard);

  const closeAll = () => {
    setSaveOpen(false);
    setOverwriteOpen(false);
    setSaveError(null);
    setPendingProceed(null);
  };

  const proceed = () => {
    const next = pendingProceed;
    closeAll();
    next?.();
  };

  const saveAssay = async (overwrite: boolean) => {
    if (!assayId || !saveTo || saving) return false;
    setSaving(true);
    setSaveError(null);
    try {
      if (!overwrite && (await assayJsonExists(saveTo))) {
        setOverwriteOpen(true);
        return false;
      }
      const assayJson = buildStudioAssayJson({
        assayId,
        dataSourceKind,
        info1,
        info2,
        info3,
      });
      await writeStudioAssayJson(saveTo, assayJson);
      recordStudioAssayMemory(
        profile.session,
        `${saveTo.replace(/\/$/, "")}/assay.json`,
        assayJson.assayLabel,
        saveTo,
      );
      setBasicInfoSavedSnapshot(serializeBasicInfoSnapshot(wizard));
      return true;
    } catch (cause) {
      setSaveError(
        cause instanceof Error
          ? cause.message
          : "Could not save assay.json. Check the save path and try again.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const requestLeave = (onProceed: () => void) => {
    if (!dirty) {
      onProceed();
      return;
    }
    setPendingProceed(() => () => {
      allowBasicInfoNavigationRef.current = true;
      onProceed();
    });
    setSaveOpen(true);
  };

  return (
    <BasicInfoLeaveContext.Provider value={{ requestLeave }}>
      {children}
      <AssaySaveConfirmModal
        error={saveError}
        open={saveOpen && !overwriteOpen}
        saving={saving}
        onCancel={closeAll}
        onSave={() => void saveAssay(false).then((saved) => saved && proceed())}
        onSkip={proceed}
      />
      <AssayOverwriteConfirmModal
        open={overwriteOpen}
        saveTo={saveTo}
        onCancel={closeAll}
        onOverwrite={() =>
          void saveAssay(true).then((saved) => {
            setOverwriteOpen(false);
            if (saved) proceed();
          })
        }
      />
    </BasicInfoLeaveContext.Provider>
  );
}

export function useStudioBasicInfoLeave() {
  const value = useContext(BasicInfoLeaveContext);
  if (!value) {
    throw new Error("useStudioBasicInfoLeave must be used within StudioBasicInfoLeaveProvider");
  }
  return value;
}

export function useStudioBasicInfoRouteGuard() {
  const navigation = useNavigation();
  const { requestLeave } = useStudioBasicInfoLeave();
  const wizard = useStudioStore((state) => state);
  const dirty = isBasicInfoDirty(wizard);

  useEffect(() => {
    if (!dirty) return;
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (allowBasicInfoNavigationRef.current) {
        allowBasicInfoNavigationRef.current = false;
        return;
      }
      event.preventDefault();
      requestLeave(() => navigation.dispatch(event.data.action));
    });
    return unsubscribe;
  }, [dirty, navigation, requestLeave]);

  useEffect(() => {
    if (!dirty) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      requestLeave(() => {
        allowBasicInfoNavigationRef.current = true;
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      });
      return true;
    });
    return () => subscription.remove();
  }, [dirty, navigation, requestLeave]);
}
