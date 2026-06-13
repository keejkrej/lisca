import { AnnotatePage } from "../src/components/annotate-page";
import { AnnotatePageProvider } from "../src/state/annotate-page-context";

export default function IndexRoute() {
  return (
    <AnnotatePageProvider>
      <AnnotatePage />
    </AnnotatePageProvider>
  );
}
