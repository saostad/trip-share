import { useEffect, useRef, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { m } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { fadeSlideUp } from "@/lib/motion";
import type { Trip } from "@/types";

export interface TripShellViewProps {
  trip: Trip;
  isOwner: boolean;
  isArchived: boolean;
  header: ReactNode;
  tabs: ReactNode;
  fab: ReactNode;
  children: ReactNode;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function TripShellView({
  trip,
  isOwner,
  isArchived,
  header,
  tabs,
  fab,
  children,
}: TripShellViewProps) {
  const { pathname } = useLocation();
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
  }, []);
  return (
    <m.div
      variants={fadeSlideUp}
      initial="hidden"
      animate="show"
      className="min-h-screen bg-background"
    >
      {header}
      <div className="container mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Link
              to="/"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold">{trip.name}</h1>
            {isArchived && <Badge variant="warning">Archived</Badge>}
          </div>

          {isArchived && (
            <div className="mb-4 rounded-lg border border-warning/30 bg-warning/15 px-3 py-2.5 text-sm text-warning-foreground">
              This trip is archived. Expenses, payments, and trip settings cannot be changed.
              {isOwner && " You can unarchive it to allow edits again."}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <AvatarGroup className="-space-x-1">
                {trip.participants.slice(0, 5).map((participant) => (
                  <Avatar key={participant} size="sm">
                    <AvatarFallback>{getInitials(participant)}</AvatarFallback>
                  </Avatar>
                ))}
              </AvatarGroup>
              {trip.participants.length > 5 && (
                <span className="text-sm text-muted-foreground">
                  +{trip.participants.length - 5} more
                </span>
              )}
            </div>
          </div>
        </div>

        {tabs}
        <div className="pb-24 md:pb-0">
          <m.div
            key={pathname}
            variants={fadeSlideUp}
            initial={mountedRef.current ? "hidden" : false}
            animate="show"
          >
            {children}
          </m.div>
        </div>
      </div>
      {fab}
    </m.div>
  );
}
