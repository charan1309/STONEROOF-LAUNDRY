import { useState, useEffect, useRef } from "react";
import { useGetMachines, useUpdateMachine, useGetMachinesSummary, getGetMachinesQueryKey, getGetMachinesSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUserIdentity } from "@/hooks/use-user-identity";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Clock, CheckCircle2, Play, WashingMachine, BellRing, Trash2, Wrench } from "lucide-react";
import { Machine } from "@workspace/api-client-react/src/generated/api.schemas";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const MACHINE_TYPES: Record<number, string> = {
  1: "Top Load",
  2: "Top Load",
  3: "Front Load",
  4: "Front Load",
  5: "Top Load (Heavy Duty)",
};

const MACHINE_PINS: Record<number, string> = {
  1: "111", 2: "222", 3: "333", 4: "444", 5: "555",
};

const GRACE_PERIOD_MS = 2 * 60 * 1000;

const CLEARED_ALERTS_KEY = "pg_laundry_cleared_alerts";

function getClearedAlerts(): { machineId: number; clearedBy: string; seenAt: number }[] {
  try {
    const raw = localStorage.getItem(CLEARED_ALERTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addClearedAlert(machineId: number, clearedBy: string) {
  const alerts = getClearedAlerts();
  alerts.push({ machineId, clearedBy, seenAt: Date.now() });
  localStorage.setItem(CLEARED_ALERTS_KEY, JSON.stringify(alerts));
}

function removeClearedAlert(machineId: number) {
  const alerts = getClearedAlerts().filter((a) => a.machineId !== machineId);
  localStorage.setItem(CLEARED_ALERTS_KEY, JSON.stringify(alerts));
}

export function Dashboard() {
  const { data: machines, isLoading } = useGetMachines({ query: { refetchInterval: 10000 } });
  const { data: summary } = useGetMachinesSummary({ query: { refetchInterval: 10000 } });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const sortedMachines = Array.isArray(machines) ? machines.slice().sort((a, b) => a.id - b.id) : [];

  return (
    <div className="space-y-6 pb-6">
      {summary && (
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3 bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-green-700 dark:text-green-400 font-mono">{summary.available}</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Available</span>
          </Card>
          <Card className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-amber-700 dark:text-amber-400 font-mono">{summary.inUse}</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">In Use</span>
          </Card>
          <Card className="p-3 bg-gray-50/50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-gray-700 dark:text-gray-400 font-mono">{summary.broken}</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Broken</span>
          </Card>
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold tracking-tight">Machines</h2>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" /> Live
        </div>
      </div>

      <div className="space-y-4">
        {sortedMachines.map((m) => (
          <MachineCard key={m.id} machine={m} />
        ))}
      </div>
    </div>
  );
}

function MachineCard({ machine }: { machine: Machine }) {
  const queryClient = useQueryClient();
  const updateMachine = useUpdateMachine();
  const { user } = useUserIdentity();

  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [msSinceExpiry, setMsSinceExpiry] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [clearedAlert, setClearedAlert] = useState<{ clearedBy: string } | null>(null);

  const isAvailable = machine.status === "available";
  const isInUse = machine.status === "in_use";
  const isBroken = machine.status === "broken";
  const type = MACHINE_TYPES[machine.id] || "Washing Machine";

  const isOwner =
    isInUse &&
    user &&
    machine.currentUserName === user.name &&
    machine.currentUserRoom === user.room;

  const gracePeriodElapsed = isTimeUp && msSinceExpiry >= GRACE_PERIOD_MS;
  const showMarkEmptyToOthers = isInUse && isTimeUp && gracePeriodElapsed && !isOwner;
  const showMarkEmptyToOwner = isInUse && isOwner;

  const ownerExpiredRef = useRef(false);

  useEffect(() => {
    if (isInUse && machine.sessionEndTime) {
      const endTime = new Date(machine.sessionEndTime).getTime();

      const updateTimer = () => {
        const now = Date.now();
        const diff = endTime - now;
        if (diff <= 0) {
          setTimeLeft(0);
          setIsTimeUp(true);
          setMsSinceExpiry(now - endTime);

          if (isOwner && !ownerExpiredRef.current) {
            ownerExpiredRef.current = true;
            toast.warning("Your wash is done! Please collect your clothes.", {
              duration: Infinity,
              id: `wash-done-${machine.id}`,
            });
          }
        } else {
          setTimeLeft(diff);
          setIsTimeUp(false);
          setMsSinceExpiry(0);
          ownerExpiredRef.current = false;
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(0);
      setIsTimeUp(false);
      setMsSinceExpiry(0);
      ownerExpiredRef.current = false;
    }
  }, [isInUse, machine.sessionEndTime, isOwner, machine.id]);

  useEffect(() => {
    if (!isInUse && user) {
      const alerts = getClearedAlerts();
      const alert = alerts.find((a) => a.machineId === machine.id);
      if (alert) {
        setClearedAlert({ clearedBy: alert.clearedBy });
      }
    } else {
      setClearedAlert(null);
    }
  }, [isInUse, machine.id, user]);

  const dismissClearedAlert = () => {
    removeClearedAlert(machine.id);
    setClearedAlert(null);
  };

  const handleMarkEmpty = (clearedByOther: boolean) => {
    const ownerName = machine.currentUserName || "the previous user";

    updateMachine.mutate(
      {
        id: machine.id,
        data: {
          status: "available",
          currentUserName: null,
          currentUserRoom: null,
          sessionEndTime: null,
          durationMinutes: null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMachinesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMachinesSummaryQueryKey() });

          if (clearedByOther && user) {
            addClearedAlert(machine.id, user.name);
            toast.success("Clothes cleared. Machine is now free for use.");
          } else {
            toast.dismiss(`wash-done-${machine.id}`);
            toast.success("Machine marked as empty and ready for the next person.");
          }
        },
      }
    );
  };

  const handleReportIssue = () => {
    updateMachine.mutate(
      { id: machine.id, data: { status: "broken" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMachinesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMachinesSummaryQueryKey() });
        },
      }
    );
  };

  const handleFixMachine = () => {
    updateMachine.mutate(
      { id: machine.id, data: { status: "available" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMachinesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMachinesSummaryQueryKey() });
        },
      }
    );
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatGrace = (ms: number) => {
    const remaining = Math.max(0, GRACE_PERIOD_MS - ms);
    const s = Math.ceil(remaining / 1000);
    return s > 60 ? `${Math.ceil(s / 60)}m` : `${s}s`;
  };

  const durationMs = (machine.durationMinutes || 0) * 60 * 1000;
  const progressPercent =
    durationMs > 0 ? Math.min(100, Math.max(0, (timeLeft / durationMs) * 100)) : 0;

  return (
    <Card
      data-testid={`card-machine-${machine.id}`}
      className={`overflow-hidden transition-all duration-300 border-l-4 ${
        isAvailable
          ? "border-l-green-500"
          : isInUse
          ? isTimeUp
            ? "border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
            : "border-l-amber-500"
          : "border-l-gray-400 bg-muted/30"
      }`}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-bold text-lg">{machine.name}</h3>
            <p className="text-xs text-muted-foreground">{type}</p>
          </div>

          <Badge
            variant="outline"
            className={
              isAvailable
                ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400"
                : isInUse
                ? isTimeUp
                  ? "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400 animate-pulse"
                  : "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-400"
                : "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400"
            }
          >
            {isAvailable && <CheckCircle2 className="w-3 h-3 mr-1" />}
            {isInUse && <Clock className="w-3 h-3 mr-1" />}
            {isBroken && <AlertCircle className="w-3 h-3 mr-1" />}
            {isAvailable ? "Available" : isInUse ? (isTimeUp ? "Time's Up" : "In Use") : "Broken"}
          </Badge>
        </div>

        {clearedAlert && (
          <div className="mb-3 flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-sm text-blue-800 dark:text-blue-300">
            <BellRing className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1">
              Your clothes on this machine were cleared by <strong>{clearedAlert.clearedBy}</strong>.
            </div>
            <button
              onClick={dismissClearedAlert}
              className="text-blue-500 hover:text-blue-700 text-xs underline shrink-0"
              data-testid={`dismiss-cleared-alert-${machine.id}`}
            >
              Dismiss
            </button>
          </div>
        )}

        {isInUse && (
          <div className="mb-4 bg-muted/50 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">
                {machine.currentUserName}
                <span className="text-muted-foreground font-normal"> · Rm {machine.currentUserRoom}</span>
                {isOwner && (
                  <span className="ml-1 text-xs font-semibold text-primary">(You)</span>
                )}
              </span>
              <span
                className={`font-mono font-bold ${
                  isTimeUp ? "text-orange-500 animate-pulse" : ""
                }`}
              >
                {isTimeUp ? "Time's Up!" : formatTime(timeLeft)}
              </span>
            </div>
            {!isTimeUp && (
              <div className="h-2 w-full bg-secondary/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}

            {isOwner && isTimeUp && (
              <div className="mt-2 flex items-center gap-2 rounded-md bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 px-3 py-2 text-sm text-orange-800 dark:text-orange-300">
                <BellRing className="w-4 h-4 shrink-0 animate-pulse" />
                <span>Your wash is done! Please collect your clothes.</span>
              </div>
            )}

            {!isOwner && isTimeUp && !gracePeriodElapsed && (
              <div className="mt-2 text-xs text-muted-foreground text-center">
                Others can clear in {formatGrace(msSinceExpiry)}
              </div>
            )}
          </div>
        )}

        {isBroken && (
          <div className="mb-4 text-sm text-muted-foreground">
            This machine is currently out of order.
          </div>
        )}

        <div className="flex items-center gap-2 mt-4">
          {isAvailable && (
            <Button
              className="flex-1 font-semibold"
              onClick={() => setDrawerOpen(true)}
              data-testid={`button-start-wash-${machine.id}`}
            >
              <Play className="w-4 h-4 mr-2" /> Start My Wash
            </Button>
          )}

          {showMarkEmptyToOwner && (
            <Button
              variant="secondary"
              className="flex-1 font-semibold"
              onClick={() => handleMarkEmpty(false)}
              disabled={updateMachine.isPending}
              data-testid={`button-mark-empty-owner-${machine.id}`}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Mark Empty / Clear Clothes
            </Button>
          )}

          {showMarkEmptyToOthers && (
            <Button
              variant="outline"
              className="flex-1 font-semibold border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400"
              onClick={() => handleMarkEmpty(true)}
              disabled={updateMachine.isPending}
              data-testid={`button-mark-empty-others-${machine.id}`}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Clear Clothes
            </Button>
          )}

          {isInUse && !isOwner && !gracePeriodElapsed && (
            <div className="flex-1 text-center text-xs text-muted-foreground py-2">
              Wash in progress
            </div>
          )}

          {!isBroken ? (
            <Button
              variant="ghost"
              size="sm"
              className="px-3 text-muted-foreground hover:text-destructive"
              onClick={handleReportIssue}
              data-testid={`button-report-issue-${machine.id}`}
            >
              <AlertCircle className="w-4 h-4 mr-1" /> Report
            </Button>
          ) : (
            <Button
              variant="outline"
              className="flex-1 border-gray-300"
              onClick={handleFixMachine}
              data-testid={`button-fix-machine-${machine.id}`}
            >
              <Wrench className="w-4 h-4 mr-2" /> Fix Machine
            </Button>
          )}
        </div>
      </div>

      <StartWashDrawer
        machine={machine}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        pin={MACHINE_PINS[machine.id]}
      />
    </Card>
  );
}

function StartWashDrawer({
  machine,
  open,
  onOpenChange,
  pin,
}: {
  machine: Machine;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  pin: string;
}) {
  const { user } = useUserIdentity();
  const updateMachine = useUpdateMachine();
  const queryClient = useQueryClient();

  const [duration, setDuration] = useState("45");
  const [enteredPin, setEnteredPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setEnteredPin("");
      setError("");
      setDuration("45");
    }
  }, [open]);

  const handleSubmit = () => {
    if (enteredPin !== pin) {
      setError("Incorrect PIN for this machine.");
      return;
    }
    if (!user) return;

    const durationMins = parseInt(duration, 10);
    const endTime = new Date(Date.now() + durationMins * 60 * 1000).toISOString();

    updateMachine.mutate(
      {
        id: machine.id,
        data: {
          status: "in_use",
          currentUserName: user.name,
          currentUserRoom: user.room,
          durationMinutes: durationMins,
          sessionEndTime: endTime,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMachinesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMachinesSummaryQueryKey() });
          onOpenChange(false);
          toast.success(`Wash started! ${durationMins} min cycle on ${machine.name}.`);
        },
      }
    );
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Start Wash — {machine.name}</DrawerTitle>
            <DrawerDescription>
              Select your cycle duration and enter the machine PIN.
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cycle Duration</label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger data-testid="select-duration">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Machine PIN</label>
              <Input
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value);
                  setError("");
                }}
                placeholder="Enter 3-digit PIN"
                maxLength={3}
                type="number"
                pattern="[0-9]*"
                className="font-mono text-center tracking-widest text-lg"
                data-testid="input-machine-pin"
              />
              {error && (
                <p className="text-sm text-destructive font-medium" data-testid="text-pin-error">
                  {error}
                </p>
              )}
            </div>
          </div>
          <DrawerFooter>
            <Button
              onClick={handleSubmit}
              disabled={enteredPin.length !== 3 || updateMachine.isPending}
              data-testid="button-confirm-start"
            >
              {updateMachine.isPending ? "Starting..." : "Confirm & Start"}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
