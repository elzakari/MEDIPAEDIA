import React from "react";
import { Badge } from "./badge";

export type PrescriptionStatus =
  | "PENDING"
  | "PARTIALLY_DISPENSED"
  | "DISPENSED"
  | "CANCELLED"
  | "EXPIRED";

export type EscrowStatus = "HELD" | "RELEASED" | "REFUNDED";

export function PrescriptionStatusBadge({
  status,
}: {
  status: PrescriptionStatus | string;
}) {
  switch (status) {
    case "PENDING":
      return <Badge variant="warning">Pending Dispense</Badge>;
    case "PARTIALLY_DISPENSED":
      return <Badge variant="cyan">Partially Dispensed</Badge>;
    case "DISPENSED":
      return <Badge variant="success">Dispensed</Badge>;
    case "CANCELLED":
      return <Badge variant="danger">Cancelled</Badge>;
    case "EXPIRED":
      return <Badge variant="secondary">Expired</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function EscrowStatusBadge({
  status,
}: {
  status: EscrowStatus | string;
}) {
  switch (status) {
    case "HELD":
      return <Badge variant="warning">Funds in Escrow</Badge>;
    case "RELEASED":
      return <Badge variant="success">Settled & Released</Badge>;
    case "REFUNDED":
      return <Badge variant="danger">Refunded</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
