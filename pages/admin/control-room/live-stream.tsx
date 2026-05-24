import ControlRoomShell from "@/components/control-room/ControlRoomShell";
import { ControlRoomGate } from "@/components/control-room/ControlRoomGate";
import { LiveStreamPanel } from "@/pages/live-stream";

export default function ControlRoomLiveStreamPage() {
  return (
    <ControlRoomGate>
      {(access) => (
        <ControlRoomShell access={access}>
          <LiveStreamPanel />
        </ControlRoomShell>
      )}
    </ControlRoomGate>
  );
}
