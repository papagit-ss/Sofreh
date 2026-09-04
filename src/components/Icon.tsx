type IconName =
  | "home" | "book" | "fridge" | "cart" | "heart" | "heartFill" | "search" | "clock" | "flame" | "check"
  | "x" | "plus" | "minus" | "back" | "forward" | "chef" | "sparkles" | "help" | "list" | "trash" | "play"
  | "pause" | "refresh" | "users" | "wallet" | "filter" | "bell" | "copy" | "store" | "alert" | "leaf" | "chevronDown";

const PATHS: Record<IconName, string> = {
  home: "M3 11.5 12 4l9 7.5M5 10v10h5v-6h4v6h5V10",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19a2 2 0 0 1 2-2h13",
  fridge: "M6 3h12v18H6zM6 10h12M9 6v2M9 13v3",
  cart: "M3 4h2l2.5 11h11L21 7H7M9 20a1 1 0 1 0 0-.01M17 20a1 1 0 1 0 0-.01",
  heart: "M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z",
  heartFill: "M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.5-4.5",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  flame: "M12 3s5 4 5 10a5 5 0 0 1-10 0c0-2 1-3 1-3s1 2 2 2c0-4 2-9 2-9z",
  check: "M5 12l5 5L20 7",
  x: "M6 6l12 12M18 6 6 18",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  back: "M9 6l6 6-6 6",
  forward: "M15 6l-6 6 6 6",
  chef: "M8 21h8M9 17h6M7 10a4 4 0 0 1 .5-8A5 5 0 0 1 16.5 2 4 4 0 0 1 17 10v7H7z",
  sparkles: "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  play: "M7 5v14l12-7z",
  pause: "M7 5h4v14H7zM13 5h4v14h-4z",
  refresh: "M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5",
  users: "M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 20v-2a4 4 0 0 0-3-3.9M16 4.1a3.5 3.5 0 0 1 0 6.8",
  wallet: "M3 7a2 2 0 0 1 2-2h14v4M3 7v10a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2zM16 14h.01",
  filter: "M4 5h16l-6 8v6l-4-2v-4z",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 21h4",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
  store: "M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6",
  alert: "M12 9v4M12 17h.01M10.3 3.9 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  leaf: "M5 20c0-8 5-13 14-14-1 9-6 14-14 14zM5 20l7-7",
  chevronDown: "M6 9l6 6 6-6",
};

export function Icon({ name, className = "h-5 w-5", filled }: { name: IconName; className?: string; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled || name === "heartFill" || name === "play" ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
