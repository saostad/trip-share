import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { useTour } from "@/components/tour/useTour";
import {
  CircleHelp,
  LogOut,
  Moon,
  Plane,
  RotateCcw,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

export interface HeaderUser {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface HeaderViewProps {
  user: HeaderUser | null;
  isAdmin: boolean;
  theme: "light" | "dark";
  buildCommit: string;
  buildTime: string;
  onToggleTheme: () => void;
  onSignOut: () => void;
  onReplayTour?: () => void;
}

function initialsFor(name: string | null): string {
  if (!name) return "?";
  return (
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

function formatBuildDate(buildTime: string): string {
  const date = new Date(buildTime);
  if (Number.isNaN(date.getTime())) return buildTime;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function HeaderLogo() {
  return (
    <Link
      to="/"
      className="flex items-center gap-2"
      aria-label="TripShare home"
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Plane className="size-4" aria-hidden />
      </span>
      <span className="text-xl font-bold text-foreground">TripShare</span>
    </Link>
  );
}

export function HeaderView({
  user,
  isAdmin,
  theme,
  buildCommit,
  buildTime,
  onToggleTheme,
  onSignOut,
  onReplayTour,
}: HeaderViewProps) {
  const initials = initialsFor(user?.displayName ?? null);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      <HeaderLogo />

      {user && (
        <div className="flex items-center gap-1">
          <Link
            to="/how-it-works"
            aria-label="How it works"
            className="relative inline-flex size-9 items-center justify-center rounded-full text-muted-foreground outline-none after:absolute after:-inset-1 after:content-[''] hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CircleHelp className="size-5" aria-hidden />
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="User menu"
              className="relative rounded-full outline-none after:absolute after:-inset-1.5 after:content-[''] focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Avatar size="default">
                <AvatarImage
                  src={user.photoURL ?? undefined}
                  alt={user.displayName ?? "User avatar"}
                />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8}>
              <DropdownMenuLabel>
                <div className="truncate text-sm font-medium">
                  {user.displayName ?? "Account"}
                </div>
                {user.email && (
                  <div className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </div>
                )}
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={onToggleTheme}>
                {theme === "dark" ? (
                  <Sun className="size-4" aria-hidden />
                ) : (
                  <Moon className="size-4" aria-hidden />
                )}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link to="/how-it-works" />}>
                <CircleHelp className="size-4" aria-hidden />
                How it works
              </DropdownMenuItem>
              {onReplayTour && (
                <DropdownMenuItem onClick={onReplayTour}>
                  <RotateCcw className="size-4" aria-hidden />
                  Replay welcome tour
                </DropdownMenuItem>
              )}
              {isAdmin && (
                <DropdownMenuItem render={<Link to="/admin" />}>
                  <ShieldCheck className="size-4" aria-hidden />
                  Admin
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Version {buildCommit} · {formatBuildDate(buildTime)}
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={onSignOut}>
                <LogOut className="size-4" aria-hidden />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </header>
  );
}

function buildInfo(): { commit: string; time: string } {
  const commit =
    typeof __BUILD_COMMIT__ !== "undefined" ? __BUILD_COMMIT__ : "local";
  const time =
    typeof __BUILD_TIME__ !== "undefined"
      ? __BUILD_TIME__
      : new Date().toISOString();
  return { commit, time };
}

export function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { openTour } = useTour();
  const navigate = useNavigate();
  const { commit, time } = buildInfo();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
      navigate("/login");
    } catch {
      toast.error("Failed to sign out");
    }
  };

  return (
    <HeaderView
      user={
        user
          ? {
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
            }
          : null
      }
      isAdmin={isAdmin}
      theme={theme}
      buildCommit={commit}
      buildTime={time}
      onToggleTheme={toggleTheme}
      onSignOut={handleSignOut}
      onReplayTour={openTour}
    />
  );
}
