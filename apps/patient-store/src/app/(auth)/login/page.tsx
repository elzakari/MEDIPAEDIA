import { redirect } from "next/navigation";

export default function PatientLoginRedirect() {
  redirect("/auth");
}
