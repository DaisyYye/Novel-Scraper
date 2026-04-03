import { SignUp } from "@clerk/clerk-react";

export function SignUpPage() {
  return (
    <SignUp
      path="/sign-up"
      routing="path"
      signInUrl="/sign-in"
      fallbackRedirectUrl="/"
    />
  );
}
