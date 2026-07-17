import { Dialog, type DialogProps } from "./Dialog";

/** Semantic alias for Dialog with variant="sheet" — full-width bottom sheet on mobile, centered dialog from sm: up. */
export function BottomSheet(props: Omit<DialogProps, "variant">) {
  return <Dialog {...props} variant="sheet" />;
}
