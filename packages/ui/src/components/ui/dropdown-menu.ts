import { Menu as KitMenu, MenuTrigger as KitMenuTrigger } from "@effect/ui-kit";

import { parsePlacement } from "./popover";

export { KitMenu as DropdownMenu, KitMenuTrigger as DropdownMenuTrigger, parsePlacement };

export const DROPDOWN_MENU_CONTENT_CLASS =
  "z-50 z-dropdown-menu-content z-menu-target min-w-32 origin-(--transform-origin) overflow-hidden outline-none";

export const DROPDOWN_MENU_ITEM_CLASS =
  "group/dropdown-menu-item relative z-dropdown-menu-item flex cursor-default select-none items-center outline-hidden data-disabled:pointer-events-none data-inset:pl-8 data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0";
