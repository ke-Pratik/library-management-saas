import { useEffect, useState } from "react";
import { getMySubscription } from "../services/api";

/**
 * Site-wide red banner shown ONLY when subscription is in GRACE_PERIOD.
 * Auto-hides when status changes to anything else.
 */
function GracePeriodBanner() {
  const [sub, setSub]         = useState(null);
  const [dismissed, setDismiss] = useState(false);

  useEffect(() => {
    getMySubscription()
      .then((res) => setSub(res.data))
      .catch(() => setSub(null));
  }, []);

  if (!sub || sub.status !== "GRACE_PERIOD" || dismissed) return null;

  const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

  return (
    <div className="alert alert-danger d-flex justify-content-between align-items-center rounded-0 mb-0 py-2 px-4">
      <div>
        ⚠️ <strong>Your subscription expired on {fmt(sub.expiredOn)}.</strong>{" "}
        You have <strong>{sub.graceDaysRemaining ?? 0} day{sub.graceDaysRemaining === 1 ? "" : "s"}</strong> left in your grace period.
        Please renew to avoid service interruption. <em className="text-muted">Contact your system administrator.</em>
      </div>
      <button
        type="button"
        className="btn-close btn-close-white"
        aria-label="Close"
        onClick={() => setDismiss(true)}
      />
    </div>
  );
}

export default GracePeriodBanner;
