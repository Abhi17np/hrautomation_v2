/**
 * One repeatable frame for every real product screenshot on the page.
 * AVIF first, WebP fallback, explicit width/height so nothing shifts.
 */
type Props = {
  name: string;
  alt: string;
  ratio: number;          // intrinsic width / height of the source crop
  sizes: string;
  priority?: boolean;
  className?: string;
  /** Fill the parent box instead of keeping the source ratio. */
  cover?: boolean;
  /** Optional tighter crop served below 768px, so detail stays legible. */
  mobileName?: string;
  mobileSizes?: string;
};

const WIDTHS = [800, 1600, 2400];
const MOBILE_WIDTHS = [600, 900, 1300];

export default function Shot({ name, alt, ratio, sizes, priority = false, className = '',
                              cover = false, mobileName, mobileSizes = '100vw' }: Props) {
  const srcset = (ext: string) =>
    WIDTHS.map(w => `/shots/${name}-${w}.${ext} ${w}w`).join(', ');
  const mobileSrcset = (ext: string) =>
    MOBILE_WIDTHS.map(w => `/shots/${mobileName}-${w}.${ext} ${w}w`).join(', ');

  return (
    <picture>
      {mobileName && (
        <source type="image/avif" media="(max-width: 767px)"
                srcSet={mobileSrcset('avif')} sizes={mobileSizes} />
      )}
      {mobileName && (
        <source type="image/webp" media="(max-width: 767px)"
                srcSet={mobileSrcset('webp')} sizes={mobileSizes} />
      )}
      <source type="image/avif" srcSet={srcset('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcset('webp')} sizes={sizes} />
      <img
        src={`/shots/${name}-1600.webp`}
        alt={alt}
        width={2400}
        height={Math.round(2400 / ratio)}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        {...(priority ? { fetchpriority: 'high' } : {})}   /* lowercase: React 18 passes it through verbatim */
        className={`block ${cover ? 'h-full w-full object-cover object-top' : 'h-auto w-full'} ${className}`}
      />
    </picture>
  );
}
