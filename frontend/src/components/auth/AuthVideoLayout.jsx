import { forwardRef, useEffect, useRef } from "react";

const AUTH_BACKGROUND_MP4 =
  "https://pybrgtwclllhaanexose.supabase.co/storage/v1/object/public/myaong/asset/CalicoCatSwap_logo_removed.mp4";
export const AuthVideoLayout = forwardRef(function AuthVideoLayout(
  { children, className = "" },
  forwardedRef,
) {
  const videoRef = useRef(null);

  useEffect(() => {
    videoRef.current?.play?.().catch(() => {
      /* Decorative video: keep the warm fallback visible if autoplay fails. */
    });
  }, []);

  return (
    <div ref={forwardedRef} className={`auth-page ${className}`}>
      <video
        ref={videoRef}
        className="auth-background-video"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      >
        <source src="/videos/auth-background.webm" type="video/webm" />
        <source src={AUTH_BACKGROUND_MP4} type="video/mp4" />
        <source src="/videos/auth-background.mp4" type="video/mp4" />
      </video>
      <div className="auth-background-overlay" />
      <main className="auth-content">{children}</main>
    </div>
  );
});

export default AuthVideoLayout;
