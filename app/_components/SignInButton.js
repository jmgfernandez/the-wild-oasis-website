import { signInAction } from "../_lib/actions";

function SignInButton() {
  return (
    // Wrapped button inside a form element to create a server action. This way auth flow remains on the server
    // *If we were to do onClick on the button, that would make it a client component
    <form action={signInAction}>
      <button className="flex items-center gap-6 text-lg border border-primary-300 px-10 py-4 font-medium">
        <img
          src="https://authjs.dev/img/providers/google.svg"
          alt="Google logo"
          height="24"
          width="24"
        />
        <span>Continue with Google</span>
      </button>
    </form>
  );
}

export default SignInButton;
