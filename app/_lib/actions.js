"use server";

import { revalidatePath } from "next/cache";
import { auth, signIn, signOut } from "./auth";
import { supabase } from "./supabase";
import { getBooking, getBookings } from "./data-service";
import { redirect } from "next/navigation";

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

export async function createBooking(bookingData, formData) {
  const session = await auth();
  if (!session) throw new Error("You must be logged in");

  // If we had lots of formData
  // Object.entries(formData.entries());

  const newBooking = {
    ...bookingData,
    guestId: session.user.id,
    numGuests: Number(formData.get("numGuests")),
    observations: formData.get("observations").slice(0, 1000),
    extrasPrice: 0,
    totalPrice: bookingData.cabinPrice,
    status: "unconfirmed",
    isPaid: false,
    hasBreakfast: false,
  };

  const { error } = await supabase.from("bookings").insert([newBooking]);

  if (error) throw new Error("Booking could not be created");

  revalidatePath(`/cabins/${bookingData.cabinId}`);

  redirect("/cabins/thankyou");
}

export async function deleteBooking(bookingId) {
  // For testing of useOptimistic hook 👇
  // await new Promise((res) => setTimeout(res, 2000));
  // throw new Error();

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

export async function updateBooking(formData) {
  const session = await auth();
  if (!session) throw new Error("You must be logged in");

  const bookingId = Number(formData.get("bookingId"));
  const booking = await getBooking(bookingId);

  if (booking.guestId !== session.user.id)
    throw new Error("You are not allowed to edit this booking");

  // Jonas' way of authorization
  // const guestBookings = await getBookings(session.user.id);
  // const guestBookingIds = guestBookings.map((booking) => booking.id);

  // if (!guestBookingIds.includes(bookingId))
  //   throw new Error("You are not allowed to edit this booking");

  // My way of creating the updateData object, should have converted numGuests to a number
  // const numGuests = formData.get("numGuests");
  // const observations = formData.get("observations");
  // const updateData = { numGuests, observations };

  const updateData = {
    numGuests: Number(formData.get("numGuests")),
    observations: formData.get("observations").slice(0, 1000),
  };

  const { error } = await supabase
    .from("bookings")
    .update(updateData)
    .eq("id", bookingId);

  if (error) throw new Error("Booking could not be updated");

  revalidatePath("/account/reservations");
  revalidatePath(`/account/reservations/edit/${bookingId}`);
  redirect("/account/reservations");
}
