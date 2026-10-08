const logoUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSN453N6mpAhn09UKYb6yIXeJS43lFNZ41j7YQtRNGHgbZONCxXKd-xog&s=10";

function Logo({ size = 'md', showText = true }) {
  return (
    <div className={`brand-logo brand-logo-${size}`}>
      <img src={logoUrl} alt="Logo Leñas y Sabores" className="brand-logo-img" />

      {showText && <span className="font-display brand-logo-text">Leñas &amp; Sabores</span>}
    </div>
  );
}

export default Logo;
