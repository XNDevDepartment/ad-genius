import { useNavigate } from "react-router-dom";

const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-muted/30 border-t border-border py-6">
      <div className="container-responsive px-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
          <span>© 2024 ProduktPix Genius. All rights reserved.</span>
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
    </footer>
  );
};

export default Footer;