import { Link } from "react-router";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import type { Trip, TripRole } from "@/types";

interface TripCardProps {
  trip: Trip;
  role: TripRole;
}

const MAX_VISIBLE_AVATARS = 3;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatLastActivity(timestamp: Trip["updatedAt"]): string {
  if (!timestamp) return "";
  const date =
    typeof timestamp.toDate === "function" ? timestamp.toDate() : new Date();
  return formatDistanceToNow(date, { addSuffix: true });
}

export function TripCard({ trip, role }: TripCardProps) {
  const visibleParticipants = trip.participants.slice(0, MAX_VISIBLE_AVATARS);
  const remainingCount = trip.participants.length - MAX_VISIBLE_AVATARS;
  const isArchived = Boolean(trip.archived);

  return (
    <Link to={`/trip/${trip.id}`} className="block">
      <Card
        className={`rounded-xl shadow-sm transition-shadow hover:shadow-md ${
          isArchived ? "opacity-80" : ""
        }`}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="truncate">{trip.name}</CardTitle>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
              {isArchived && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                  Archived
                </span>
              )}
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  role === "owner"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                }`}
              >
                {role === "owner" ? "Owner" : "Collaborator"}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AvatarGroup>
              {visibleParticipants.map((name) => (
                <Avatar key={name} size="sm">
                  <AvatarFallback>{getInitials(name)}</AvatarFallback>
                </Avatar>
              ))}
              {remainingCount > 0 && (
                <AvatarGroupCount>+{remainingCount}</AvatarGroupCount>
              )}
            </AvatarGroup>
            <span className="text-xs text-muted-foreground">
              {trip.participants.length}{" "}
              {trip.participants.length === 1 ? "participant" : "participants"}
            </span>
          </div>
          {trip.updatedAt && (
            <p className="text-xs text-muted-foreground">
              {formatLastActivity(trip.updatedAt)}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
