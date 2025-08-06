import { useNavigate } from 'react-router-dom';
import symbol from '../assets/favicon2.png';

const NavigationHeader = () => {

  const navigate = useNavigate()
  return (
    <header className="bg-background/90 backdrop-blur-sm border-b border-border flex justify-between ">
      <div className="flex items-center gap-1 pt-2">
        <div className=" shadow-glow" onClick={() => navigate("/")}>
          <img 
            src={symbol}
            alt="Genius UGC Logo"
            className="h-12 w-12 object-contain ml-4"
          />
        </div>
        <div>
          <h1 className="font-bold text-lg">ProduktPix</h1>
          <p className="text-xs font-bold" style={{color: '#0C60FE'}}>Genius</p>
        </div>
      </div>
      
    </header>
  );
};

export default NavigationHeader;