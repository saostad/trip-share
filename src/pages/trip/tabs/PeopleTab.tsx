import { useEffect } from "react";
import { useLocation } from "react-router";
import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CollaboratorList } from "@/components/trip/CollaboratorList";
import { ShareLinkSection } from "@/components/trip/ShareLinkSection";
import {
  GroupsExplainer,
  MethodExplainer,
} from "@/components/trip/settlementExplainers";
import {
  normalizeSettlementMethod,
  settlementMethodLabel,
} from "@/lib/balances";
import type { Trip, UserProfile } from "@/types";
import { useTripPage } from "../useTripPage";

export interface PeopleTabViewProps {
  trip: Trip;
  members: Record<string, UserProfile>;
  myName: string | null;
  isOwner: boolean;
  isArchived: boolean;
  archiving: boolean;
  onEditTrip: () => void;
  onToggleArchive: () => void;
  onDeleteTrip: () => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function PeopleTabView({
  trip,
  members,
  myName,
  isOwner,
  isArchived,
  archiving,
  onEditTrip,
  onToggleArchive,
  onDeleteTrip,
}: PeopleTabViewProps) {
  const location = useLocation();

  useEffect(() => {
    if (location.hash === "#invite") {
      document.getElementById("invite")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [location.hash]);

  const method = normalizeSettlementMethod(trip.settlementMethod);
  const groupCount = (trip.settlementGroups ?? []).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Participants</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {trip.participants.map((name) => {
              const linked = trip.participantLinks?.[name] != null;
              return (
                <li
                  key={name}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-sm"
                >
                  <Avatar size="sm">
                    <AvatarFallback>{getInitials(name)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
                  {name === myName && <Badge variant="primary">You</Badge>}
                  {name !== myName && linked && <Badge variant="neutral">Linked</Badge>}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {trip.collaboratorIds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Who has access</CardTitle>
          </CardHeader>
          <CardContent>
            <CollaboratorList
              tripId={trip.id}
              collaboratorIds={trip.collaboratorIds}
              members={members}
              isOwner={isOwner && !isArchived}
              trip={trip}
            />
          </CardContent>
        </Card>
      )}

      {isOwner ? (
        <>
          <section id="invite" className="scroll-mt-20">
            <Card>
              <CardHeader>
                <CardTitle>Invite</CardTitle>
              </CardHeader>
              <CardContent>
                <ShareLinkSection trip={trip} />
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Trip settings</CardTitle>
              {!isArchived && (
                <Button variant="outline" size="sm" onClick={onEditTrip} className="gap-1.5">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit trip
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    How payments are suggested
                    <MethodExplainer />
                  </span>
                  <span className="text-right font-medium">
                    {settlementMethodLabel(method)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    Pay as a group (families, couples)
                    <GroupsExplainer />
                  </span>
                  <span className="font-medium tabular-nums">{groupCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-destructive">Danger zone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleArchive}
                  disabled={archiving}
                  className="gap-1.5"
                >
                  {isArchived ? (
                    <ArchiveRestore className="h-3.5 w-3.5" />
                  ) : (
                    <Archive className="h-3.5 w-3.5" />
                  )}
                  {archiving
                    ? isArchived
                      ? "Unarchiving..."
                      : "Archiving..."
                    : isArchived
                      ? "Unarchive"
                      : "Archive"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDeleteTrip}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Only the trip creator can change trip settings.
        </p>
      )}
    </div>
  );
}

export function PeopleTab() {
  const {
    trip,
    members,
    myName,
    isOwner,
    isArchived,
    archiving,
    openEditTrip,
    toggleArchive,
    openDeleteTrip,
  } = useTripPage();
  return (
    <PeopleTabView
      trip={trip}
      members={members}
      myName={myName}
      isOwner={isOwner}
      isArchived={isArchived}
      archiving={archiving}
      onEditTrip={openEditTrip}
      onToggleArchive={toggleArchive}
      onDeleteTrip={openDeleteTrip}
    />
  );
}
