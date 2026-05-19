import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSetAnnouncement,
  useAdminResetMachines,
  useAdminClearQueue,
  useGetAnnouncement,
  useGetMachines,
  useGetQueue,
  getGetMachinesQueryKey,
  getGetMachinesSummaryQueryKey,
  getGetQueueQueryKey,
  getGetAnnouncementQueryKey,
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ShieldCheck,
  RotateCcw,
  Trash2,
  Megaphone,
  X,
  WashingMachine,
  Users,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react";

const ADMIN_STORAGE_KEY = "pg_laundry_admin_session";

function getAdminSession(): string | null {
  return localStorage.getItem(ADMIN_STORAGE_KEY);
}

function saveAdminSession(code: string) {
  localStorage.setItem(ADMIN_STORAGE_KEY, code);
}

function clearAdminSession() {
  localStorage.removeItem(ADMIN_STORAGE_KEY);
}

export function Admin() {
  const savedCode = getAdminSession();
  const [isAuthenticated, setIsAuthenticated] = useState(!!savedCode);
  const [adminCode, setAdminCode] = useState(savedCode ?? "");
  const [codeInput, setCodeInput] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [loginError, setLoginError] = useState("");

  const queryClient = useQueryClient();

  const { data: announcement } = useGetAnnouncement({ query: { refetchInterval: 15000 } });
  const { data: machines } = useGetMachines({ query: { refetchInterval: 10000 } });
  const { data: queue } = useGetQueue({ query: { refetchInterval: 10000 } });

  const setAnnouncement = useSetAnnouncement();
  const resetMachines = useAdminResetMachines();
  const clearQueue = useAdminClearQueue();

  const [announcementText, setAnnouncementText] = useState("");

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetMachinesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMachinesSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetAnnouncementQueryKey() });
  };

  const handleLogin = () => {
    if (!codeInput.trim()) return;
    setAnnouncement.mutate(
      { data: { adminCode: codeInput, message: announcement?.message ?? null } },
      {
        onSuccess: () => {
          saveAdminSession(codeInput);
          setAdminCode(codeInput);
          setIsAuthenticated(true);
          setLoginError("");
          invalidateAll();
        },
        onError: () => {
          setLoginError("Incorrect admin code. Please try again.");
        },
      }
    );
  };

  const handleLogout = () => {
    clearAdminSession();
    setIsAuthenticated(false);
    setAdminCode("");
    setCodeInput("");
  };

  const handlePostAnnouncement = () => {
    if (!announcementText.trim()) return;
    setAnnouncement.mutate(
      { data: { adminCode, message: announcementText.trim() } },
      {
        onSuccess: () => {
          toast.success("Announcement posted. All users will see it.");
          setAnnouncementText("");
          invalidateAll();
        },
        onError: () => toast.error("Failed to post announcement."),
      }
    );
  };

  const handleClearAnnouncement = () => {
    setAnnouncement.mutate(
      { data: { adminCode, message: null } },
      {
        onSuccess: () => {
          toast.success("Announcement cleared.");
          invalidateAll();
        },
        onError: () => toast.error("Failed to clear announcement."),
      }
    );
  };

  const handleResetMachines = () => {
    resetMachines.mutate(
      { data: { adminCode } },
      {
        onSuccess: (result) => {
          toast.success(result.message);
          invalidateAll();
        },
        onError: () => toast.error("Failed to reset machines."),
      }
    );
  };

  const handleClearQueue = () => {
    clearQueue.mutate(
      { data: { adminCode } },
      {
        onSuccess: (result) => {
          toast.success(result.message);
          invalidateAll();
        },
        onError: () => toast.error("Failed to clear queue."),
      }
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] pb-6">
        <Card className="w-full max-w-sm p-6 space-y-5">
          <div className="flex flex-col items-center gap-3 mb-2">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold">Admin Panel</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Enter the admin code to continue
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Input
                type={showCode ? "text" : "password"}
                placeholder="Admin code"
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value);
                  setLoginError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="pr-10 font-mono"
                data-testid="input-admin-code"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowCode((s) => !s)}
              >
                {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {loginError && (
              <p className="text-sm text-destructive font-medium flex items-center gap-1">
                <Lock className="w-3 h-3" /> {loginError}
              </p>
            )}
            <Button
              className="w-full font-semibold"
              onClick={handleLogin}
              disabled={!codeInput.trim() || setAnnouncement.isPending}
              data-testid="button-admin-login"
            >
              {setAnnouncement.isPending ? "Verifying..." : "Enter Admin Panel"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const inUseCount = machines?.filter((m) => m.status === "in_use").length ?? 0;
  const brokenCount = machines?.filter((m) => m.status === "broken").length ?? 0;
  const queueCount = queue?.length ?? 0;
  const activeAnnouncement = announcement?.isActive ? announcement.message : null;

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight">Admin Panel</h2>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
          data-testid="button-admin-logout"
        >
          <Lock className="w-3 h-3" /> Sign out
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 flex flex-col items-center justify-center text-center">
          <WashingMachine className="w-4 h-4 text-amber-500 mb-1" />
          <span className="text-xl font-bold font-mono">{inUseCount}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">In Use</span>
        </Card>
        <Card className="p-3 flex flex-col items-center justify-center text-center">
          <AlertTriangle className="w-4 h-4 text-gray-400 mb-1" />
          <span className="text-xl font-bold font-mono">{brokenCount}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Broken</span>
        </Card>
        <Card className="p-3 flex flex-col items-center justify-center text-center">
          <Users className="w-4 h-4 text-blue-500 mb-1" />
          <span className="text-xl font-bold font-mono">{queueCount}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">In Queue</span>
        </Card>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-primary shrink-0" />
          <h3 className="font-semibold text-base">Maintenance Announcement</h3>
        </div>

        {activeAnnouncement && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-900 dark:text-amber-300">
            <Megaphone className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="flex-1 font-medium">{activeAnnouncement}</p>
            <button
              onClick={handleClearAnnouncement}
              className="text-amber-500 hover:text-amber-700 shrink-0"
              title="Clear announcement"
              data-testid="button-clear-announcement"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {!activeAnnouncement && (
          <p className="text-xs text-muted-foreground">No announcement is currently active.</p>
        )}

        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          rows={3}
          placeholder="e.g. Machine 3 will be under maintenance on Saturday 10am–2pm. Sorry for the inconvenience."
          value={announcementText}
          onChange={(e) => setAnnouncementText(e.target.value)}
          data-testid="input-announcement-text"
        />
        <Button
          className="w-full font-semibold"
          onClick={handlePostAnnouncement}
          disabled={!announcementText.trim() || setAnnouncement.isPending}
          data-testid="button-post-announcement"
        >
          <Megaphone className="w-4 h-4 mr-2" />
          {setAnnouncement.isPending ? "Posting..." : "Post Announcement"}
        </Button>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <WashingMachine className="w-4 h-4 text-primary shrink-0" />
          Machine Controls
        </h3>
        <p className="text-xs text-muted-foreground">
          Reset all machines to "Available". Clears all active sessions and timers.
        </p>
        <Button
          variant="outline"
          className="w-full font-semibold border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
          onClick={handleResetMachines}
          disabled={resetMachines.isPending}
          data-testid="button-reset-machines"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          {resetMachines.isPending ? "Resetting..." : "Reset All Machines"}
        </Button>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-primary shrink-0" />
          Queue Controls
        </h3>
        <p className="text-xs text-muted-foreground">
          Clear the entire waiting queue. All {queueCount} {queueCount === 1 ? "person" : "people"} will be removed.
        </p>
        <Button
          variant="outline"
          className="w-full font-semibold border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
          onClick={handleClearQueue}
          disabled={clearQueue.isPending || queueCount === 0}
          data-testid="button-clear-queue"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {clearQueue.isPending ? "Clearing..." : "Clear Waiting Queue"}
        </Button>
      </Card>
    </div>
  );
}
