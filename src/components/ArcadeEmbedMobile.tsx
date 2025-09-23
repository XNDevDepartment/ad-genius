interface ArcadeEmbedMobileProps {
  isFullscreen?: boolean;
}

export function ArcadeEmbedMobile({ isFullscreen = false }: ArcadeEmbedMobileProps) {
  const containerStyle = isFullscreen 
    ? { width: '100%', height: '100%' }
    : { position: 'relative' as const, paddingBottom: 'calc(153.55555555555554% + 41px)', height: 0, width: '100%' };
  
  const iframeStyle = isFullscreen
    ? { width: '100%', height: '100%', colorScheme: 'light' as const }
    : { position: 'absolute' as const, top: 0, left: 0, width: '100%', height: '100%', colorScheme: 'light' as const };

  return (
    <div style={containerStyle}>
      <iframe
        src="https://demo.arcade.software/fFMkm7oqMrwPW0cwJl5w?embed&embed_mobile=inline&embed_desktop=inline&show_copy_link=true"
        title="Generate User-Generated Content Images with AI"
        frameBorder="0"
        loading="lazy"
        allowFullScreen
        allow="clipboard-write"
        style={iframeStyle}
      />
    </div>
  );
}
  