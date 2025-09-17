"use server";

import { revalidatePath } from "next/cache";
import { auth, signIn, signOut } from "./auth";
import { supabase } from "./supabase";
import { getBookings } from "./data-service";

// Server actions

// Intermediary function in order to call signIn from Auth.js on SignInButton component
export async function signInAction() {
  await signIn("google", { redirectTo: "/account" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

// form data automatically passed to the action via the formData API
// ❗Each input element should have a name attribute
export async function updateGuest(formData) {
  // 1)
  const session = await auth();
  if (!session) throw new Error("You must be logged in");
  // 👆 It's common practice in server actions to just throw errors than using a try-catch block

  const nationalID = formData.get("nationalID");
  const [nationality, countryFlag] = formData.get("nationality").split("%");

  // 2)
  if (!/^[A-Za-z0-9]{6,12}$/.test(nationalID))
    throw new Error("Please provide a valid national ID");

  const updateData = { nationalID, nationality, countryFlag };

  const { data, error } = await supabase
    .from("guests")
    .update(updateData)
    .eq("id", session.user.id);

  if (error) throw new Error("Guest could not be updated");

  // to revalidate router cache
  revalidatePath("/account/profile");
}

// When dealing with server actions:
// 1) Ensure user invoking server action has authorization to do so
// 2) Always treat all inputs as unsafe ~ validation
// 👆 See updateGuest function

export async function deleteReservation(bookingId) {
  const session = await auth();
  if (!session) throw new Error("You must be logged in");

  // The following 2 code blocks are to ensure guest can only delete bookings made with their Id
  const guestBookings = await getBookings(session.user.id);
  const guestBookingIds = guestBookings.map((booking) => booking.id);

  if (!guestBookingIds.includes(bookingId))
    throw new Error("You are not allowed to delete this booking");

  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", bookingId);

  if (error) throw new Error("Booking could not be deleted");

  revalidatePath("/account/reservations");
}
