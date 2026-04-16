import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  Button,
} from "lisca/shared/ui";

import { useRoiAnnotationContext } from "./RoiAnnotationContext";

export default function RoiAnnotationDiscardDialog() {
  const { discardConfirmOpen, setDiscardConfirmOpen, onClose } = useRoiAnnotationContext();

  return (
    <AlertDialog open={discardConfirmOpen} onOpenChange={setDiscardConfirmOpen}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard annotation changes?</AlertDialogTitle>
          <AlertDialogDescription>
            This frame has unsaved classification or segmentation edits.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose
            render={(
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs"
              />
            )}
          >
            Keep editing
          </AlertDialogClose>
          <AlertDialogClose
            onClick={() => {
              onClose();
            }}
            render={(
              <Button
                size="sm"
                className="h-8 px-3 text-xs"
              />
            )}
          >
            Discard
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
