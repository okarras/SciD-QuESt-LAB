type SiteLogoProps = {
  variant?: 'header' | 'footer';
};

export default function SiteLogo({ variant = 'header' }: SiteLogoProps) {
  return (
    <img
      src="/logo.png"
      alt="SciD-QuESt"
      className={`site-logo site-logo--${variant}`}
      width={271}
      height={80}
    />
  );
}
