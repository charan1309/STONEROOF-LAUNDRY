import { Link, useLocation } from "wouter";
import { useUserIdentity } from "@/hooks/use-user-identity";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { WashingMachine, List, ShieldCheck, X, Megaphone } from "lucide-react";
import { useGetMachinesSummary, useGetQueue, useGetAnnouncement } from "@workspace/api-client-react";
import { toast } from "sonner";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, saveUser, isLoading } = useUserIdentity();
  const [location] = useLocation();

  const { data: summary } = useGetMachinesSummary({ query: { refetchInterval: 10000 } });
  const { data: queue } = useGetQueue({ query: { refetchInterval: 10000 } });
  const { data: announcement } = useGetAnnouncement({ query: { refetchInterval: 15000 } });

  const allBusy = summary ? summary.available === 0 : false;
  const activeAnnouncement = announcement?.isActive ? announcement.message : null;
  const [announcementDismissed, setAnnouncementDismissed] = useState<string | null>(null);
  const showBanner = !!activeAnnouncement && activeAnnouncement !== announcementDismissed;

  const notifiedRef = useRef(false);
  const prevAvailableRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user || !summary || !queue) return;

    const myPosition = queue.find(
      (e) => e.userName === user.name && e.userRoom === user.room
    );

    const justOpened =
      prevAvailableRef.current !== null &&
      prevAvailableRef.current === 0 &&
      summary.available > 0;

    if (myPosition && myPosition.position === 1 && summary.available > 0) {
      if (!notifiedRef.current || justOpened) {
        notifiedRef.current = true;
        toast.success(
          `A machine is free, ${user.name}! Head upstairs now — you're first in line.`,
          {
            duration: Infinity,
            id: "queue-your-turn",
            description: "Go to the dashboard and start your wash before someone else does.",
          }
        );
      }
    } else {
      if (notifiedRef.current && (summary.available === 0 || !myPosition || myPosition.position !== 1)) {
        notifiedRef.current = false;
        toast.dismiss("queue-your-turn");
      }
    }

    prevAvailableRef.current = summary.available;
  }, [summary, queue, user]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <OnboardingModal onSave={saveUser} />;
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background pb-16">
      {showBanner && (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-start gap-2 text-sm">
          <Megaphone className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="flex-1 font-medium leading-snug">{activeAnnouncement}</p>
          <button
            onClick={() => setAnnouncementDismissed(activeAnnouncement)}
            className="shrink-0 opacity-80 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
            data-testid="button-dismiss-banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b">
        <div className="px-4 h-14 flex items-center justify-between max-w-md mx-auto w-full">
          <div className="font-bold text-lg tracking-tight">PG Laundry Hub</div>
          <div className="bg-muted px-3 py-1 rounded-full text-xs font-medium text-muted-foreground shadow-sm">
            {user.name} &middot; Rm {user.room}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto p-4 flex flex-col">
        {children}
      </main>

      <nav className="fixed bottom-0 w-full bg-card border-t z-20 pb-safe">
        <div className="flex justify-around max-w-md mx-auto">
          <Link
            href="/"
            className={`flex flex-col items-center py-3 px-4 flex-1 transition-colors ${
              location === "/" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="nav-dashboard"
          >
            <WashingMachine className="h-5 w-5 mb-1" />
            <span className="text-[10px] font-medium">Dashboard</span>
          </Link>
          <Link
            href="/queue"
            className={`flex flex-col items-center py-3 px-4 flex-1 transition-colors relative ${
              location === "/queue" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="nav-queue"
          >
            <div className="relative">
              <List className="h-5 w-5 mb-1" />
              {allBusy && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>
            <span className="text-[10px] font-medium">Waiting Line</span>
          </Link>
          <Link
            href="/admin"
            className={`flex flex-col items-center py-3 px-4 flex-1 transition-colors ${
              location === "/admin" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="nav-admin"
          >
            <ShieldCheck className="h-5 w-5 mb-1" />
            <span className="text-[10px] font-medium">Admin</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

function OnboardingModal({
  onSave,
}: {
  onSave: (u: { name: string; room: string }) => void;
}) {
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && room.trim()) {
      onSave({ name: name.trim(), room: room.trim() });
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card p-6 rounded-xl shadow-lg border">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <WashingMachine className="h-8 w-8" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-2">Welcome to the Hub</h1>
        <p className="text-center text-muted-foreground mb-8 text-sm">
          A shared utility board for our washing machines. Check availability before you walk upstairs.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Your Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
              className="bg-background"
              data-testid="input-name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Room Number</label>
            <Input
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g. 101"
              className="bg-background"
              data-testid="input-room"
            />
          </div>
          <Button
            type="submit"
            className="w-full mt-6"
            disabled={!name.trim() || !room.trim()}
            data-testid="button-enter"
          >
            Enter Hub
          </Button>
        </form>
      </div>
    </div>
  );
}
