import { Link } from "react-router";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
        className={`transition-all hover:-translate-y-0.5 hover:shadow-md ${
          isArchived ? "opacity-80" : ""
        }`}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="truncate">{trip.name}</CardTitle>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
              {isArchived && <Badge variant="warning">Archived</Badge>}
              <Badge variant={role === "owner" ? "primary" : "neutral"}>
                {role === "owner" ? "Created by you" : "Shared with you"}
              </Badge>
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
