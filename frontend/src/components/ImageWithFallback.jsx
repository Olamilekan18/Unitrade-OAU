import { useEffect, useState } from 'react';

function ImageWithFallback({
  src,
  alt,
  fallbackSrc,
  wrapperClassName = '',
  wrapperStyle,
  imgClassName = '',
  imgStyle,
  ...props
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  const resolvedSrc = failed ? fallbackSrc : (src || fallbackSrc);

  return (
    <div className={`image-wrapper ${loaded ? 'loaded' : ''} ${wrapperClassName}`} style={wrapperStyle}>
      <div className="image-skeleton" />
      <img
        src={resolvedSrc}
        alt={alt}
        className={`image-main ${loaded ? 'loaded' : ''} ${imgClassName}`}
        style={imgStyle}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (!failed && fallbackSrc && src !== fallbackSrc) {
            setFailed(true);
          } else {
            setLoaded(true);
          }
        }}
        {...props}
      />
    </div>
  );
}

export default ImageWithFallback;
