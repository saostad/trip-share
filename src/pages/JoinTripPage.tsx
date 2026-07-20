import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  arrayUnion,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type JoinState = 'loading' | 'error' | 'joining' | 'redirecting';

export function JoinTripPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState<JoinState>('loading');

  useEffect(() => {
    if (!user || !shareToken) return;

    async function joinTrip() {
      try {
        const tripsRef = collection(db, 'trips');
        const q = query(
          tripsRef,
          where('shareToken', '==', shareToken),
          limit(1)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setState('error');
          return;
        }

        const tripDoc = snapshot.docs[0];
        const tripData = tripDoc.data();
        const tripId = tripDoc.id;

        // If user is already owner, redirect directly
        if (user!.uid === tripData.ownerId) {
          navigate(`/trip/${tripId}`, { replace: true });
          return;
        }

        // If user is already a collaborator, redirect directly
        if (
          tripData.collaboratorIds &&
          tripData.collaboratorIds.includes(user!.uid)
        ) {
          navigate(`/trip/${tripId}`, { replace: true });
          return;
        }

        // Add user as collaborator
        setState('joining');
        await updateDoc(doc(db, 'trips', tripId), {
          collaboratorIds: arrayUnion(user!.uid),
        });

        // Save member profile for display
        await setDoc(doc(db, 'trips', tripId, 'members', user!.uid), {
          uid: user!.uid,
          displayName: user!.displayName,
          email: user!.email,
          photoURL: user!.photoURL,
        });

        toast.success('You have joined the trip!');
        navigate(`/trip/${tripId}`, { replace: true });
      } catch {
        setState('error');
      }
    }

    joinTrip();
  }, [user, shareToken, navigate]);

  if (state === 'loading' || state === 'joining' || state === 'redirecting') {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="animate-pulse space-y-4">
          <div className="mx-auto h-8 w-48 rounded bg-muted" />
          <div className="mx-auto h-4 w-64 rounded bg-muted" />
        </div>
        <p className="mt-6 text-muted-foreground">
          {state === 'joining' ? 'Joining trip...' : 'Loading...'}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-red-600">Invalid Link</h1>
      <p className="mt-4 text-muted-foreground">
        This link is invalid or has expired.
      </p>
      <p className="mt-2 text-muted-foreground">
        Please ask the trip owner for a new share link.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
