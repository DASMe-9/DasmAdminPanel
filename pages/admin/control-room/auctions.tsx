import ControlRoomShell from "@/components/control-room/ControlRoomShell";
import { ControlRoomGate } from "@/components/control-room/ControlRoomGate";
import { AuctionsPanel } from "@/pages/auctions";

export default function ControlRoomAuctionsPage() {
  return (
    <ControlRoomGate>
      {(access) => (
        <ControlRoomShell access={access}>
          <AuctionsPanel />
        </ControlRoomShell>
      )}
    </ControlRoomGate>
  );
}
