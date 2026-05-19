import { useGetQueue, useJoinQueue, useLeaveQueue, getGetQueueQueryKey, useGetMachinesSummary } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUserIdentity } from "@/hooks/use-user-identity";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { UserPlus, X, Clock, Users, CheckCircle2, BellRing, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function Queue() {
  const { data: queue, isLoading: queueLoading } = useGetQueue({ query: { refetchInterval: 10000 } });
  const { data: summary, isLoading: summaryLoading } = useGetMachinesSummary({ query: { refetchInterval: 10000 } });
  const { user } = useUserIdentity();
  const joinQueue = useJoinQueue();
  const leaveQueue = useLeaveQueue();
  const queryClient = useQueryClient();

  const isLoading = queueLoading || summaryLoading;

  const allBusy = summary ? summary.available === 0 : false;
  const availableCount = summary?.available ?? 0;

  const sortedQueue = Array.isArray(queue) ? queue.slice().sort((a, b) => a.position - b.position) : [];
  const amIInLine = user ? sortedQueue.some((q) => q.userName === user.name && q.userRoom === user.room) : false;
  const myEntry = user ? sortedQueue.find((q) => q.userName === user.name && q.userRoom === user.room) : null;
  const imFirst = myEntry?.position === 1;
  const machineJustOpened = imFirst && availableCount > 0;

  const handleJoin = () => {
    if (!user) return;
    if (!allBusy) {
      toast.info("Machines are available right now — no need to wait!", {
        description: "Head to the dashboard and start your wash.",
      });
      return;
    }
    if (amIInLine) {
      toast("You're already in line.", { description: "Wait for your turn!" });
      return;
    }
    joinQueue.mutate(
      { data: { userName: user.name, userRoom: user.room } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
          toast.success("Joined the line! We'll alert you when a machine opens up.");
        },
      }
    );
  };

  const handleLeave = (id: string) => {
    leaveQueue.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
          toast.success("Left the line.");
        },
      }
    );
  };

  const formatJoinTime = (isoString: string) => {
    const d = new Date(isoString);
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-lg" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Waiting Line</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <Users className="w-4 h-4" />
            {sortedQueue.length} {sortedQueue.length === 1 ? "person" : "people"} waiting
          </p>
        </div>

        {!amIInLine ? (
          <Button
            onClick={handleJoin}
            disabled={joinQueue.isPending || !allBusy}
            className="font-semibold shadow-sm shrink-0"
            variant={allBusy ? "default" : "outline"}
            data-testid="button-join-queue"
          >
            {allBusy ? (
              <>
                <UserPlus className="w-4 h-4 mr-2" /> Join Line
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" /> Join Line
              </>
            )}
          </Button>
        ) : (
          <div className="text-xs text-primary font-semibold bg-primary/10 px-3 py-1.5 rounded-full">
            You're in line
          </div>
        )}
      </div>

      {!allBusy && (
        <Card className="p-4 border-green-200 dark:border-green-800 bg-green-50/60 dark:bg-green-950/20 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">
              {availableCount} machine{availableCount !== 1 ? "s are" : " is"} free right now
            </p>
            <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
              No need to wait — head to the dashboard and start your wash.
            </p>
          </div>
        </Card>
      )}

      {machineJustOpened && (
        <Card className="p-4 border-primary/40 bg-primary/5 flex items-start gap-3 animate-pulse">
          <BellRing className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-primary">
              You're next — a machine just opened up!
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Go to the dashboard quickly and start your wash.
            </p>
          </div>
        </Card>
      )}

      {allBusy && sortedQueue.length === 0 && (
        <Card className="p-8 text-center border-dashed bg-muted/30">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Clock className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-1">All machines are busy</h3>
          <p className="text-muted-foreground text-sm">
            Join the line and you'll be notified the moment a machine is free.
          </p>
        </Card>
      )}

      {!allBusy && sortedQueue.length === 0 && (
        <Card className="p-8 text-center border-dashed bg-muted/30">
          <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="font-semibold text-lg mb-1">No queue needed</h3>
          <p className="text-muted-foreground text-sm">
            Machines are available — check the dashboard and start your wash!
          </p>
        </Card>
      )}

      {sortedQueue.length > 0 && (
        <div className="space-y-3">
          {sortedQueue.map((entry, idx) => {
            const isMe = user && entry.userName === user.name && entry.userRoom === user.room;
            const isFirst = idx === 0;

            return (
              <Card
                key={entry.id}
                data-testid={`row-queue-${entry.id}`}
                className={`flex items-center justify-between p-4 transition-colors ${
                  isMe ? "border-primary/50 bg-primary/5 shadow-sm" : ""
                } ${isFirst && machineJustOpened ? "border-primary ring-1 ring-primary/30" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono text-sm shrink-0 ${
                      isFirst
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    #{entry.position}
                  </div>
                  <div>
                    <p className="font-semibold text-base flex items-center gap-2 flex-wrap">
                      {entry.userName}
                      {isMe && (
                        <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                          You
                        </span>
                      )}
                      {isFirst && machineJustOpened && (
                        <span className="text-[10px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold flex items-center gap-1">
                          <BellRing className="w-2.5 h-2.5" /> Your turn!
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>Room {entry.userRoom}</span>
                      <span>·</span>
                      <span>Joined {formatJoinTime(entry.joinedAt)}</span>
                    </p>
                  </div>
                </div>

                {isMe && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleLeave(entry.id)}
                    data-testid={`button-leave-queue-${entry.id}`}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
