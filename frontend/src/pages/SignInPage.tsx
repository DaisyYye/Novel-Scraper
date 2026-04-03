import { SignIn } from "@clerk/clerk-react";

export function SignInPage() {
  return (
    <SignIn
      path="/sign-in"
      routing="path"
      signUpUrl="/sign-up"
      fallbackRedirectUrl="/"
    />
  );
}
