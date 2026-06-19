import { forwardRef } from "react";

export const AuthVideoLayout = forwardRef(function AuthVideoLayout(
  { children, className = "" },
  forwardedRef,
) {
  return (
    <div ref={forwardedRef} className={`auth-page ${className}`}>
      <div className="auth-background-overlay" />
      <main className="auth-content">{children}</main>
    </div>
  );
});

export default AuthVideoLayout;
