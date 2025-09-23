
interface ArcadeEmbedProps {
  isFullscreen?: boolean;
}

export function ArcadeEmbed({ isFullscreen = false }: ArcadeEmbedProps) {
  const containerStyle = isFullscreen 
    ? { width: '100%', height: '100%' }
    : { position: 'relative' as const, paddingBottom: 'calc(54.10526315789473% + 41px)', height: 0, width: '100%' };
  
  const iframeStyle = isFullscreen
    ? { width: '100%', height: '100%', colorScheme: 'light' as const }
    : { position: 'absolute' as const, top: 0, left: 0, width: '100%', height: '90%', colorScheme: 'light' as const };

  return (
    <div style={containerStyle}>
      <iframe 
        src="https://www.youtube.com/embed/vCG3VTmijxQ?si=0BC0NOeCthnRLUIz&amp;start=12"
        title="YouTube video player" 
        frameBorder="0"
        loading="lazy"
        allowFullScreen
        allow="clipboard-write"
        style={iframeStyle}
        />
    </div>
  );
}
