import { PropsWithChildren } from "react";

// Native platforms already render at their own real device size, so there's
// nothing to frame. The web-only phone-frame implementation lives in
// web-phone-frame.web.tsx (Metro picks it automatically for web builds).
export function WebPhoneFrame({ children }: PropsWithChildren) {
  return <>{children}</>;
}
