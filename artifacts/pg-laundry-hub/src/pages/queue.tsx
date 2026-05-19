import { useGetQueue, useJoinQueue, useLeaveQueue, getGetQueueQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUserIdentity } from "@/hooks/use-user-identity";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { UserPlus, X, Clock, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function Queue() {
  const { data: queue, isLoading } = useGetQueue({ query: { refetchInterval: 10000 } });
  const { user } = useUserIdentity();
  const joinQueue = useJoinQueue();
  const leaveQueue = useLeaveQueue();
  const queryClient = useQueryClient();

  const handleJoin = () => {
    if (!user) return;
    
    // Check if already in queue
    const alreadyInLine = queue?.some(q => q.userName === user.name && q.userRoom === user.room);
    if (alreadyInLine) {
      toast("You're already in line.", { description: "Wait for your turn!" });
      return;
    }
    
    joinQueue.mutate({
      data: {
        userName: user.name,
        userRoom: user.room
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
        toast.success("Joined the line!");
      }
    });
  };

  const handleLeave = (id: string) => {
    leaveQueue.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
        toast.success("Left the line.");
      }
    });
  };

  const formatJoinTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-lg" />
        {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
      </div>
    );
  }

  const sortedQueue = queue?.slice().sort((a, b) => a.position - b.position) || [];
  const amIInLine = user ? sortedQueue.some(q => q.userName === user.name && q.userRoom === user.room) : false;

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Waiting Line</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <Users className="w-4 h-4" /> {sortedQueue.length} {sortedQueue.length === 1 ? 'person' : 'people'} waiting
          </p>
        </div>
        
        {!amIInLine && (
          <Button onClick={handleJoin} disabled={joinQueue.isPending} className="font-semibold shadow-sm">
            <UserPlus className="w-4 h-4 mr-2" /> Join Line
          </Button>
        )}
      </div>
      
      {sortedQueue.length === 0 ? (
        <Card className="p-8 text-center border-dashed bg-muted/30">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Clock className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Queue is empty</h3>
          <p className="text-muted-foreground text-sm">All machines may be free — check the dashboard!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedQueue.map((entry, idx) => {
            const isMe = user && entry.userName === user.name && entry.userRoom === user.room;
            
            return (
              <Card key={entry.id} className={`flex items-center justify-between p-4 transition-colors ${isMe ? 'border-primary/50 bg-primary/5 shadow-sm' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono text-sm ${idx === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    #{entry.position}
                  </div>
                  <div>
                    <p className="font-semibold text-base flex items-center gap-2">
                      {entry.userName} 
                      {isMe && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">You</span>}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>Room {entry.userRoom}</span>
                      <span>·</span>
                      <span>Joined at {formatJoinTime(entry.joinedAt)}</span>
                    </p>
                  </div>
                </div>
                
                {isMe && (
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleLeave(entry.id)}>
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
