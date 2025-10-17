import { useNavigate } from "react-router-dom";

const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="py-8 bg-black">
      <div className="container-responsive px-4">
        <div className="flex flex-col items-center justify-center gap-6">
          {/* SaaS Fame Badge */}
          <a 
            href="https://saasfame.com/item/produktpix" 
            target="_blank" 
            rel="noopener noreferrer"
            className="transition-opacity hover:opacity-80"
          >
            <img 
              src="https://saasfame.com/badge-light.svg" 
              alt="Featured on saasfame.com" 
              className="h-[54px] w-auto" 
            />
          </a>

          {/* Footer Links */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
            <span>© 2025 ProduktPix Genius. All rights reserved.</span>
            <div className="flex gap-4">
              <button 
                onClick={() => navigate("/privacy")}
                className="hover:text-foreground transition-colors"
              >
                Privacy Policy
              </button>
              <button 
                onClick={() => navigate("/terms")}
                className="hover:text-foreground transition-colors"
              >
                Terms of Service
              </button>
              <button 
                onClick={() => navigate("/cookies")}
                className="hover:text-foreground transition-colors"
              >
                Cookie Policy
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;