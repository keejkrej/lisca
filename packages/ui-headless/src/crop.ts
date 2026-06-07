export type CropConfirmContent = {
  title: string;
  description: string;
  existingList?: string;
  showSkipExisting: boolean;
  onCancel: () => void;
  onSkipExisting?: () => void;
  onOverwrite: () => void;
};

export function cropConfirmCopy(options: {
  existingCount: number;
  totalCount: number;
  singlePosition?: number;
}): Pick<CropConfirmContent, "title" | "description" | "showSkipExisting"> {
  if (options.singlePosition != null) {
    return {
      title: "ROI output already exists",
      description: `roi/Pos${options.singlePosition} already exists. Overwrite the existing cropped ROI files for this position?`,
      showSkipExisting: false,
    };
  }
  return {
    title: "ROI output already exists",
    description: `${options.existingCount} of ${options.totalCount} saved positions already have ROI output. Overwrite those folders or skip them and crop only the remaining positions.`,
    showSkipExisting: true,
  };
}
